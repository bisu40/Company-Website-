import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { writeBrandAssets } from '../scripts/brand-assets.ts';

test('social artwork uses the approved narrative, original identity and portable outlined typography', async () => {
  const temporaryRoot = path.resolve(tmpdir());
  const output = await mkdtemp(path.join(temporaryRoot, 'irium-brand-review-'));
  try {
    await writeBrandAssets(output);
    const assets = path.join(output, 'assets');
    assert.deepEqual((await readdir(assets)).sort(), [
      'brand-horizontal.svg', 'brand-stacked.svg', 'favicon.svg', 'mark.svg', 'social.png', 'social.svg', 'wordmark.svg',
    ]);
    const social = await readFile(path.join(assets, 'social.svg'), 'utf8');
    assert.match(social, /The world doesn't need more software\. It needs software worth using\./);
    assert.match(social, /width="1200" height="630"/);
    for (const color of ['#f0f2ef', '#1f2522', '#606f49', '#d8e145']) assert.ok(social.includes(color), color);
    assert.doesNotMatch(social, /<text\b|<script\b|<image\b|(?:href|src)\s*=|\bon\w+\s*=|metallic|trefoil|Independent minds/i);
    const png = await readFile(path.join(assets, 'social.png'));
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);

    const source = await readFile(new URL('../public/brand-source/official-lockup.svg', import.meta.url), 'utf8');
    const stacked = await readFile(path.join(assets, 'brand-stacked.svg'), 'utf8');
    const paths = [...source.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map(match => match[1]!);
    assert.ok(paths.length > 0, 'The original official vector paths must be examined');
    for (const drawing of paths) {
      assert.ok(stacked.includes(`d="${drawing}"`), 'The stacked official artwork changed an original path');
      assert.ok(social.includes(`d="${drawing}"`), 'The social artwork changed an original path');
    }
  } finally {
    const relative = path.relative(temporaryRoot, output);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    await rm(output, { recursive: true, force: true });
  }
});
