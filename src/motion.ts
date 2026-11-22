type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
const preferenceKey = 'irium-effects';

export function resolveEffects(reducedMotion: boolean, preference: string | null): boolean {
  if (preference === 'on') return true;
  if (preference === 'off') return false;
  return !reducedMotion;
}

export function readEffects(reducedMotion: boolean, storage?: PreferenceStorage): boolean {
  try { return resolveEffects(reducedMotion, storage?.getItem(preferenceKey) ?? null); }
  catch { return !reducedMotion; }
}

export function saveEffects(enabled: boolean, storage?: PreferenceStorage): void {
  try { storage?.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch { /* A blocked preference store never prevents browsing. */ }
}
