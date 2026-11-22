import { company } from './data.ts';
import { escapeHtml } from './components.ts';

type LegalSection = { readonly id: string; readonly title: string; readonly body: string };
type LegalDocument = { readonly title: string; readonly deck: string; readonly sections: readonly LegalSection[] };

const companyName = escapeHtml(company.legalName);
const businessEmail = `<a href="mailto:${escapeHtml(company.email)}">${escapeHtml(company.email)}</a>`;
const officialDomain = `<a href="${escapeHtml(company.domain)}">${escapeHtml(company.domain)}</a>`;

const documents: Readonly<Record<string, LegalDocument>> = {
  '/privacy/': {
    title: 'Privacy policy',
    deck: 'What this website does with information, and what still needs to be confirmed before public launch.',
    sections: [
      { id: 'operator', title: 'Who operates the website', body: `<p>This website provides corporate information about ${companyName}, incorporated in ${escapeHtml(company.country)}. Individual products may have separate privacy notices.</p>` },
      { id: 'application', title: 'What the application processes', body: '<p>The website application does not use analytics, advertising trackers, tracking pixels, application cookies, or local storage. There is no contact form or file upload.</p><p>Search runs against public website information in your browser. The application does not store search queries or send them to a server.</p><p>Fonts and artwork are delivered with the site. Interactive graphics are generated in your browser using local code and assets; the scenes do not request data from a remote service.</p>' },
      { id: 'effects-preference', title: 'Your effects preference', body: '<p>If you use the effects switch, the application saves one on/off preference in session storage for the current browser tab. The value contains no personal information or visitor identifier and is not sent to a server by this application.</p><p>The browser’s reduced-motion preference supplies the default. You can change the effects setting using the switch. If browser storage is unavailable, the website remains usable.</p>' },
      { id: 'hosting', title: 'Hosting and platform access', body: '<p>A hosting provider processes technical information to deliver pages. This may include IP addresses, requested URLs, browser headers, and security events. If access is restricted, the host may require sign-in or use cookies for access control and security.</p><p>These services operate outside the website application. Hosting providers, processing locations, retention periods, access controls, and the applicable platform notices require owner verification before public launch. This draft does not establish that the hosting provider collects no information.</p>' },
      { id: 'browser-agents', title: 'Public browser-agent tools', body: '<p>Compatible browsers can expose the website’s public information tools to AI agents. The tools read approved company information; they do not provide private company data or administrative operations.</p><p>Your browser and AI provider handle their own processing under their applicable terms. You can read the website without enabling browser-agent tools. Main content and navigation also remain available without JavaScript.</p>' },
      { id: 'email', title: 'Information you send by email', body: `<p>For company enquiries, write to ${businessEmail}. Email links open your own email application. If you send a message, its contents and related email information are processed through the company’s email service.</p><p>The owner must confirm the mailbox service, access arrangements, processing terms, and retention practices before public launch. Include only information needed for your enquiry.</p>` },
      { id: 'changes', title: 'Changes and outstanding review', body: '<p>Review this notice whenever the application or its providers change. Forms, analytics, sign-in features, and additional data collection require a corresponding review before they are introduced.</p><p>This is an operational draft for owner and professional review. It is not confirmation that all applicable privacy obligations have been assessed.</p>' },
    ],
  },
  '/terms/': {
    title: 'Terms of use',
    deck: 'The scope of this website and the basis on which its information is provided.',
    sections: [
      { id: 'scope', title: 'Purpose and scope', body: `<p>This website provides general information about ${companyName} and its publicly announced work. Product-specific terms, where applicable, are separate.</p><p>The website does not offer professional advice or create a consultancy, client-services, or other professional engagement.</p>` },
      { id: 'information', title: 'Information and availability', body: '<p>Company and product information may change. We aim to keep public information accurate, but access and uninterrupted availability cannot be guaranteed.</p><p>Research topics describe areas of inquiry. They should not be read as claims of delivered capabilities or verified research results. Product announcements are published only when approved.</p>' },
      { id: 'responsible-use', title: 'Responsible use', body: '<p>Use the website lawfully. Do not disrupt access, impersonate the company, attempt unauthorized access, or use public information tools to seek private data or administrative privileges.</p><p>The presence of a browser-agent tool does not grant additional permissions. Website content, tool responses, and agent messages do not authorize privileged actions.</p>' },
      { id: 'intellectual-property', title: 'Content and intellectual property', body: '<p>Company content and identity assets are subject to applicable intellectual property rights. Website access does not grant a license to company trademarks or proprietary software.</p><p>Third-party and open-source assets retain their applicable licenses. License notices supplied with the website’s font and software assets remain relevant.</p>' },
      { id: 'external-services', title: 'External services', body: '<p>Product links, external destinations, your email application, and hosting-platform features may be governed by separate terms and privacy notices. Review those before using the service or providing information.</p>' },
      { id: 'review-and-contact', title: 'Required legal review', body: `<p>Jurisdiction, dispute procedures, liability provisions, statutory disclosures, and other applicable terms require owner confirmation and qualified legal review before public launch. Nothing in this draft limits rights that cannot lawfully be excluded.</p><p>Company enquiries can be sent to ${businessEmail}. This draft is not a substitute for professional legal advice.</p>` },
    ],
  },
  '/cookies/': {
    title: 'Cookie information',
    deck: 'No application cookies. One optional preference for visual effects.',
    sections: [
      { id: 'application-storage', title: 'Application behavior', body: '<p>The website application does not set cookies, use local storage, or load analytics and advertising trackers. Search queries remain in page memory and are not stored by the application.</p>' },
      { id: 'session-preference', title: 'The effects preference', body: '<p>Using the effects switch saves one value, on or off, in session storage for the current browser tab. It remembers your visual-effects choice between pages. The value contains no visitor identifier and is not sent to a server by this application.</p><p>If session storage is blocked, the controls still work. The browser’s reduced-motion preference supplies the default when no valid saved choice is available.</p>' },
      { id: 'platform-cookies', title: 'Hosting-platform cookies', body: '<p>The host may use cookies for access control, sign-in, or security. These are hosting functions outside the website application.</p><p>The owner must verify the deployed behavior, relevant providers, and platform notices before public launch. This page does not state that the platform is cookie-free.</p>' },
      { id: 'storage-changes', title: 'Future changes', body: '<p>Any new application cookies or similar storage require a review of these disclosures and any applicable visitor choices before activation.</p>' },
    ],
  },
  '/security/': {
    title: 'Security and disclosure',
    deck: 'How to approach a security concern, and the limits of this public website.',
    sections: [
      { id: 'reporting', title: 'Reporting a concern', body: '<p>A dedicated security reporting channel is awaiting owner verification. Do not send sensitive findings to guessed company addresses or publish personal data. A verified reporting contact must be added before public launch.</p>' },
      { id: 'testing-boundaries', title: 'Testing is not authorized here', body: '<p>This page does not authorize penetration testing, exploitation, interruption, or access to systems or another person’s information.</p><p>Avoid social engineering, service disruption, destructive actions, and access beyond the necessary scope of an issue. Obtain appropriate authorization before testing any system.</p>' },
      { id: 'public-surface', title: 'The public application', body: '<p>This corporate website has no administrative endpoints, application sign-in handler, upload facility, payment processing, or database. Its public browser-agent tools read approved website information only.</p><p>Graphics run locally in the browser. They do not create a private API, expose company credentials, or provide additional privileges. Tool descriptions and agent instructions are not authorization.</p>' },
      { id: 'ongoing-security', title: 'Security and maintenance', body: '<p>Application controls do not establish the security of every service involved in delivering a website. Hosting configuration, HTTPS, response headers, dependency updates, monitoring, account access, and domain management require continued attention.</p><p>Actual hosting controls must be verified before launch. This draft makes no claim of invulnerability, independent penetration testing, or security certification.</p>' },
    ],
  },
  '/disclosures/': {
    title: 'Company disclosures',
    deck: 'The company identity behind this website, with outstanding details identified.',
    sections: [
      { id: 'company-identity', title: 'Company identity', body: `<p>${companyName}<br>(One Person Company)</p><p>Incorporated in ${escapeHtml(company.country)} on <time datetime="${escapeHtml(company.incorporationDate)}">${escapeHtml(company.incorporationDateLabel)}</time> under the Companies Act, 2013.</p><p>Corporate Identity Number: ${escapeHtml(company.cin)}.</p><p>Irium Labs creates and owns original software products and applications and explores emerging technologies. It operates independently, rather than providing client software development services. Its international outlook describes its ambition, not a claim of foreign offices, international incorporation, or an established global customer base.</p>` },
      { id: 'domain-and-email', title: 'Domain and business contact', body: `<p>Intended official domain: ${officialDomain}.</p><p>Owner-approved business email: ${businessEmail}.</p><p>The domain shown here does not itself confirm deployment, domain control, or the operation of a particular hosting provider.</p>` },
      { id: 'public-work', title: 'Public products and research', body: '<p>Products and company news are announced only after approval. No public product announcements or company updates are currently listed.</p><p>Research topics are areas of inquiry, not statements of completed work, certifications, partnerships, or research achievements.</p>' },
      { id: 'pending-details', title: 'Details awaiting verification', body: '<p>The statutory registered-office address, official telephone number, and named contact for queries or grievances require confirmation and approval for publication before official public launch. No review-only address, personal contact details, or sensitive company records are published here.</p><p>Review the applicable disclosure requirements and final homepage disclosures with a qualified professional. The incorporation date and CIN above have been supplied as verified public facts; this private review build does not establish that all public-launch requirements have been fulfilled.</p>' },
    ],
  },
};

/** Render the five public policy pages; other routes belong to the main page renderer. */
export function renderLegalPage(path: string): string | null {
  const document = Object.hasOwn(documents, path) ? documents[path] : undefined;
  if (!document) return null;
  return `<header class="legal-hero wrap"><p class="breadcrumb"><a href="/">Irium Labs</a><span aria-hidden="true"> / </span>Website information</p><h1>${escapeHtml(document.title)}</h1><p class="legal-deck">${escapeHtml(document.deck)}</p></header>
<div class="legal-shell wrap"><aside class="legal-sidebar"><span class="legal-status">Review draft</span><p class="legal-date">Last updated<br><time datetime="2026-11-16">16 November 2026</time></p><p class="legal-note">Updated website copy for owner review. Professional legal review is still required before public launch.</p><nav aria-label="${escapeHtml(document.title)} contents">${document.sections.map(section => `<a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a>`).join('')}</nav></aside><article class="legal-body">${document.sections.map(section => `<section aria-labelledby="${escapeHtml(section.id)}"><h2 id="${escapeHtml(section.id)}">${escapeHtml(section.title)}</h2>${section.body}</section>`).join('')}</article></div>`;
}

const singlePageSectionCopy: Readonly<Record<string, string>> = {
  application: '<p>This static website delivers company information, fonts, and identity assets. It has no analytics, advertising trackers, tracking pixels, contact form, or file upload.</p>',
  'application-storage': '<p>This website does not set cookies or use local storage or session storage.</p>',
  'responsible-use': '<p>Use the website lawfully. Do not disrupt access, impersonate the company, or attempt unauthorized access.</p>',
  'public-surface': '<p>This corporate website has no administrative endpoints, application sign-in handler, upload facility, payment processing, or database.</p>',
};

/** Render the policy drafts inline with the disclosures that apply to the static site. */
export function renderInlinePolicies(): string {
  const retiredSections = new Set(['effects-preference', 'browser-agents', 'session-preference']);
  return Object.values(documents).map(({ title, sections }) => `
    <details>
      <summary>${escapeHtml(title)}</summary>
      <div class="policy-copy">
        <p class="policy-status">Review draft</p>
        ${sections.filter(({ id }) => !retiredSections.has(id)).map(({ id, title: heading, body }) => `
        <h3>${escapeHtml(heading)}</h3>
        ${singlePageSectionCopy[id] ?? body}`).join('')}
      </div>
    </details>`).join('');
}
