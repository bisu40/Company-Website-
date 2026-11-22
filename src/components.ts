import { company, researchAreas, engineeringPrinciples, type Product } from './data.ts';

export const escapeHtml = (value: unknown): string => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
export const arrow = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.5"/></svg>';
const controlIcon = (path: string): string => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" focusable="false"><path d="${path}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const playIcon = controlIcon('M8 5 19 12 8 19Z');
export const pauseIcon = controlIcon('M8 5v14M16 5v14');
export const arrowDown = controlIcon('M12 5v14m-6-6 6 6 6-6');
export const arrowUp = controlIcon('M12 19V5m-6 6 6-6 6 6');
export const arrowRight = controlIcon('M5 12h14m-6-6 6 6-6 6');
export const searchIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
export const link = (text: string, href: string, kind = 'text-link'): string => `<a class="${kind}" href="${escapeHtml(href)}"><span>${escapeHtml(text)}</span>${/^https?:\/\//i.test(href) ? arrow : arrowRight}</a>`;

export type SceneKind = 'hero' | 'company' | 'products' | 'research' | 'engineering' | 'closing';
const posterKind = (kind: SceneKind): string => kind === 'research' || kind === 'engineering' ? 'technology' : kind === 'closing' ? 'company' : kind;
export function renderScene(kind: SceneKind, alt: string, options: { className?: string; eager?: boolean; caption?: string } = {}): string {
  const image = posterKind(kind);
  const source = (extension: string): string => [640,1280,1920,3840].map(width => `/assets/narrative/${image}-${width}.${extension} ${width}w`).join(', ');
  return `<figure class="scene scene-${kind} ${options.className ?? ''}" data-scene="${kind}" data-scene-label="${escapeHtml(alt)}">
    <picture class="scene-poster"><source type="image/avif" srcset="${source('avif')}" sizes="(max-width: 760px) 100vw, 75vw"><img src="/assets/narrative/${image}-1280.webp" srcset="${source('webp')}" sizes="(max-width: 760px) 100vw, 75vw" width="1920" height="1080" alt="${escapeHtml(alt)}" loading="${options.eager ? 'eager' : 'lazy'}" decoding="async"${options.eager ? ' fetchpriority="high"' : ''}></picture>
    <div class="scene-canvas" data-scene-canvas aria-hidden="true"></div>${options.caption ? `<figcaption>${escapeHtml(options.caption)}</figcaption>` : ''}
  </figure>`;
}

export function renderPrinciples(): string {
  return `<div class="principle-list">${engineeringPrinciples.map((principle, index) => `<details class="principle" data-scene-step="${index}"${index === 0 ? ' open' : ''}><summary><span>${escapeHtml(principle.title)}</span><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M3 10h14M10 3v14" fill="none" stroke="currentColor"/></svg></summary><p>${escapeHtml(principle.description)}</p></details>`).join('')}</div>`;
}

export function renderResearchExplorer(): string {
  return `<div class="research-explorer" data-research>
    <div class="research-interface"><div class="research-choices" role="tablist" aria-label="Explore research areas" aria-orientation="vertical">${researchAreas.map((area,index) => `<button type="button" id="tab-${area.id}" role="tab" aria-controls="research-${area.id}" aria-selected="${index === 0}" tabindex="${index === 0 ? '0' : '-1'}">${escapeHtml(area.title)}<span class="research-selection" aria-hidden="true"></span></button>`).join('')}</div>
    ${researchAreas.map((area,index) => `<section class="research-panel" role="tabpanel" id="research-${area.id}" aria-labelledby="tab-${area.id}" tabindex="0"${index ? ' hidden' : ''}><p>${escapeHtml(area.summary)}</p><span class="exploration-note">An area of exploration</span></section>`).join('')}</div>
    ${renderScene('research','A cutaway model of software pathways and control gates. An original illustration of exploration, not a claim of research results.')}
  </div>`;
}

export const productStates: Record<Product['status'],string> = { 'in-development':'In development','coming-soon':'Coming soon',available:'Available',research:'Research initiative' };
export function publicHttpsUrl(value: string | undefined): string | null {
  if (!value) return null;
  try { const url = new URL(value,company.domain); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function renderProductRecord(product: Product): string {
  const url = publicHttpsUrl(product.url);
  const image = product.image?.startsWith('/assets/') && !product.image.includes('..') ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" width="1600" height="1000" loading="lazy">` : '';
  return `<article class="product-record" data-product-status="${product.status}" id="${escapeHtml(product.id)}">${image}<div class="product-record-copy"><span class="status-tag">${productStates[product.status]}</span><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description)}</p><p class="product-platforms">${escapeHtml(product.platforms.join(' / '))}</p>${url ? link('Official product website',url) : ''}</div></article>`;
}
