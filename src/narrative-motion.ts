/** Scroll is an input, not a clock: a still page never runs an animation loop. */
export function storyProgress(top: number, height: number, viewportHeight: number): number {
  if (![top, height, viewportHeight].every(Number.isFinite) || height <= 0 || viewportHeight <= 0) return 0;
  return Math.min(1, Math.max(0, (viewportHeight - top) / (viewportHeight + height)));
}

let previousCleanup: (() => void) | undefined;

/** One opening typography gesture, followed by input-driven scene progress. */
export function initializeNarrativeMotion(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {};
  previousCleanup?.();
  const listeners = new AbortController();
  const stories = [...document.querySelectorAll<HTMLElement>('[data-story]')];
  const opening = document.querySelector<HTMLElement>('[data-narrative-copy]');
  const animations = new Set<Animation>();
  const lastProgress = new Map<HTMLElement, number>();
  let enabled = document.documentElement.dataset.effects === 'on';
  let pageActive = true;
  let closed = false;
  let openingPlayed = false;
  let frame = 0;

  function stopAnimations(): void {
    animations.forEach(animation => animation.cancel());
    animations.clear();
  }

  function enter(): void {
    if (!enabled || !pageActive || document.hidden || openingPlayed || !opening || typeof opening.animate !== 'function') return;
    const rect = opening.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight) return;
    openingPlayed = true;
    const animation = opening.animate([
      { opacity: 0.45, transform: 'translateY(12px)', clipPath: 'inset(0 0 10% 0)' },
      { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0)' },
    ], { duration: 720, easing: 'cubic-bezier(.22,1,.36,1)' });
    animations.add(animation);
    animation.onfinish = () => { animations.delete(animation); };
    animation.oncancel = () => { animations.delete(animation); };
  }

  function update(): void {
    frame = 0;
    if (closed || !enabled || !pageActive || document.hidden) return;
    enter();
    for (const story of stories) {
      const rect = story.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      const progress = storyProgress(rect.top, rect.height, innerHeight);
      const previous = lastProgress.get(story);
      if (previous === undefined || Math.abs(previous - progress) >= 0.002) {
        story.style.setProperty('--story-progress', progress.toFixed(4));
        lastProgress.set(story, progress);
      }
    }
  }

  function schedule(): void {
    if (!closed && enabled && pageActive && !document.hidden && !frame) frame = requestAnimationFrame(update);
  }

  function suspend(): void {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    stopAnimations();
  }

  document.addEventListener('irium:effects', event => {
    const detail: unknown = (event as CustomEvent<unknown>).detail;
    if (typeof detail !== 'object' || detail === null || !('enabled' in detail) || typeof detail.enabled !== 'boolean') return;
    enabled = detail.enabled;
    if (!enabled) {
      suspend();
      stories.forEach(story => story.style.removeProperty('--story-progress'));
      lastProgress.clear();
    } else schedule();
  }, { signal: listeners.signal });
  window.addEventListener('scroll', schedule, { passive: true, signal: listeners.signal });
  window.addEventListener('resize', schedule, { passive: true, signal: listeners.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); else schedule(); }, { signal: listeners.signal });
  window.addEventListener('pagehide', () => { pageActive = false; suspend(); }, { signal: listeners.signal });
  window.addEventListener('pageshow', event => { if (event.persisted) { pageActive = true; schedule(); } }, { signal: listeners.signal });
  const cleanup = (): void => {
    if (closed) return;
    closed = true;
    suspend();
    listeners.abort();
    stories.forEach(story => story.style.removeProperty('--story-progress'));
    lastProgress.clear();
    if (previousCleanup === cleanup) previousCleanup = undefined;
  };
  previousCleanup = cleanup;
  schedule();
  return cleanup;
}
