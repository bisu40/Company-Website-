import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPage } from '../src/pages.ts';
import { company, engineeringPrinciples, products, publicPages, researchAreas, updates } from '../src/data.ts';

test('all corporate pages are independently readable and carry accessible navigation', () => {
  for (const page of publicPages) {
    const path = page.path;
    const html = renderPage(page);
    assert.match(html, /<!doctype html>/i, path + ' must be rendered');
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, path);
    assert.match(html, /Skip to content/, path);
    assert.match(html, /<main id="main"/, path);
    assert.match(html, /aria-controls="site-nav"/, path);
    assert.match(html, /application\/ld\+json/, path);
    assert.doesNotMatch(html, /<script[^>]*src="https?:/i, path);
    assert.match(html, /noindex/);
  }
});

test('only the approved business email is offered and product launches and news are not invented', () => {
  const product = renderPage(publicPages.find(page => page.path === '/products/')!);
  const news = renderPage(publicPages.find(page => page.path === '/updates/')!);
  const contact = renderPage(publicPages.find(page => page.path === '/contact/')!);
  assert.match(product, /Further announcements to follow/);
  assert.match(news, /No updates published yet/);
  assert.match(contact, /href="mailto:info@iriumlabs\.org"/);
  assert.doesNotMatch(contact, /<form|tel:|security@/);
});

test('the approved narrative replaces the old slogans and does not create public products', () => {
  const home = renderPage(publicPages.find(page => page.path === '/')!);
  for (const statement of ["The world doesn't need more software. It needs software worth using.", 'We build what we believe should exist.', 'From the first question to the finished product.', 'Start with the problem. Question everything else.', 'Not every important idea has an obvious shape at first.', 'The company is young.']) {
    assert.ok(home.includes(statement), statement);
  }
  assert.doesNotMatch(home, /Built from<br>our own ideas|Room to think|The next idea|starts a conversation/);
  const product = renderPage(publicPages.find(page => page.path === '/products/')!);
  assert.equal(products.length, 0);
  assert.equal(updates.length, 0);
  assert.doesNotMatch(product, /data-filter=|class="product-record"|href="https:\/\/product/);
});

test('the four approved exploration topics and six principles preserve their accessible interactions', () => {
  const research = renderPage(publicPages.find(page => page.path === '/research/')!);
  assert.equal(researchAreas.length, 4);
  for (const area of researchAreas) {
    assert.ok(research.includes(`id="tab-${area.id}" role="tab" aria-controls="research-${area.id}"`));
    assert.ok(research.includes(`role="tabpanel" id="research-${area.id}" aria-labelledby="tab-${area.id}"`));
  }
  const principles = renderPage(publicPages.find(page => page.path === '/engineering/')!);
  assert.equal(engineeringPrinciples.length, 6);
  assert.equal((principles.match(/data-scene-step="[0-5]"/g) ?? []).length, 6);
});

test('only approved public incorporation facts enter the company dataset and page footers', () => {
  assert.deepEqual(Object.keys(company).sort(), ['cin','country','description','domain','email','incorporationDate','incorporationDateLabel','legalName','name'].sort());
  for (const page of publicPages) {
    const html = renderPage(page);
    assert.ok(html.includes('U62010DL2026OPC467844'));
    assert.ok(html.includes('26 June 2026'));
    assert.ok(html.includes('(One Person Company)'));
    assert.doesNotMatch(html, /Certificate\.pdf|irium-labs-company-disclosures\.md|irium-labs-website-copy\.md/);
  }
});
