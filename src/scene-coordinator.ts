import type { ResearchMode, SceneController, SceneKind } from './scenes.ts';

interface SceneCandidate { id: string; top: number; bottom: number; width: number; height: number }
interface ScenePermission { enabled: boolean; visible: boolean; pageActive: boolean; nearby: boolean }

export function mayLoadScene(state: ScenePermission): boolean {
  return state.enabled && state.visible && state.pageActive && state.nearby;
}

export function isEngineeringStep(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5;
}

/** A small amount of hysteresis prevents canvas churn as adjacent sections cross. */
export function selectVisibleScene(candidates: readonly SceneCandidate[], viewportHeight: number, currentId?: string): string | undefined {
  const visible = candidates.map(candidate => ({
    id: candidate.id,
    area: Math.max(0, Math.min(candidate.bottom, viewportHeight) - Math.max(candidate.top, 0)) * Math.max(0, candidate.width),
    distance: Math.abs((candidate.top + candidate.bottom) / 2 - viewportHeight / 2),
  })).filter(candidate => Number.isFinite(candidate.area) && candidate.area > 0);
  visible.sort((a, b) => b.area - a.area || a.distance - b.distance);
  const best = visible[0];
  const current = visible.find(candidate => candidate.id === currentId);
  return current && best && current.area >= best.area * 0.78 ? current.id : best?.id;
}

const sceneKinds = new Set<SceneKind>(['hero', 'company', 'products', 'research', 'engineering', 'closing']);
const researchModes = new Set<ResearchMode>(['intelligence', 'architecture', 'security', 'tools']);
let previousCleanup: (() => void) | undefined;

/** Owns the sole live canvas; ordinary navigation and tools never depend on this enhancement. */
export function initializeScenes(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {};
  previousCleanup?.();
  const elements = [...document.querySelectorAll<HTMLElement>('[data-scene]')].filter(element => sceneKinds.has(element.dataset.scene as SceneKind));
  if (!elements.length) return () => {};
  const listeners = new AbortController();
  const failed = new Set<HTMLElement>();
  let enabled = document.documentElement.dataset.effects === 'on';
  let pageActive = true;
  let closed = false;
  let unavailable = false;
  let revision = 0;
  let frame = 0;
  let researchMode: ResearchMode = 'intelligence';
  let engineeringStep = 0;
  let modulePromise: Promise<typeof import('./scenes.ts')> | undefined;
  let active: { element: HTMLElement; controller: SceneController; id: string } | undefined;
  elements.forEach(element => { element.dataset.sceneState = 'poster'; element.removeAttribute('data-rendered'); });

  function release(): void {
    active?.controller.dispose();
    active = undefined;
  }

  function schedule(): void {
    if (!closed && !frame) frame = requestAnimationFrame(() => { frame = 0; void reconcile(); });
  }

  async function reconcile(): Promise<void> {
    const token = ++revision;
    if (closed || !enabled || !pageActive || unavailable) { release(); return; }
    if (document.hidden) { active?.controller.setRunning(false); return; }
    const candidates = elements.filter(element => !failed.has(element)).map(element => {
      const rect = element.getBoundingClientRect();
      return { id: String(elements.indexOf(element)), top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    });
    const nearby = candidates.some(candidate => candidate.width > 0 && candidate.height > 0 && candidate.top < innerHeight + 220 && candidate.bottom > -220);
    if (!mayLoadScene({ enabled, visible: !document.hidden, pageActive, nearby })) { release(); return; }
    modulePromise ??= import('./scenes.ts');
    let module: typeof import('./scenes.ts');
    try { module = await modulePromise; } catch { unavailable = true; release(); return; }
    if (token !== revision || closed || !enabled || !pageActive || document.hidden) return;
    const selected = selectVisibleScene(candidates, innerHeight, active?.id);
    if (selected === undefined) { release(); return; }
    if (active?.id === selected) { active.controller.setRunning(true); return; }
    const element = elements[Number(selected)];
    const host = element?.querySelector<HTMLElement>('[data-scene-canvas]');
    if (!element || !host) return;
    try { await module.prepareScene(element.dataset.scene as SceneKind); }
    catch {
      if (token !== revision || closed || !enabled || !pageActive) return;
      failed.add(element); release(); element.dataset.sceneState = 'fallback'; schedule(); return;
    }
    if (token !== revision || closed || !enabled || !pageActive || document.hidden) return;
    release(); // Dispose the old GPU context before another renderer can be created.
    element.dataset.sceneState = 'loading';
    const controller = module.createScene({ host, kind: element.dataset.scene as SceneKind, onFailure: () => {
      failed.add(element); unavailable = true;
      if (active?.element === element) active = undefined;
      element.dataset.sceneState = 'fallback';
    } });
    if (!controller) { failed.add(element); unavailable = true; element.dataset.sceneState = 'fallback'; return; }
    active = { element, controller, id: selected };
    controller.setResearchMode(researchMode); controller.setEngineeringStep(engineeringStep); controller.setRunning(true);
  }

  const observer = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(schedule, { rootMargin: '220px', threshold: [0, 0.25, 0.5, 0.75, 1] });
  elements.forEach(element => observer?.observe(element));
  window.addEventListener('scroll', schedule, { passive: true, signal: listeners.signal });
  window.addEventListener('resize', schedule, { passive: true, signal: listeners.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) active?.controller.setRunning(false); schedule(); }, { signal: listeners.signal });
  document.addEventListener('irium:effects', event => {
    const detail: unknown = (event as CustomEvent<unknown>).detail;
    if (typeof detail !== 'object' || detail === null || !('enabled' in detail) || typeof detail.enabled !== 'boolean') return;
    enabled = detail.enabled;
    if (enabled) { unavailable = false; failed.clear(); }
    else { revision++; release(); }
    schedule();
  }, { signal: listeners.signal });
  document.addEventListener('irium:research', event => {
    const detail: unknown = (event as CustomEvent<unknown>).detail;
    if (typeof detail !== 'object' || detail === null || !('id' in detail) || !researchModes.has(detail.id as ResearchMode)) return;
    researchMode = detail.id as ResearchMode; active?.controller.setResearchMode(researchMode);
  }, { signal: listeners.signal });
  document.addEventListener('irium:engineering', event => {
    const detail: unknown = (event as CustomEvent<unknown>).detail;
    if (typeof detail !== 'object' || detail === null || !('step' in detail) || !isEngineeringStep(detail.step)) return;
    engineeringStep = detail.step; active?.controller.setEngineeringStep(engineeringStep);
  }, { signal: listeners.signal });
  window.addEventListener('pagehide', () => { pageActive = false; revision++; if (frame) cancelAnimationFrame(frame); frame = 0; release(); }, { signal: listeners.signal });
  window.addEventListener('pageshow', event => { if (event.persisted) { pageActive = true; schedule(); } }, { signal: listeners.signal });
  const cleanup = (): void => {
    if (closed) return;
    closed = true; revision++;
    if (frame) cancelAnimationFrame(frame);
    listeners.abort(); observer?.disconnect(); release();
    if (previousCleanup === cleanup) previousCleanup = undefined;
  };
  previousCleanup = cleanup;
  schedule();
  return cleanup;
}
