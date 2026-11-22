import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

type Bounds = { x: number; y: number; width: number; height: number };
type OfficialBrand = { mark: string; favicon: string; wordmark: string; horizontal: string; stacked: string; horizontalContents: string };

function officialSvg(contents: string, title: string, bounds: Bounds): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}"><title>${title}</title><desc>Official user-supplied Irium Labs artwork. Original vector paths and colors preserved.</desc>${contents}</svg>`;
}

function measuredBounds(contents: string): Bounds {
  const artwork = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1024" viewBox="0 0 1280 1024">${contents}</svg>`);
  const bounds = artwork.getBBox();
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) throw new Error('The official logo has no visible vector artwork.');
  return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
}

function padded(bounds: Bounds, padding: number): Bounds {
  return { x: bounds.x - padding, y: bounds.y - padding, width: bounds.width + 2 * padding, height: bounds.height + 2 * padding };
}

/** Preserve the supplied paths, gradients, and transforms; only crop or uniformly reposition groups. */
async function officialBrand(): Promise<OfficialBrand> {
  const source = await readFile(new URL('../public/brand-source/official-lockup.svg', import.meta.url), 'utf8');
  const allowedElements = new Set(['svg', 'title', 'desc', 'defs', 'g', 'linearGradient', 'stop', 'path']);
  const unexpectedElement = [...source.matchAll(/<(\w+)(?=[\s>])/g)].some((match) => !allowedElements.has(match[1]!));
  const externalPaint = [...source.matchAll(/url\(([^)]*)\)/g)].some((match) => !/^#[\w-]+$/.test(match[1]!));
  if (unexpectedElement || externalPaint || /<!DOCTYPE|<!ENTITY|\bon\w+\s*=|(?:href|src)\s*=/i.test(source)) {
    throw new Error('The official logo source contains unsupported or external SVG content.');
  }
  const markId = source.indexOf('id="logo-logo"');
  const wordmarkId = source.indexOf('id="text-logo"');
  if (markId < 0 || wordmarkId <= markId) throw new Error('The official logo source groups could not be located.');
  const markStart = source.lastIndexOf('<g', markId);
  const wordmarkStart = source.lastIndexOf('<g', wordmarkId);
  const emblem = source.slice(markStart, wordmarkStart);
  const lettering = source.slice(wordmarkStart, source.lastIndexOf('</svg>'));
  const emblemBounds = measuredBounds(emblem);
  const letteringBounds = measuredBounds(lettering);
  const stackedBounds = measuredBounds(emblem + lettering);
  const emblemScale = 62 / emblemBounds.height;
  const wordmarkX = 1 + emblemBounds.width * emblemScale + 16;
  const letteringScale = (339 - wordmarkX) / letteringBounds.width;
  const wordmarkY = (64 - letteringBounds.height * letteringScale) / 2;
  const horizontalContents = `<g transform="translate(1 1) scale(${emblemScale}) translate(${-emblemBounds.x} ${-emblemBounds.y})">${emblem}</g><g transform="translate(${wordmarkX} ${wordmarkY}) scale(${letteringScale}) translate(${-letteringBounds.x} ${-letteringBounds.y})">${lettering}</g>`;
  const faviconSize = Math.max(emblemBounds.width, emblemBounds.height) + 4;
  const faviconBounds = { x: emblemBounds.x + (emblemBounds.width - faviconSize) / 2, y: emblemBounds.y + (emblemBounds.height - faviconSize) / 2, width: faviconSize, height: faviconSize };
  return {
    mark: officialSvg(emblem, 'Irium Labs official emblem', padded(emblemBounds, 2)),
    favicon: officialSvg(emblem, 'Irium Labs', faviconBounds),
    wordmark: officialSvg(lettering, 'Irium Labs official wordmark', padded(letteringBounds, 0.5)),
    horizontal: officialSvg(horizontalContents, 'Irium Labs', { x: 0, y: 0, width: 340, height: 64 }),
    stacked: officialSvg(emblem + lettering, 'Irium Labs official stacked logo', padded(stackedBounds, 2)),
    horizontalContents,
  };
}

/** Outlines make social typography deterministic across renderers and sharing platforms. */
function socialTypography(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <g font-family="Manrope" font-weight="500" fill="#1f2522">
      <text x="56" y="214" font-size="62" letter-spacing="-2.5">The world doesn't</text>
      <text x="56" y="284" font-size="62" letter-spacing="-2.5">need more software.</text>
      <text x="56" y="354" font-size="62" letter-spacing="-2.5">It needs software</text>
      <text x="56" y="424" font-size="62" letter-spacing="-2.5">worth using.</text>
      <text x="1144" y="62" font-size="15" text-anchor="end" fill="#cdd2cd">Independent technology company</text>
      <text x="56" y="574" font-size="14" fill="#606f49">Irium Labs (OPC) Private Limited</text>
      <text x="912" y="530" font-size="16" fill="#fbfcfa">Independent by design.</text>
      <text x="912" y="556" font-size="16" fill="#fbfcfa">Global in ambition.</text>
      <text x="912" y="590" font-size="14" fill="#cdd2cd">iriumlabs.org</text>
    </g>
  </svg>`;
  const fontPath = fileURLToPath(new URL('./fonts/Manrope.ttf', import.meta.url));
  const outlined = new Resvg(svg, { font: { fontFiles: [fontPath], loadSystemFonts: false } }).toString();
  if (!outlined.includes('<path')) throw new Error('The Manrope source font could not be loaded for social artwork.');
  return outlined.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

function social(brand: OfficialBrand): string {
  // Reframe the supplied emblem without changing its vector paths, gradients, or colors.
  const emblem = brand.mark.replace('<svg ', '<svg x="912" y="224" ').replace(/width="[^"]+" height="[^"]+"/, 'width="232" height="232"');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <title>Irium Labs — Software worth using</title>
    <desc>The world doesn't need more software. It needs software worth using. Independent by design. Global in ambition. Official Irium Labs identity on porcelain and ink.</desc>
    <rect width="1200" height="630" fill="#f0f2ef"/>
    <path d="M0 0H1200V630H860V112H0Z" fill="#1f2522"/>
    <g transform="translate(56 28) scale(.84)">${brand.horizontalContents}</g>
    <path d="M56 530H804" stroke="#cdd2cd"/>
    <path d="M860 112H1200" stroke="#d8e145" stroke-width="4"/>
    ${emblem}${socialTypography()}
  </svg>`;
}

/** Write the official identity and narrative social artwork into the build output. */
export async function writeBrandAssets(outDir: string): Promise<void> {
  const assetDir = join(outDir, 'assets');
  await mkdir(assetDir, { recursive: true });
  const brand = await officialBrand();
  const socialSvg = social(brand);
  const rendered = new Resvg(socialSvg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: false } });
  await Promise.all([
    writeFile(join(assetDir, 'mark.svg'), brand.mark),
    writeFile(join(assetDir, 'wordmark.svg'), brand.wordmark),
    writeFile(join(assetDir, 'favicon.svg'), brand.favicon),
    writeFile(join(assetDir, 'brand-horizontal.svg'), brand.horizontal),
    writeFile(join(assetDir, 'brand-stacked.svg'), brand.stacked),
    writeFile(join(assetDir, 'social.svg'), socialSvg),
    writeFile(join(assetDir, 'social.png'), rendered.render().asPng()),
  ]);
}
