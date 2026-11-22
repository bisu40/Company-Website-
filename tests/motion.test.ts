import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEffects, readEffects, saveEffects } from '../src/motion.ts';

test('reduced motion is the default and an explicit choice can enable effects', () => {
  assert.equal(resolveEffects(true, null), false);
  assert.equal(resolveEffects(false, null), true);
  assert.equal(resolveEffects(true, 'on'), true);
  assert.equal(resolveEffects(false, 'off'), false);
  assert.equal(resolveEffects(true, 'invalid'), false);
});
test('unavailable browser storage preserves the system preference and never breaks controls', () => {
  const blocked = { getItem(): string | null { throw new Error('blocked'); }, setItem(): void { throw new Error('blocked'); } };
  assert.equal(readEffects(true, blocked), false);
  assert.equal(readEffects(false, blocked), true);
  assert.doesNotThrow(() => saveEffects(true, blocked));
});
test('the optional motion preference stores only on or off and carries no visitor data', () => {
  const memory = new Map<string, string>();
  const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
  saveEffects(true, storage);
  assert.deepEqual([...memory], [['irium-effects', 'on']]);
  assert.equal(readEffects(true, storage), true);
  saveEffects(false, storage);
  assert.equal(readEffects(false, storage), false);
});
