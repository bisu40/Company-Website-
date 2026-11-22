import { createHash } from "node:crypto";

interface HeaderOptions {
  publicLaunch?: boolean;
  https?: boolean;
}

/** Browser controls shared by the static host configuration and local preview. */
export function getSecurityHeaders(jsonLd?: string, options: HeaderOptions = {}): Record<string, string> {
  const jsonLdHash = jsonLd ? ` 'sha256-${createHash("sha256").update(jsonLd).digest("base64")}'` : "";
  const policy = [
    "default-src 'none'",
    `script-src 'self'${jsonLdHash}`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "media-src 'self'",
    "manifest-src 'self'",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com https://chat.openai.com https://*.openai.com https://*.chatgpt.site https://*.oaistatic.com",
  ];
  if (options.https !== false) policy.push("upgrade-insecure-requests");
  const headers: Record<string, string> = {
    "Content-Security-Policy": policy.join("; "),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  if (options.https !== false) headers["Strict-Transport-Security"] = "max-age=31536000";
  if (!options.publicLaunch) headers["X-Robots-Tag"] = "noindex, nofollow";
  return headers;
}
