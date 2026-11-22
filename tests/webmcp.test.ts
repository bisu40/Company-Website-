import assert from 'node:assert/strict';
import test from 'node:test';
import { company, products, publicPages, researchAreas, updates } from '../src/data.ts';
import { createPublicTools, registerPublicTools, type Tool } from '../src/webmcp.ts';

function tool(name: string): Tool {
  const found = createPublicTools().find(candidate => candidate.name === name);
  assert.ok(found, `Missing tool: ${name}`);
  return found;
}

function hasError(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'error' in value;
}

test('the public dataset contains the verified company and every public route', () => {
  assert.equal(company.legalName, 'Irium Labs (OPC) Private Limited');
  assert.equal(company.domain, 'https://iriumlabs.org');
  assert.equal(company.country, 'India');
  assert.equal(company.email, 'info@iriumlabs.org');
  assert.deepEqual(products, []);
  assert.deepEqual(updates, []);
  assert.equal(researchAreas.length, 4);
  assert.deepEqual(publicPages.map(page => page.path), [
    '/', '/about/', '/products/', '/research/', '/engineering/', '/updates/',
    '/contact/', '/search/', '/privacy/', '/terms/', '/cookies/', '/security/',
    '/disclosures/', '/404.html',
  ]);
});

test('the complete registered surface is explicitly read only and contains no privileged tools', async () => {
  const tools = createPublicTools();
  assert.deepEqual(tools.map(entry => entry.name), [
    'getCompanyInformation', 'listPublicProducts', 'getProductDetails',
    'getPublicResearchAreas', 'getCompanyUpdates', 'getPublicContactInformation',
    'searchPublicWebsiteContent',
  ]);
  for (const entry of tools) {
    assert.equal(entry.annotations.readOnlyHint, true);
    assert.equal(entry.inputSchema.additionalProperties, false);
    assert.doesNotMatch(entry.name, /admin|publish|draft|analytics|health|deployment/i);
  }
  assert.deepEqual(await tool('listPublicProducts').execute({}), { products: [] });
  assert.deepEqual(await tool('getCompanyUpdates').execute({}), { updates: [] });
  assert.deepEqual(await tool('getPublicContactInformation').execute({}), {
    path: '/contact/',
    channels: [{ type: 'email', value: 'info@iriumlabs.org', purpose: 'Business enquiries' }],
    message: 'For business enquiries, email info@iriumlabs.org.',
  });
  assert.ok(hasError(await tool('getProductDetails').execute({ id: 'unpublished-product' })));
});

test('the approved business email is searchable and contact results remain detached', async () => {
  const contactTool = tool('getPublicContactInformation');
  const contact = await contactTool.execute({}) as { channels: { type: string; value: string; purpose: string }[] };
  assert.deepEqual(contact.channels, [{ type: 'email', value: 'info@iriumlabs.org', purpose: 'Business enquiries' }]);
  assert.doesNotMatch(JSON.stringify(contact), /(?:security|abuse|support)@/);
  const result = await tool('searchPublicWebsiteContent').execute({ query: 'info@iriumlabs.org' }) as { results: { path: string; description: string }[] };
  assert.ok(result.results.some(page => page.path === '/contact/' && page.description.includes('info@iriumlabs.org')));
  assert.ok(contact.channels[0]);
  contact.channels[0].value = 'tampered@example.com';
  assert.notDeepEqual(await contactTool.execute({}), contact);
  assert.equal(company.email, 'info@iriumlabs.org');
});

test('all tools reject malformed objects, hidden properties and privilege-looking fields without throwing', async () => {
  let getterCalled = false;
  const getter = Object.defineProperty({}, 'query', { enumerable: true, get() { getterCalled = true; throw new Error('must not run'); } });
  const hidden = Object.defineProperty({}, 'admin', { value: true });
  const symbolic = { [Symbol('admin')]: true };
  const hostileProxy = new Proxy({}, { getPrototypeOf() { throw new Error('malformed'); } });
  const inputs: unknown[] = [
    undefined, null, [], 42, 'query', true, new Date(), Object.create(null),
    Object.create({ admin: true }), { admin: true }, hidden, symbolic, getter, hostileProxy,
    JSON.parse('{"__proto__":{"admin":true}}'),
  ];
  for (const entry of createPublicTools()) {
    for (const input of inputs) assert.ok(hasError(await entry.execute(input)), entry.name);
  }
  assert.equal(getterCalled, false);
});

test('required tool parameters and their limits are enforced by execution', async () => {
  const search = tool('searchPublicWebsiteContent');
  for (const input of [{}, { query: '' }, { query: ' \t\n' }, { query: 'x'.repeat(121) }, { query: null }, { query: 5 }, { query: 'privacy', admin: true }]) {
    assert.ok(hasError(await search.execute(input)));
  }
  assert.equal(hasError(await search.execute({ query: 'x'.repeat(120) })), false);
  assert.equal(hasError(await search.execute({ query: '😀'.repeat(120) })), false);
  assert.equal(hasError(await search.execute({ query: '😀'.repeat(121) })), true);
  const product = tool('getProductDetails');
  for (const input of [{}, { id: '' }, { id: '../private' }, { id: '<script>' }, { id: 'UPPER' }, { id: 'x'.repeat(81) }, { id: null }, { id: 'public', permissions: ['owner'] }]) {
    assert.ok(hasError(await product.execute(input)));
  }
});

test('search uses literal public data, covers real page names and bounds detached results', async () => {
  const search = tool('searchPublicWebsiteContent');
  for (const [query, path] of [['research', '/research/'], ['terms', '/terms/'], ['security', '/security/'], ['disclosures', '/disclosures/']]) {
    const result = await search.execute({ query }) as { results: { path: string; title: string; description: string }[] };
    assert.ok(result.results.some(page => page.path === path), query);
    assert.ok(result.results.every(page => publicPages.some(source => source.path === page.path)));
    assert.ok(result.results.length <= 8);
  }
  assert.deepEqual(await search.execute({ query: '<script>alert(1)</script>' }), { results: [] });
  assert.deepEqual(await search.execute({ query: '  RESEARCH  ' }), await search.execute({ query: 'research' }));
  const broad = await search.execute({ query: 'Irium' }) as { results: { title: string }[] };
  assert.ok(broad.results.length <= 8);
  assert.ok(broad.results[0]);
  broad.results[0].title = 'tampered';
  assert.notDeepEqual(await search.execute({ query: 'Irium' }), broad);
});

test('nested public tool outputs are detached from approved source data', async () => {
  const identity = await tool('getCompanyInformation').execute({}) as { legalName: string };
  identity.legalName = 'tampered';
  assert.equal(company.legalName, 'Irium Labs (OPC) Private Limited');
  const areas = await tool('getPublicResearchAreas').execute({}) as { areas: { title: string }[] };
  assert.ok(areas.areas[0]);
  areas.areas[0].title = 'tampered';
  assert.notEqual(researchAreas[0]?.title, 'tampered');
  assert.notDeepEqual(await tool('getPublicResearchAreas').execute({}), areas);
});

test('unsupported or denied registries fail closed without affecting ordinary application code', async () => {
  for (const registry of [undefined, null, {}, { modelContext: {} }, { modelContext: { registerTool: true } }]) {
    assert.equal(await registerPublicTools(registry), null);
  }
  const denied = Object.defineProperty({}, 'modelContext', { get() { throw new Error('denied'); } });
  assert.equal(await registerPublicTools(denied), null);
});

test('registration shares a cleanup signal and removes partial registrations after failure', async () => {
  const registrations: { tool: Tool; signal: AbortSignal }[] = [];
  const registry = {
    async registerTool(entry: Tool, options: { signal: AbortSignal }) {
      assert.equal(this, registry);
      registrations.push({ tool: entry, signal: options.signal });
    },
  };
  const lifecycle = await registerPublicTools({ modelContext: registry });
  assert.ok(lifecycle);
  assert.equal(registrations.length, 7);
  assert.ok(registrations.every(entry => entry.signal === lifecycle.signal && !entry.signal.aborted));
  lifecycle.abort();
  assert.ok(registrations.every(entry => entry.signal.aborted));
  const partial: AbortSignal[] = [];
  assert.equal(await registerPublicTools({ modelContext: {
    async registerTool(_entry: Tool, options: { signal: AbortSignal }) {
      partial.push(options.signal);
      if (partial.length === 3) throw new Error('permission denied');
    },
  } }), null);
  assert.equal(partial.length, 3);
  assert.ok(partial.every(signal => signal.aborted));
});

test('suspending a pending registration allows an immediate clean restore without losing tools', async () => {
  const registered = new Map<string, AbortSignal>();
  let firstRegistration = true;
  let releaseFirst!: () => void;
  const firstPending = new Promise<void>(resolve => { releaseFirst = resolve; });
  const doc = { modelContext: {
    registerTool(entry: Tool, options: { signal: AbortSignal }): Promise<void> {
      if (registered.has(entry.name)) return Promise.reject(new Error('Duplicate tool'));
      if (options.signal.aborted) return Promise.reject(new Error('Registration aborted'));
      registered.set(entry.name, options.signal);
      options.signal.addEventListener('abort', () => {
        if (registered.get(entry.name) === options.signal) registered.delete(entry.name);
      });
      if (firstRegistration) { firstRegistration = false; return firstPending; }
      return Promise.resolve();
    },
  } };
  const initialController = new AbortController();
  const initial = registerPublicTools(doc, initialController);
  assert.equal(registered.size, 1);
  initialController.abort();
  assert.equal(registered.size, 0);
  const restoredController = new AbortController();
  assert.equal(await registerPublicTools(doc, restoredController), restoredController);
  assert.equal(registered.size, 7);
  releaseFirst();
  assert.equal(await initial, null);
  assert.equal(registered.size, 7);
  assert.ok([...registered.values()].every(signal => signal === restoredController.signal));
  restoredController.abort();
  assert.equal(registered.size, 0);

  const alreadyAborted = new AbortController();
  alreadyAborted.abort();
  assert.equal(await registerPublicTools(doc, alreadyAborted), null);
  assert.equal(registered.size, 0);
});
