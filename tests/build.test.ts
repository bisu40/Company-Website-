import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { request, type IncomingHttpHeaders, type Server } from "node:http";
import { readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const outputRoot = path.join(projectRoot, "dist");
const privateSentinel = "PRIVATE_BUILD_SENTINEL_8b72db";
let preview: Server;
let port: number;

function runBuild(environment: Record<string, string> = {}) {
  return spawnSync(process.execPath, ["--import", "tsx", "scripts/build.ts"], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, SITE_URL: "", SITE_PUBLIC: "", PRIVATE_DEPLOYMENT_TOKEN: privateSentinel, ...environment },
    timeout: 30_000,
  });
}

async function filesBelow(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(filename) : [filename];
  }));
  return files.flat();
}

function getResponse(requestPath: string, method = "GET", host = "127.0.0.1") {
  return new Promise<{ status: number; headers: IncomingHttpHeaders; body: Buffer }>((resolve, reject) => {
    const outgoing = request({ hostname: "127.0.0.1", port, path: requestPath, method, headers: { Host: host } }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks) }));
      response.on("error", reject);
    });
    outgoing.setTimeout(5_000, () => outgoing.destroy(new Error("Preview response timed out")));
    outgoing.on("error", reject);
    outgoing.end();
  });
}

before(async () => {
  const result = runBuild();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const { createPreviewServer } = await import("../scripts/serve.ts");
  preview = createPreviewServer();
  await new Promise<void>((resolve) => preview.listen(0, "127.0.0.1", resolve));
  const address = preview.address();
  assert.ok(address && typeof address !== "string");
  port = address.port;
});

after(async () => {
  if (preview) await new Promise<void>((resolve, reject) => preview.close((error) => error ? reject(error) : resolve()));
});

test("build emits complete static pages without private files or environment values", async () => {
  const files = await filesBelow(outputRoot);
  const pages = files.filter((filename) => filename.endsWith(".html"));
  assert.deepEqual(
    pages.map(filename => path.relative(outputRoot, filename).split(path.sep).join('/')).sort(),
    ['404.html', 'aegis/privacy/index.html', 'index.html']
  );
  for (const filename of files) {
    const relative = path.relative(outputRoot, filename);
    assert.doesNotMatch(relative, /(?:^|[\\/])(?:\.env|\.git|node_modules|src|scripts|tests)(?:[.\\/]|$)|\.(?:ts|map)$/i);
    if (/\.(?:html|js|css|json|xml|txt)$/.test(filename) || path.basename(filename) === "_headers") {
      assert.ok(!(await readFile(filename, "utf8")).includes(privateSentinel), `${relative} leaked a private environment value`);
    }
  }
  for (const filename of pages) {
    const html = await readFile(filename, "utf8");
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /name="description"\s+content="[^"]+"/);
    assert.match(html, /rel="canonical"\s+href="https:\/\/iriumlabs\.org\//);
    assert.match(html, /noindex/);
  }
  assert.ok(files.includes(path.join(outputRoot, "assets", "main.css")));
  assert.ok(files.includes(path.join(outputRoot, "fonts", "manrope-latin.woff2")));
  assert.match(await readFile(path.join(outputRoot, "fonts", "OFL.txt"), "utf8"), /SIL OPEN FONT LICENSE/);
  assert.match(await readFile(path.join(outputRoot, "fonts", "Archivo-OFL.txt"), "utf8"), /SIL OPEN FONT LICENSE/);
});

test("the homepage ships its own animated backdrop and retains static content and navigation", async () => {
  const files = await filesBelow(outputRoot);
  for (const filename of files) {
    const relative = path.relative(outputRoot, filename).split(path.sep).join('/');
    if (relative !== 'assets/visual-scenes.js') {
      assert.doesNotMatch(relative, /\.(?:js|mjs|avif|webp|glb|gltf|blend)$|^assets\/(?:chunks|visuals|narrative)\//i);
    }
  }
  const html = (await getResponse("/")).body.toString();
  const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1];
  assert.ok(header?.includes('aria-label="Irium Labs home"'));
  assert.doesNotMatch(header ?? "", /<nav\b|href="#(?:company|work|contact)"/i);
  assert.ok(html.includes('id="company"'));
  for (const section of ["work", "contact"]) {
    assert.ok(html.includes(`href="#${section}"`));
    assert.ok(html.includes(`id="${section}"`));
  }
  assert.match(html, /href="mailto:info@iriumlabs\.org"/);
  assert.match(html, /<canvas\b[^>]*data-circuit-background/);
  assert.match(html, /<canvas\b[^>]*data-hero-emblem/);
  assert.doesNotMatch(html, /class="motion-control"|data-visual-motion|Play motion|Pause motion/);
  assert.match(html, /class="hero-emblem"[^>]*src="\/assets\/mark\.svg\?v=/);
  assert.doesNotMatch(html, /class="(?:hero-wordmark|hero-platform)"/);
  assert.doesNotMatch(html, /irium-depth-(?:valley|foreground)/);
  const scripts = [...html.matchAll(/<script\b[^>]*src="(\/assets\/visual-scenes\.js\?v=[a-f0-9]{16})"/g)];
  assert.equal(scripts.length, 1);
  for (const [, script] of scripts) {
    const animation = await getResponse(script!);
    assert.equal(animation.status, 200);
    assert.match(animation.headers["content-type"] ?? "", /^text\/javascript/);
  }
  const missing = (await getResponse("/404.html")).body.toString();
  assert.doesNotMatch(missing, /data-circuit-background|data-hero-emblem|visual-scenes\.js/);
  assert.equal([...html.matchAll(/<details>/g)].length, 5);
});

test("every generated HTML asset resolves to a local output file", async () => {
  const pages = (await filesBelow(outputRoot)).filter(filename => filename.endsWith('.html'));
  let checked = 0;
  for (const filename of pages) {
    const html = await readFile(filename, 'utf8');
    for (const [tag] of html.matchAll(/<(?:script|img|source|link)\b[^>]*>/gi)) {
      if (/\brel="canonical"/i.test(tag)) continue;
      for (const [, attribute, rawValue] of tag.matchAll(/\b(src|href|srcset)="([^\"]*)"/g)) {
        const candidates = attribute === 'srcset' ? rawValue!.split(',').map(candidate => candidate.trim().split(/\s+/)[0]!) : [rawValue!];
        for (const candidate of candidates) {
          if (candidate.startsWith('data:image/')) continue;
          const url = new URL(candidate.replace(/&amp;/g, '&'), 'https://local.invalid');
          assert.equal(url.origin, 'https://local.invalid', `${filename} loads a remote asset: ${candidate}`);
          const asset = path.resolve(outputRoot, '.' + decodeURIComponent(url.pathname));
          assert.ok(asset.startsWith(outputRoot + path.sep), `Asset escaped output root: ${candidate}`);
          assert.ok((await stat(asset)).isFile(), `${filename} references a missing asset: ${candidate}`);
          checked++;
        }
      }
    }
  }
  assert.ok(checked >= 9, 'Homepage and fallback assets must be examined');
});

test("the official logo and social image are served with their browser MIME types", async () => {
  for (const [route, mime] of [['/assets/brand-horizontal.svg', 'image/svg+xml'], ['/assets/social.png', 'image/png']] as const) {
    const response = await getResponse(route);
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-type'], mime);
    assert.equal(response.body.byteLength, (await stat(path.join(outputRoot, route))).size);
  }
});

test("private review robots and sitemap keep unpublished pages out of indexing", async () => {
  const robots = await readFile(path.join(outputRoot, "robots.txt"), "utf8");
  const sitemap = await readFile(path.join(outputRoot, "sitemap.xml"), "utf8");
  assert.match(robots, /Disallow: \/\s/);
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]), [
    "https://iriumlabs.org/",
    "https://iriumlabs.org/aegis/privacy",
  ]);
});

test("every page and its CSS dependencies share one content version", async () => {
  const home = await readFile(path.join(outputRoot, "index.html"), "utf8");
  const version = home.match(/href="\/assets\/main\.css\?v=([a-f0-9]{16})"/)?.[1];
  assert.ok(version, "The stylesheet must have a content version so cached old styles cannot accompany new HTML");
  const files = await filesBelow(outputRoot);
  for (const filename of files.filter((file) => file.endsWith(".html"))) {
    const html = await readFile(filename, "utf8");
    const assetReferences = [...html.matchAll(/\b(?:src|href)="(\/(?:assets|fonts)\/[^\"]+)"/g)];
    assert.ok(assetReferences.length > 0);
    for (const [, reference] of assetReferences) {
      assert.ok(reference?.endsWith(`?v=${version}`), `${path.relative(outputRoot, filename)} contains a stale or inconsistent asset URL: ${reference}`);
    }
    for (const [, sourceSet] of html.matchAll(/\bsrcset="([^\"]+)"/g)) {
      for (const candidate of sourceSet!.split(',')) {
        const reference = candidate.trim().split(/\s+/)[0];
        if (reference?.startsWith('/assets/') || reference?.startsWith('/fonts/')) {
          assert.ok(reference.endsWith(`?v=${version}`), `${path.relative(outputRoot, filename)} contains a stale responsive image: ${reference}`);
        }
      }
    }
    assert.ok(html.includes(`/assets/main.css?v=${version}`));
  }
  const css = await readFile(path.join(outputRoot, "assets", "main.css"), "utf8");
  assert.ok(css.includes(`/fonts/manrope-latin.woff2?v=${version}`));
  for (const [, reference] of css.matchAll(/url\(["']?(\/(?:assets|fonts)\/[^"'()\s]+)["']?\)/g)) {
    assert.ok(reference?.includes(`v=${version}`), `CSS contains a stale asset reference: ${reference}`);
  }
  const font = await getResponse(`/fonts/manrope-latin.woff2?v=${version}`);
  assert.equal(font.status, 200);
  const stylesheet = await getResponse(`/assets/main.css?v=${version}`);
  assert.equal(stylesheet.status, 200);
});

test("identical output assets retain their version across clean builds and private environment changes", async () => {
  const priorHome = await readFile(path.join(outputRoot, "index.html"), "utf8");
  const priorVersion = priorHome.match(/href="\/assets\/main\.css\?v=([a-f0-9]{16})"/)?.[1];
  assert.ok(priorVersion);
  const result = runBuild({ PRIVATE_DEPLOYMENT_TOKEN: "A_DIFFERENT_PRIVATE_VALUE" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const rebuiltHome = await readFile(path.join(outputRoot, "index.html"), "utf8");
  assert.equal(rebuiltHome.match(/href="\/assets\/main\.css\?v=([a-f0-9]{16})"/)?.[1], priorVersion);
});

test("the homepage and fallback are served with their actual HTTP status", async () => {
  for (const [route, status] of [["/", 200], ["/aegis/privacy/", 200], ["/404.html", 404], ["/about/", 404]] as const) {
    const response = await getResponse(route);
    assert.equal(response.status, status, route);
    assert.match(response.headers["content-type"] ?? "", /^text\/html/);
  }
  const aegisPrivacy = (await getResponse("/aegis/privacy/")).body.toString();
  assert.match(aegisPrivacy, /io\.aegis\.vault/);
  assert.match(aegisPrivacy, /RevenueCat/);
  assert.match(aegisPrivacy, /Google Play Billing/);
  assert.doesNotMatch(aegisPrivacy, /visual-scenes\.js/);
  const missing = await getResponse("/there-is-no-such-page/");
  assert.equal(missing.status, 404);
  assert.match(missing.headers["content-type"] ?? "", /^text\/html/);
  assert.match(missing.body.toString(), /href="\/">Back to Irium Labs<\/a>/);
});

test("preview supplies MIME types, an empty HEAD body, and safe relative redirects", async () => {
  const page = await getResponse("/");
  const head = await getResponse("/", "HEAD");
  assert.equal(head.status, 200);
  assert.equal(head.body.byteLength, 0);
  assert.equal(Number(head.headers["content-length"]), page.body.byteLength);
  for (const [route, mime] of [["/assets/main.css", "text/css"], ["/sitemap.xml", "application/xml"], ["/robots.txt", "text/plain"]]) {
    const response = await getResponse(route!);
    assert.equal(response.status, 200, route);
    assert.ok(response.headers["content-type"]?.startsWith(mime!), route);
  }
  const redirect = await getResponse("/fonts?from=review", "GET", "untrusted.example");
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.location, "/fonts/?from=review");
});

test("preview rejects write methods, traversal, malformed paths, and private sources", async () => {
  const post = await getResponse("/", "POST");
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, "GET, HEAD");
  for (const route of ["/../package.json", "/%2e%2e/package.json", "/assets%2f..%2fpackage.json", "/%5c..%5c.env", "/%00", "/%zz", "//untrusted.example/"]) {
    const response = await getResponse(route);
    assert.ok([400, 403, 404].includes(response.status), `${route} returned ${response.status}`);
    assert.doesNotMatch(response.body.toString(), /devDependencies|PRIVATE_BUILD_SENTINEL/);
  }
  for (const route of ["/.env", "/.git/config", "/src/data.ts", "/scripts/build.ts", "/package.json", "/assets/main.js.map", "/_headers"]) {
    const response = await getResponse(route);
    assert.equal(response.status, 404, route);
  }
  for (const route of ["/about.", "/about%20", "/assets/main.js:private", "/CON.txt"]) {
    assert.equal((await getResponse(route)).status, 400, route);
  }
});

test("security policy authorizes the rendered JSON-LD without permitting inline scripts", async () => {
  const response = await getResponse("/");
  const html = response.body.toString();
  const jsonLd = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(jsonLd);
  const hash = createHash("sha256").update(jsonLd).digest("base64");
  const csp = response.headers["content-security-policy"];
  assert.ok(typeof csp === "string");
  assert.ok(csp.includes(`'sha256-${hash}'`));
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /frame-ancestors[^;]+https:\/\/chatgpt\.com/);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.match(String(response.headers["x-robots-tag"] ?? ""), /noindex/);
  assert.equal(response.headers["access-control-allow-origin"], undefined);
});

test("invalid canonical origins are rejected before output is changed", async () => {
  const priorHome = await readFile(path.join(outputRoot, "index.html"), "utf8");
  for (const url of ["javascript:alert(1)", "http://iriumlabs.org", "https://user:private@iriumlabs.org", "https://iriumlabs.org/private?token=secret"]) {
    const result = runBuild({ SITE_URL: url });
    assert.notEqual(result.status, 0, url);
    assert.doesNotMatch(result.stderr, /user:private|token=secret/);
  }
  assert.equal(await readFile(path.join(outputRoot, "index.html"), "utf8"), priorHome);
});

test("unapproved public documents and media fail before the previous artifact is changed", async () => {
  const priorHome = await readFile(path.join(outputRoot, "index.html"), "utf8");
  const priorFiles = (await filesBelow(outputRoot)).sort();
  for (const basename of ["unapproved-review-fixture.pdf", "unapproved-review-fixture.png", "unapproved-review-fixture.md", ".unapproved-review-fixture.env"]) {
    const fixture = path.join(projectRoot, "public", basename);
    let created = false;
    try {
      await writeFile(fixture, privateSentinel, { flag: "wx" });
      created = true;
      const result = runBuild();
      assert.notEqual(result.status, 0, "An unapproved public file must stop packaging");
      assert.match(result.stderr, /unapproved public file/i);
      assert.ok(!result.stderr.includes(privateSentinel));
      assert.equal(await readFile(path.join(outputRoot, "index.html"), "utf8"), priorHome);
      assert.deepEqual((await filesBelow(outputRoot)).sort(), priorFiles);
      assert.ok(!(await filesBelow(outputRoot)).some(file => path.basename(file) === basename));
    } finally {
      if (created) await unlink(fixture);
    }
  }
});

test("authoring references and artwork metadata remain outside the static artifact", async () => {
  const files = await filesBelow(outputRoot);
  const relative = files.map(filename => path.relative(outputRoot, filename).split(path.sep).join('/'));
  assert.ok(!relative.some(filename => filename.startsWith('brand-source/')));
  assert.ok(!relative.includes('assets/visuals/manifest.json'));
  assert.ok(!relative.some(filename => /\.(?:pdf|blend|md)$/i.test(filename)));
});

test("public disclosures include only the verified incorporation facts", async () => {
  const html = await readFile(path.join(outputRoot, 'index.html'), 'utf8');
  assert.match(html, /U62010DL2026OPC467844/);
  assert.match(html, /datetime="2026-06-26"/);
  assert.match(html, /26 June 2026/);
  assert.match(html, /\(One Person Company\)/);
  assert.doesNotMatch(html, /(?:PAN|TAN)\s*(?:number|:)|Certificate\.pdf|company identification number[^<]*require owner confirmation/i);
  assert.doesNotMatch(html, /datetime="undefined"|Corporate Identity Number: undefined/);
});

test("public indexing requires an explicit launch flag and uses the validated origin", async () => {
  try {
    const result = runBuild({ SITE_PUBLIC: "true", SITE_URL: "https://launch.example/" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const home = await readFile(path.join(outputRoot, "index.html"), "utf8");
    const robots = await readFile(path.join(outputRoot, "robots.txt"), "utf8");
    assert.match(home, /rel="canonical"\s+href="https:\/\/launch\.example\//);
    assert.doesNotMatch(home, /name="robots"[^>]*noindex/);
    assert.match(robots, /Allow: \/\s/);
    assert.match(robots, /Sitemap: https:\/\/launch\.example\/sitemap\.xml/);
  } finally {
    const restored = runBuild();
    assert.equal(restored.status, 0, restored.stderr || restored.stdout);
  }
});
