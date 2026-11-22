import './style.css';
import './brand.css';
import { createPublicTools, registerPublicTools } from './webmcp.ts';
import { readEffects, saveEffects } from './motion.ts';
import { initializeScenes } from './scene-coordinator.ts';
import { playIcon, pauseIcon } from './components.ts';
import { initializeNarrativeMotion } from './narrative-motion.ts';

document.documentElement.classList.add('has-js');
const menu = document.querySelector<HTMLButtonElement>('[data-menu]');
const navigation = document.querySelector<HTMLElement>('#site-nav');
function closeMenu(restoreFocus = false): void {
  menu?.setAttribute('aria-expanded', 'false');
  navigation?.removeAttribute('data-open');
  if (restoreFocus) menu?.focus();
}
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  navigation?.toggleAttribute('data-open', open);
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') closeMenu(true); });
document.addEventListener('click', event => { if (event.target instanceof Node && !menu?.contains(event.target) && !navigation?.contains(event.target)) closeMenu(); });
navigation?.addEventListener('click', event => { if (event.target instanceof Element && event.target.closest('a')) closeMenu(); });
matchMedia('(min-width: 1001px)').addEventListener('change', () => closeMenu());

const motionButton = document.querySelector<HTMLButtonElement>('[data-motion]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let preferenceStorage: Storage | undefined;
try { preferenceStorage = window.sessionStorage; } catch { /* Optional preference storage may be unavailable. */ }
let paused = !readEffects(reducedMotion.matches, preferenceStorage);
function updateMotion(): void {
  document.documentElement.dataset.effects = paused ? 'off' : 'on';
  motionButton?.setAttribute('aria-pressed', String(!paused));
  motionButton?.setAttribute('aria-label', paused ? 'Enable visual effects' : 'Pause visual effects');
  if (motionButton) motionButton.innerHTML = `<span class="effects-indicator" aria-hidden="true"></span><span class="effects-label">${paused ? 'Enable effects' : 'Effects on'}</span><span class="pause-symbol" aria-hidden="true">${paused ? playIcon : pauseIcon}</span>`;
  document.dispatchEvent(new CustomEvent('irium:effects', { detail: { enabled: !paused } }));
}
updateMotion();
try { initializeScenes(); } catch { /* Scene posters remain available if the enhancement cannot initialize. */ }
try { initializeNarrativeMotion(); } catch { /* Editorial content remains complete without motion. */ }
motionButton?.addEventListener('click', () => { paused = !paused; saveEffects(!paused, preferenceStorage); updateMotion(); });
reducedMotion.addEventListener('change', () => { paused = !readEffects(reducedMotion.matches, preferenceStorage); updateMotion(); });

// One observer for editorial entrances; content is readable if observers are unavailable.
if ('IntersectionObserver' in window) {
  const entrances = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.setAttribute('data-visible', ''); entrances.unobserve(entry.target); }
  }, { threshold: 0.12, rootMargin: '0px 0px -25px 0px' });
  document.querySelectorAll('[data-reveal],.chapter-header,.section-heading,.chapter-content,.company-story,.split-editorial,.research-explorer,.engineering-principles,.journal-preview,.contact-details,.legal-body').forEach(region => { region.classList.add('reveal-region'); entrances.observe(region); });
}
document.addEventListener('visibilitychange', () => { document.documentElement.classList.toggle('page-hidden', document.hidden); });

document.querySelectorAll<HTMLElement>('[data-research]').forEach(explorer => {
  const tabs = [...explorer.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  function selectTab(selected: HTMLButtonElement): void {
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !active;
    });
    const id = selected.getAttribute('aria-controls')?.replace(/^research-/, '');
    if (id) document.dispatchEvent(new CustomEvent('irium:research', { detail: { id } }));
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next: HTMLButtonElement | undefined;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
      if (event.key === 'Home') next = tabs[0];
      if (event.key === 'End') next = tabs.at(-1);
      if (next) { event.preventDefault(); selectTab(next); next.focus(); }
    });
  });
});

document.querySelectorAll<HTMLDetailsElement>('details[data-scene-step]').forEach(detail => {
  function updateEngineeringScene(): void {
    if (!detail.open) return;
    const value = detail.dataset.sceneStep;
    const step = value === undefined || !value.trim() ? NaN : Number(value);
    if (Number.isInteger(step) && step >= 0 && step <= 5) document.dispatchEvent(new CustomEvent('irium:engineering', { detail: { step } }));
  }
  detail.addEventListener('toggle', updateEngineeringScene);
  updateEngineeringScene();
});

const filterButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-filter]')];
const productCards = [...document.querySelectorAll<HTMLElement>('[data-product-status]')];
filterButtons.forEach(button => button.addEventListener('click', () => {
  filterButtons.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
  let count = 0;
  productCards.forEach(card => {
    const show = button.dataset.filter === 'all' || card.dataset.productStatus === button.dataset.filter;
    card.hidden = !show;
    if (show) count++;
  });
  const empty = document.querySelector<HTMLElement>('[data-product-empty]');
  if (empty) empty.hidden = count > 0;
  const feedback = document.querySelector<HTMLElement>('[data-filter-feedback]');
  if (feedback) feedback.textContent = count ? `${count} public product${count === 1 ? '' : 's'} shown.` : 'No publicly announced products in this category.';
}));

type SearchResult = { path: string; title: string; description: string };
function isSearchResponse(value: unknown): value is { results: SearchResult[] } {
  return typeof value === 'object' && value !== null && 'results' in value && Array.isArray(value.results);
}
const searchForm = document.querySelector<HTMLFormElement>('[data-search]');
searchForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const input = searchForm.querySelector<HTMLInputElement>('input[name="query"]');
  const status = document.querySelector<HTMLElement>('[data-search-status]');
  const results = document.querySelector<HTMLUListElement>('[data-search-results]');
  if (!input || !status || !results) return;
  const search = createPublicTools().find(tool => tool.name === 'searchPublicWebsiteContent');
  if (!search) return;
  const response = await search.execute({ query: input.value });
  results.replaceChildren();
  if (!isSearchResponse(response)) { status.textContent = 'Enter between 1 and 120 characters to search.'; return; }
  status.textContent = response.results.length ? `${response.results.length} matching page${response.results.length === 1 ? '' : 's'}.` : 'No matching pages. Try “research”, “products”, or “privacy”.';
  for (const result of response.results) {
    const item = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.href = result.path;
    const title = document.createElement('h2'); title.textContent = result.title;
    const description = document.createElement('p'); description.textContent = result.description;
    anchor.append(title, description); item.append(anchor); results.append(item);
  }
});

// Late asynchronous registrations cannot survive a hidden/unloaded document.
let toolController: AbortController | null = null;
let registrationGeneration = 0;
let suspended = false;
async function startTools(): Promise<void> {
  const generation = ++registrationGeneration;
  toolController?.abort();
  const controller = new AbortController();
  toolController = controller;
  const registered = await registerPublicTools(undefined, controller);
  if (suspended || generation !== registrationGeneration) { controller.abort(); return; }
  if (!registered) { controller.abort(); toolController = null; }
}
void startTools();
addEventListener('pagehide', () => { suspended = true; registrationGeneration++; toolController?.abort(); toolController = null; });
addEventListener('pageshow', event => { suspended = false; if (event.persisted) void startTools(); });
