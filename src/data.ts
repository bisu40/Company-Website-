/** This entire module is public. Add factual records only after owner approval. */
export const company = Object.freeze({
  name: 'Irium Labs',
  legalName: 'Irium Labs (OPC) Private Limited',
  country: 'India',
  cin: 'U62010DL2026OPC467844',
  incorporationDate: '2026-06-26',
  incorporationDateLabel: '26 June 2026',
  domain: 'https://iriumlabs.org',
  email: 'info@iriumlabs.org',
  description: 'Irium Labs is an independent technology company incorporated in India. We create original software products and applications and explore emerging technologies with an international vision.',
});

export const officialPhone = Object.freeze({
  display: '+91 87966 30606',
  href: 'tel:+918796630606',
});

export type Product = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: 'in-development' | 'coming-soon' | 'available' | 'research';
  readonly platforms: readonly string[];
  readonly url?: string;
  readonly image?: string;
};

// Unannounced products and private roadmap information must never enter this module.
export const products: readonly Product[] = Object.freeze([]);

export type CompanyUpdate = {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly summary: string;
  readonly url?: string;
};

export const updates: readonly CompanyUpdate[] = Object.freeze([]);

export type ResearchArea = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
};

export const researchAreas: readonly ResearchArea[] = Object.freeze([
  Object.freeze({
    id: 'intelligence',
    title: 'Intelligent systems',
    summary: 'Exploring how advances in artificial intelligence and machine-assisted computing can make software more useful and responsive to human needs.',
  }),
  Object.freeze({
    id: 'architecture',
    title: 'Human–computer interaction',
    summary: 'Examining new ways people can communicate with, navigate, and control digital systems.',
  }),
  Object.freeze({
    id: 'security',
    title: 'Software engineering',
    summary: 'Considering architectures and development practices that support reliable, adaptable, and maintainable applications.',
  }),
  Object.freeze({
    id: 'tools',
    title: 'Emerging technologies',
    summary: 'Staying open to technological developments that create opportunities for entirely new categories of software.',
  }),
]);

export const engineeringPrinciples: readonly { readonly title: string; readonly description: string }[] = Object.freeze([
  Object.freeze({ title: "Respect the user's time", description: 'Technology should reduce unnecessary effort, not create more of it.' }),
  Object.freeze({ title: 'Make difficult things understandable', description: 'Complex systems can be powerful without being confusing.' }),
  Object.freeze({ title: 'Take security and privacy seriously', description: 'Trust should be considered while designing a product, not added as an afterthought.' }),
  Object.freeze({ title: 'Keep improving the fundamentals', description: "A product's responsiveness, stability, accessibility, and usability are part of its quality." }),
  Object.freeze({ title: 'Stay independent in thought', description: 'Good ideas deserve examination regardless of whether they follow the prevailing trend.' }),
  Object.freeze({ title: 'Build for more than a launch', description: 'A lasting product requires attention beyond its first release.' }),
]);

export type PublicPage = {
  readonly path: string;
  readonly title: string;
  readonly description: string;
};

export const publicPages: readonly PublicPage[] = Object.freeze([
  Object.freeze({ path: '/', title: 'Irium Labs — Independent technology', description: 'Original software, applications and emerging technology. An independent company incorporated in India, global in ambition.' }),
  Object.freeze({ path: '/about/', title: 'About Irium Labs', description: 'Irium Labs (OPC) Private Limited develops its own software products. An independent company incorporated in India, with a global audience in mind.' }),
  Object.freeze({ path: '/products/', title: 'Products — Irium Labs', description: 'Our software products and applications. No products have been publicly announced; verified details will appear here when approved.' }),
  Object.freeze({ path: '/research/', title: 'Technology and research — Irium Labs', description: 'Curiosity is part of the work. Exploring intelligent systems, human–computer interaction, software engineering and emerging technologies.' }),
  Object.freeze({ path: '/engineering/', title: 'Our principles — Irium Labs', description: 'Good software is the result of deliberate choices. Time, clarity, security, quality, independent thought and continued improvement.' }),
  Object.freeze({ path: '/updates/', title: 'Company updates — Irium Labs', description: 'Official company news and product announcements. No updates have been published yet.' }),
  Object.freeze({ path: '/contact/', title: 'Contact — Irium Labs', description: 'For business enquiries, contact Irium Labs at info@iriumlabs.org. Company identity and official contact information.' }),
  Object.freeze({ path: '/search/', title: 'Search Irium Labs', description: 'Find company information, public products, research questions, engineering principles, and website policies. Search runs in your browser.' }),
  Object.freeze({ path: '/privacy/', title: 'Privacy policy — Irium Labs', description: 'What this website stores, what hosting providers may process, and how public browser-agent tools work. No analytics or advertising trackers.' }),
  Object.freeze({ path: '/terms/', title: 'Terms of use — Irium Labs', description: 'The scope of this website, responsible use, intellectual property, and external links. Draft terms require professional review before public launch.' }),
  Object.freeze({ path: '/cookies/', title: 'Cookie policy — Irium Labs', description: 'No application cookies or local storage. The optional effects switch saves one on/off preference in session storage for the current tab.' }),
  Object.freeze({ path: '/security/', title: 'Security and vulnerability disclosure — Irium Labs', description: 'Information about reporting a security concern and the limits of this public website. A dedicated reporting channel awaits owner verification.' }),
  Object.freeze({ path: '/disclosures/', title: 'Company disclosures — Irium Labs', description: 'Irium Labs (OPC) Private Limited. Incorporated in India on 26 June 2026. CIN U62010DL2026OPC467844. Public company identity and business contact.' }),
  Object.freeze({ path: '/404.html', title: 'Page not found — Irium Labs', description: 'This address does not match a public page. Browse the Irium Labs website or search for the information you need.' }),
]);
