import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicHttpsUrl, renderProductRecord, renderScene } from '../src/components.ts';
import { publicPages } from '../src/data.ts';
import { renderPage } from '../src/pages.ts';

test('public product destinations reject executable protocols, malformed URLs and embedded credentials', () => {
  assert.equal(publicHttpsUrl('https://product.example/releases?platform=web#download'), 'https://product.example/releases?platform=web#download');
  assert.equal(publicHttpsUrl('/products/'), 'https://iriumlabs.org/products/');
  for (const value of [undefined, '', 'javascript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///private', 'http://product.example/', 'ftp://product.example/', 'https://user:password@product.example/', 'https://%75ser@product.example/', 'https://%']) {
    assert.equal(publicHttpsUrl(value), null, String(value));
  }
});

test('product records escape text and attributes without exposing unsafe destinations or traversal images', () => {
  const html = renderProductRecord({
    id: 'test" onmouseover="alert(1)', name: '<script>alert("product")</script>',
    description: '<img src=x onerror=alert(1)> & private?', status: 'available', platforms: ['Web & desktop'],
    url: 'javascript:alert(1)', image: '/assets/../../private.png',
  });
  assert.ok(html.includes('&lt;script&gt;alert(&quot;product&quot;)&lt;/script&gt;'));
  assert.ok(html.includes('Web &amp; desktop'));
  assert.doesNotMatch(html, /<script>|<img src=x|\sonmouseover="|href="javascript:/);
  assert.doesNotMatch(html, /<img /);
});

test('scene descriptions and captions remain text even when they contain markup-like characters', () => {
  const html = renderScene('hero', 'A "study" <svg onload=alert(1)> & reflections', { caption: '<b>Original study</b>' });
  assert.ok(html.includes('alt="A &quot;study&quot; &lt;svg onload=alert(1)&gt; &amp; reflections"'));
  assert.ok(html.includes('<figcaption>&lt;b&gt;Original study&lt;/b&gt;</figcaption>'));
  assert.doesNotMatch(html, /<svg onload=|<b>Original/);
});

test('rendered responsive images, scripts, styles and fonts share the supplied safe cache version', () => {
  const home = publicPages.find(page => page.path === '/');
  assert.ok(home);
  const version = '0123456789abcdef';
  const html = renderPage(home, { assetVersion: version });
  const references = [...html.matchAll(/\b(?:src|href)="(\/(?:assets|fonts)\/[^\"]+)"/g)].map(match => match[1]!);
  const sourceSets = [...html.matchAll(/\bsrcset="([^\"]+)"/g)];
  assert.ok(sourceSets.length > 0, 'Responsive poster candidates must be tested, not only the img fallback');
  for (const [, candidates] of sourceSets) {
    for (const candidate of candidates!.split(',')) references.push(candidate.trim().split(/\s+/)[0]!);
  }
  for (const reference of references) assert.ok(reference.endsWith(`?v=${version}`), reference);
  const rejected = renderPage(home, { assetVersion: '" onload="alert(1)' });
  assert.doesNotMatch(rejected, /\sonload="alert|\?v=/);
});

test('page metadata escapes hostile copy before placing it inside title and attribute contexts', () => {
  const html = renderPage({ path: '/', title: '<script>alert("metadata")</script>', description: '"><img src=x onerror=alert(1)> & text' });
  assert.ok(html.includes('<title>&lt;script&gt;alert(&quot;metadata&quot;)&lt;/script&gt;</title>'));
  assert.ok(html.includes('content="&quot;&gt;&lt;img src=x onerror=alert(1)&gt; &amp; text"'));
  assert.doesNotMatch(html, /<script>alert\("metadata"\)|<img src=x/);
});
