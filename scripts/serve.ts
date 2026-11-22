import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { organizationJson } from "../src/pages.ts";
import { getSecurityHeaders } from "../src/security.ts";

const outputRoot = fileURLToPath(new URL("../dist", import.meta.url));
const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf",
  ".pdf": "application/pdf", ".webm": "video/webm", ".mp4": "video/mp4",
};
const privateSegments = new Set(["src", "scripts", "tests", "node_modules", "docs", "package.json", "package-lock.json", "tsconfig.json", "_headers"]);

function insideRoot(filename: string, root: string): boolean {
  return filename === root || filename.startsWith(`${root}${path.sep}`);
}

function plainResponse(response: ServerResponse, method: string | undefined, status: number, body: string): void {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store" });
  response.end(method === "HEAD" ? undefined : body);
}

async function existingFile(filename: string, root: string): Promise<string | undefined> {
  try {
    const info = await lstat(filename);
    if (!info.isFile() || info.isSymbolicLink()) return;
    const resolved = await realpath(filename);
    return insideRoot(resolved, root) ? resolved : undefined;
  } catch (error) {
    if (error instanceof Error && "code" in error && ["ENOENT", "ENOTDIR", "EACCES"].includes(String(error.code))) return;
    throw error;
  }
}

async function serveRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  for (const [name, value] of Object.entries(getSecurityHeaders(organizationJson, { https: false }))) response.setHeader(name, value);
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    plainResponse(response, request.method, 405, "Method not allowed.\n");
    return;
  }
  const target = request.url ?? "/";
  if (target.length > 4096) { plainResponse(response, request.method, 414, "Request target too long.\n"); return; }
  const queryStart = target.indexOf("?");
  const rawPath = queryStart === -1 ? target : target.slice(0, queryStart);
  const query = queryStart === -1 ? "" : target.slice(queryStart);
  let pathname: string;
  try { pathname = decodeURIComponent(rawPath); } catch { plainResponse(response, request.method, 400, "Invalid request path.\n"); return; }
  if (!pathname.startsWith("/") || pathname.startsWith("//") || /[\\:\u0000-\u001f\u007f?#]/.test(pathname) || /%2f|%5c/i.test(rawPath)) {
    plainResponse(response, request.method, 400, "Invalid request path.\n"); return;
  }
  const segments = pathname.split("/").filter(Boolean);
  // Windows aliases, device names, and alternate data streams must never become files.
  if (segments.some((segment) => /[. ]$/.test(segment) && segment !== "." && segment !== ".." || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment))) {
    plainResponse(response, request.method, 400, "Invalid request path.\n"); return;
  }
  if (segments.some((segment) => segment === "." || segment === "..")) {
    plainResponse(response, request.method, 403, "Forbidden.\n"); return;
  }
  if (segments.some((segment) => segment.startsWith(".") || privateSegments.has(segment.toLowerCase()))) {
    plainResponse(response, request.method, 404, "Not found.\n"); return;
  }
  const rootInfo = await lstat(outputRoot);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("Invalid preview directory.");
  const root = await realpath(outputRoot);
  let candidate = path.join(root, ...segments);
  if (!insideRoot(candidate, root)) { plainResponse(response, request.method, 403, "Forbidden.\n"); return; }
  try {
    const info = await lstat(candidate);
    if (info.isDirectory() && !info.isSymbolicLink()) {
      if (!pathname.endsWith("/")) {
        response.writeHead(308, { Location: `${encodeURI(pathname)}/${query}`, "Content-Length": "0", "Cache-Control": "no-store" });
        response.end(); return;
      }
      candidate = path.join(candidate, "index.html");
    }
  } catch (error) {
    if (!(error instanceof Error && "code" in error && ["ENOENT", "ENOTDIR"].includes(String(error.code)))) throw error;
  }
  const extension = path.extname(candidate).toLowerCase();
  const filename = mimeTypes[extension] ? await existingFile(candidate, root) : undefined;
  const status = filename && pathname !== "/404.html" ? 200 : 404;
  const selected = filename ?? await existingFile(path.join(root, "404.html"), root);
  if (!selected) { plainResponse(response, request.method, 404, "Not found.\n"); return; }
  const body = await readFile(selected);
  response.writeHead(status, {
    "Content-Type": mimeTypes[path.extname(selected).toLowerCase()] ?? "application/octet-stream",
    "Content-Length": body.byteLength,
    "Cache-Control": path.extname(selected) === ".html" ? "no-cache" : "public, max-age=3600",
  });
  response.end(request.method === "HEAD" ? undefined : body);
}

/** Read-only local artifact preview. No authentication, forms, or administrative endpoints exist. */
export function createPreviewServer(): Server {
  const server = createServer((request, response) => {
    serveRequest(request, response).catch(() => {
      if (response.headersSent) response.destroy();
      else plainResponse(response, request.method, 500, "Preview unavailable. Build the site before starting the preview.\n");
    });
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  return server;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  createPreviewServer().listen(4173, "127.0.0.1", () => console.log("Irium Labs private preview: http://127.0.0.1:4173"));
}
