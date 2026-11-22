import { company, engineeringPrinciples, products, publicPages, researchAreas, updates } from './data.ts';

export type Tool = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly annotations: { readonly readOnlyHint: true };
  readonly execute: (input: unknown) => Promise<unknown>;
};

type Fields = Readonly<Record<string, unknown>>;
const invalidInput = () => ({ error: 'Invalid input. Use the fields and limits declared in this tool schema.' });

/** Read data descriptors once, without invoking accessors on malformed JS inputs. */
function readFields(input: unknown, allowed: readonly string[]): Fields | null {
  try {
    if (typeof input !== 'object' || input === null || Array.isArray(input) || Object.getPrototypeOf(input) !== Object.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const fields: Record<string, unknown> = {};
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string' || !allowed.includes(key)) return null;
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
      fields[key] = descriptor.value;
    }
    return fields;
  } catch {
    return null;
  }
}

function defineTool(
  name: string,
  description: string,
  inputSchema: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
  validate: (input: Fields) => boolean,
  read: (input: Fields) => unknown,
): Tool {
  return {
    name,
    description,
    inputSchema,
    annotations: { readOnlyHint: true },
    async execute(input) {
      const fields = readFields(input, allowed);
      if (fields === null) return invalidInput();
      try {
        if (!validate(fields)) return invalidInput();
        return structuredClone(read(fields));
      } catch {
        return invalidInput();
      }
    },
  };
}

function reader(name: string, description: string, read: () => unknown): Tool {
  return defineTool(name, description, { type: 'object', properties: {}, additionalProperties: false }, [], () => true, read);
}

function validQuery(value: unknown): value is string {
  // JSON Schema maxLength counts Unicode code points, not UTF-16 code units.
  return typeof value === 'string' && value.length <= 240 && value.trim().length > 0 && [...value].length <= 120;
}

/** Tools only read this approved public dataset; there is no privileged execution path. */
export function createPublicTools(): Tool[] {
  const additionalText: Readonly<Record<string, string>> = {
    '/about/': Object.values(company).join(' '),
    '/products/': products.map(product => `${product.name} ${product.description} ${product.status} ${product.platforms.join(' ')}`).join(' '),
    '/research/': researchAreas.map(area => `${area.title} ${area.summary}`).join(' '),
    '/engineering/': engineeringPrinciples.map(principle => `${principle.title} ${principle.description}`).join(' '),
    '/updates/': updates.map(update => `${update.title} ${update.summary}`).join(' '),
  };
  const searchIndex = publicPages.map(page => ({
    page,
    text: `${page.title} ${page.description} ${additionalText[page.path] ?? ''}`.toLocaleLowerCase('en'),
  }));
  return [
    reader('getCompanyInformation', 'Read the verified public identity and description of Irium Labs.', () => company),
    reader('listPublicProducts', 'List approved public product announcements. An empty list means no products have been publicly announced.', () => ({ products })),
    defineTool(
      'getProductDetails',
      'Read an approved public product by its public identifier.',
      { type: 'object', properties: { id: { type: 'string', minLength: 1, maxLength: 80, pattern: '^[a-z0-9-]+$' } }, required: ['id'], additionalProperties: false },
      ['id'],
      input => typeof input.id === 'string' && /^[a-z0-9-]{1,80}$/.test(input.id),
      input => products.find(product => product.id === input.id) ?? { error: 'No published product matches this identifier.' },
    ),
    reader('getPublicResearchAreas', 'Read the publicly described areas of exploration, without implying verified research achievements.', () => ({ areas: researchAreas })),
    reader('getCompanyUpdates', 'Read published company news and announcements.', () => ({ updates })),
    reader('getPublicContactInformation', 'Read public contact availability and the contact page location.', () => ({
      path: '/contact/',
      channels: [{ type: 'email', value: company.email, purpose: 'Business enquiries' }],
      message: `For business enquiries, email ${company.email}.`,
    })),
    defineTool(
      'searchPublicWebsiteContent',
      'Find relevant public website pages by literal search text.',
      { type: 'object', properties: { query: { type: 'string', minLength: 1, maxLength: 120, pattern: '\\S', description: 'Words or a phrase to find in the public website.' } }, required: ['query'], additionalProperties: false },
      ['query'],
      input => validQuery(input.query),
      input => {
        const query = (input.query as string).trim().toLocaleLowerCase('en');
        return { results: searchIndex.filter(entry => entry.text.includes(query)).slice(0, 8).map(entry => entry.page) };
      },
    ),
  ];
}

function objectLike(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

/** Progressive enhancement: an unsupported or denied API never blocks the normal UI. */
export async function registerPublicTools(
  doc: unknown = typeof document === 'undefined' ? undefined : document,
  controller = new AbortController(),
): Promise<AbortController | null> {
  try {
    if (controller.signal.aborted) return null;
    if (!objectLike(doc)) return null;
    const registry: unknown = Reflect.get(doc, 'modelContext');
    if (!objectLike(registry)) return null;
    const register: unknown = Reflect.get(registry, 'registerTool');
    if (typeof register !== 'function') return null;
    for (const tool of createPublicTools()) {
      if (controller.signal.aborted) return null;
      await Reflect.apply(register, registry, [tool, { signal: controller.signal }]);
      if (controller.signal.aborted) return null;
    }
    return controller;
  } catch {
    controller.abort();
    return null;
  }
}
