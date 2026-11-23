import { resolveEffects } from './motion.ts';

export const visualMotionEvent = 'irium-visual-motion';

export function visualMotionPlaying(): boolean {
  return document.documentElement.dataset.visualMotion === 'playing';
}

export function initializeVisualMotion(button: HTMLButtonElement): void {
  const system = matchMedia('(prefers-reduced-motion: reduce)');
  let choice: 'on' | 'off' | null = null;

  function update() {
    const playing = resolveEffects(system.matches, choice);
    document.documentElement.dataset.visualMotion = playing ? 'playing' : 'paused';
    button.textContent = playing ? 'Pause motion' : 'Play motion';
    document.dispatchEvent(new Event(visualMotionEvent));
  }

  button.addEventListener('click', () => {
    choice = visualMotionPlaying() ? 'off' : 'on';
    update();
  });
  system.addEventListener('change', () => {
    choice = null;
    update();
  });
  update();
}
