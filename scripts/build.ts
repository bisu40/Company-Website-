import { build } from "esbuild";
import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { company, publicPages } from "../src/data.ts";
import { organizationJson } from "../src/pages.ts";
import { renderSinglePage } from "../src/single-page.ts";
import { getSecurityHeaders } from "../src/security.ts";
import { writeBrandAssets } from "./brand-assets.ts";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const outputRoot = path.join(projectRoot, "dist");
const publicRoot = path.join(projectRoot, "public");
// A new public file requires an explicit code review; an extension alone is not publication approval.
const approvedAssetPaths = new Set([
  "assets/irium-depth-valley.jpg", "assets/irium-depth-foreground.png",
  "fonts/archivo-latin.woff2", "fonts/manrope-latin.woff2",
  "fonts/OFL.txt", "fonts/Archivo-OFL.txt",
]);
const sourceOnlyPublicPaths = new Set([
  "assets/irium-circuit-valley.jpg", "assets/irium-circuit-foreground.png",
  "assets/irium-print.jpg", "assets/irium-signal.jpg",
  "no-js.css", "brand-source/official-lockup.svg", "brand-source/PROVENANCE.md", "assets/visuals/manifest.json",
]);
for (const scene of ["hero", "company", "research", "engineering", "closing"]) {
  for (const width of [640, 1280, 1920, 3840]) for (const extension of ["avif", "webp"]) {
    sourceOnlyPublicPaths.add(`assets/visuals/${scene}-${width}.${extension}`);
  }
}
for (const scene of ["hero", "company", "products", "technology"]) {
  for (const width of [640, 1280, 1920, 3840]) for (const extension of ["avif", "webp"]) {
    sourceOnlyPublicPaths.add(`assets/narrative/${scene}-${width}.${extension}`);
  }
}
type PublicAsset = { readonly source: string; readonly relative: string };

function validatedSiteUrl(candidate: string): string {
  let url: URL;
  try { url = new URL(candidate); } catch { throw new Error("SITE_URL must be a valid HTTPS origin, or a local HTTP origin for development."); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SITE_URL must be an HTTPS origin without credentials, a path, a query, or a fragment. HTTP is allowed only for localhost.");
  }
  return url.origin;
}

/** Never recursively remove a computed or symlinked directory outside this project's dist. */
async function resetOutput(): Promise<void> {
  const realProject = await realpath(projectRoot);
  const expected = path.join(realProject, "dist");
  if (path.resolve(outputRoot) !== path.resolve(expected) || path.dirname(expected) !== realProject) {
    throw new Error("Refusing to clean an output path outside this project.");
  }
  try {
    const info = await lstat(outputRoot);
    if (info.isSymbolicLink() || !info.isDirectory() || await realpath(outputRoot) !== expected) {
      throw new Error("Refusing to clean a linked or unexpected output directory.");
    }
    await rm(expected, { recursive: true, force: true });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  await mkdir(expected, { recursive: true });
}

/** Validate the entire inventory before the previous build is reset, without echoing private filenames. */
async function collectApprovedPublicAssets(directory = publicRoot, relative = ""): Promise<PublicAsset[]> {
  let entries;
  try {
    const info = await lstat(directory);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error("Public assets must be regular directories without links.");
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (directory === publicRoot && error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  const assets: PublicAsset[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw new Error("Symbolic links are not allowed in public assets.");
    const source = path.join(directory, entry.name);
    const destination = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      assets.push(...await collectApprovedPublicAssets(source, destination));
    } else if (entry.isFile()) {
      const approvedPath = destination.split(path.sep).join("/");
      if (sourceOnlyPublicPaths.has(approvedPath)) continue;
      if (!approvedAssetPaths.has(approvedPath)) throw new Error("Unapproved public file. Only explicitly approved website assets may be packaged.");
      assets.push({ source, relative: destination });
    } else {
      throw new Error("Public assets must be regular files without links.");
    }
  }
  return assets;
}

/** Copy only the inventory that passed publication-path validation. */
async function copyPublicAssets(assets: readonly PublicAsset[]): Promise<void> {
  for (const asset of assets) {
    const info = await lstat(asset.source);
    if (info.isSymbolicLink() || !info.isFile()) throw new Error("Public assets must be regular files without links.");
    const output = path.join(outputRoot, asset.relative);
    await mkdir(path.dirname(output), { recursive: true });
    await copyFile(asset.source, output);
  }
}

async function outputAssetFiles(directory: string): Promise<string[]> {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  const files: string[] = [];
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Generated assets must not contain symbolic links.");
    if (entry.isDirectory()) files.push(...await outputAssetFiles(filename));
    else if (entry.isFile()) files.push(filename);
  }
  return files;
}

/** Hash the fresh, unversioned output so identical assets keep the same cache key. */
async function outputAssetVersion(): Promise<string> {
  const files = [
    ...await outputAssetFiles(path.join(outputRoot, "assets")),
    ...await outputAssetFiles(path.join(outputRoot, "fonts")),
  ].sort();
  const hash = createHash("sha256");
  for (const filename of files) {
    const relative = path.relative(outputRoot, filename).split(path.sep).join("/");
    const content = await readFile(filename);
    hash.update(`${relative}\0${content.byteLength}\0`).update(content);
  }
  return hash.digest("hex").slice(0, 16);
}

function versionCssAssets(css: string, version: string): string {
  return css.replace(/(url\(\s*)(["']?)(\/(?:assets|fonts)\/[^"'()\s]+)\2(\s*\))/g, (_match, opening: string, quote: string, reference: string, closing: string) => {
    const url = new URL(reference, "https://build.invalid");
    url.searchParams.set("v", version);
    return `${opening}${quote}${url.pathname}${url.search}${url.hash}${quote}${closing}`;
  });
}

export async function buildSite(): Promise<void> {
  // Validate everything that can reject configuration before touching the previous artifact.
  const siteUrl = validatedSiteUrl(process.env.SITE_URL?.trim() || company.domain);
  const publicLaunch = process.env.SITE_PUBLIC === "true";
  const home = publicPages.find((page) => page.path === "/");
  const missing = publicPages.find((page) => page.path === "/404.html");
  if (!home || !missing) throw new Error("The homepage and 404 metadata are required.");
  const publicAssets = await collectApprovedPublicAssets();
  await resetOutput();
  await copyPublicAssets(publicAssets);
  await writeBrandAssets(outputRoot);
  const cssPath = path.join(outputRoot, "assets", "main.css");
  await build({
    absWorkingDir: projectRoot,
    entryPoints: ["src/single-page.css"],
    outfile: cssPath,
    bundle: true,
    external: ["/fonts/*"],
    minify: true,
    legalComments: "none",
    logLevel: "warning",
  });
  const assetVersion = await outputAssetVersion();
  await writeFile(cssPath, versionCssAssets(await readFile(cssPath, "utf8"), assetVersion), "utf8");
  const pageOptions = { siteUrl, publicLaunch, assetVersion };
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}/</loc></url>\n</urlset>\n`;
  const robots = publicLaunch ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n` : "User-agent: *\nDisallow: /\n";
  const headers = getSecurityHeaders(organizationJson, { publicLaunch, https: siteUrl.startsWith("https:") });
  const headerFile = `/*\n${Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`).join("\n")}\n  Cache-Control: public, max-age=0, must-revalidate\n\n/assets/*\n  Cache-Control: public, max-age=3600\n\n/fonts/*\n  Cache-Control: public, max-age=86400\n\n/404.html\n  X-Robots-Tag: noindex, nofollow\n`;
  await Promise.all([
    writeFile(path.join(outputRoot, "index.html"), renderSinglePage(home, pageOptions), "utf8"),
    writeFile(path.join(outputRoot, "404.html"), renderSinglePage(missing, pageOptions), "utf8"),
    writeFile(path.join(outputRoot, "sitemap.xml"), sitemap, "utf8"),
    writeFile(path.join(outputRoot, "robots.txt"), robots, "utf8"),
    writeFile(path.join(outputRoot, "_headers"), headerFile, "utf8"),
  ]);
  console.log(`Built the single-page site and 404 fallback in dist (${publicLaunch ? "public indexing enabled" : "private review; indexing disabled"}).`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  buildSite().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Build failed.");
    process.exitCode = 1;
  });
}
