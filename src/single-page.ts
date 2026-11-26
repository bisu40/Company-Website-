import { escapeHtml as esc } from './components.ts';
import { company, engineeringPrinciples, researchAreas, type PublicPage } from './data.ts';
import { renderInlinePolicies } from './legal-content.ts';
import { organizationJson } from './pages.ts';

type PageOptions = { siteUrl: string; publicLaunch: boolean; assetVersion: string };

const work = [
  ['Applications', 'We start with the tasks people do every day. We look for steps we can remove and decisions we can make easier, then design applications around those improvements.'],
  ['Software products', 'We develop our own software from the first idea through release and continued improvement. We consider how a product will adapt as people’s needs change and how we will maintain it over time.'],
  ['Technology exploration', 'We examine what emerging technologies make possible, how they behave in practice, and where they could improve a real workflow. The work helps us decide which ideas are worth developing further.'],
] as const;

function homepage(asset: (reference: string) => string): string {
  return `
    <section class="hero" aria-labelledby="hero-title">
      <div class="shell hero-layout">
        <div class="hero-content">
          <p class="section-label">Independent software and technology research</p>
          <h1 id="hero-title">Software<br> worth using.</h1>
          <p class="hero-description">Irium Labs builds original applications and software products. We explore emerging technologies to find better ways for people to work with software.</p>
          <div class="hero-actions">
            <a class="action action-primary" href="#work">Explore our work <span aria-hidden="true">↓</span></a>
            <a class="action" href="#contact">Contact</a>
          </div>
        </div>
        <div class="hero-brand" aria-hidden="true">
          <div class="hero-emblem-frame">
            <img class="hero-emblem" src="${asset('/assets/mark.svg')}" alt="" width="397" height="388">
            <canvas class="hero-emblem-canvas" data-hero-emblem></canvas>
          </div>
        </div>
      </div>
    </section>
    <section class="shell editorial company-section" id="company" aria-labelledby="company-title">
      <div class="section-heading">
        <p class="section-label">Company</p>
        <h2 class="statement" id="company-title">Incorporated in India.<br>Built with the world in mind.</h2>
      </div>
      <div class="prose">
        <p class="lead">Irium Labs develops its own software, from choosing the problem to maintaining the product after release.</p>
        <p>We look at where familiar tools make everyday work harder than it needs to be. That might mean too many steps in a routine task, software that is difficult to learn, or a workflow spread across disconnected tools. Those are the problems we want our products to address.</p>
      </div>
      <dl class="company-record">
        <div><dt>Legal name</dt><dd>${esc(company.legalName)}</dd></div>
        <div><dt>Incorporated</dt><dd><time datetime="${esc(company.incorporationDate)}">${esc(company.incorporationDateLabel)}</time>, ${esc(company.country)}</dd></div>
        <div><dt>Corporate Identity Number</dt><dd>${esc(company.cin)}</dd></div>
      </dl>
    </section>
    <section class="shell editorial work-section" id="work" aria-labelledby="work-title">
      <div class="section-heading">
        <p class="section-label">What we do</p>
        <h2 class="statement" id="work-title">From a real problem to software people use.</h2>
      </div>
      <div class="work-list">
        ${work.map(([title, description]) => `<article class="work-row"><h3>${title}</h3><p>${description}</p></article>`).join('\n        ')}
      </div>
      <p class="release-note">We’ll share product details here when they’re ready to announce.</p>
    </section>
    <section class="shell editorial research-section" id="research" aria-labelledby="research-title">
      <div class="section-heading">
        <p class="section-label">Research interests</p>
        <h2 class="statement" id="research-title">What could software do better?</h2>
        <p class="section-copy">Our research interests span how software understands what people need, how people interact with it, and how we can make the systems underneath easier to evolve.</p>
      </div>
      <div class="research-grid">
        ${researchAreas.map(({ title, summary }) => `<article><h3>${esc(title)}</h3><p>${esc(summary)}</p></article>`).join('\n        ')}
      </div>
    </section>
    <section class="shell editorial principles" id="principles" aria-labelledby="principles-title">
      <div class="section-heading">
        <p class="section-label">Engineering principles</p>
        <h2 class="statement" id="principles-title">Quality starts with everyday decisions.</h2>
        <p class="section-copy">These principles guide how we choose what to build, design how it works, and improve it after release.</p>
      </div>
      <ul class="principles-grid">
        ${engineeringPrinciples.map(({ title, description }) => `<li><h3>${esc(title)}</h3><p>${esc(description)}</p></li>`).join('\n        ')}
      </ul>
    </section>
    <section class="shell editorial contact" id="contact" aria-labelledby="contact-title">
      <div class="section-heading">
        <p class="section-label">Contact</p>
        <h2 class="statement" id="contact-title">Get in touch with Irium Labs.</h2>
      </div>
      <div>
        <p class="section-copy">For company enquiries, questions about our work, or potential research collaborations, use our official email address.</p>
        <a class="contact-link" href="mailto:${esc(company.email)}"><span>${esc(company.email)}</span><span aria-hidden="true">↗</span></a>
      </div>
    </section>`;
}

export function renderCompanyFooter(brand: string, homePrefix = ''): string {
  return `
    <footer class="site-footer">
      <div class="shell">
        <div class="footer-main">
          <div class="footer-identity">
            <a class="footer-brand" href="/" aria-label="Irium Labs home"><img src="${brand}" alt="Irium Labs" width="340" height="64" loading="lazy"></a>
            <p>Original software, applications, and research into emerging technologies.</p>
            <a class="footer-email" href="mailto:${esc(company.email)}">${esc(company.email)}</a>
          </div>
          <nav class="footer-links" aria-label="Explore Irium Labs">
            <h2>Explore Irium Labs</h2>
            <a href="${homePrefix}#company">Company</a>
            <a href="${homePrefix}#work">What we do</a>
            <a href="${homePrefix}#research">Research interests</a>
            <a href="${homePrefix}#principles">Engineering principles</a>
          </nav>
          <section class="policies" aria-labelledby="policies-title">
            <h2 id="policies-title">Company and policies</h2>
            ${renderInlinePolicies()}
          </section>
        </div>
        <div class="footer-record">
          <p>${esc(company.legalName)} <span>(One Person Company)</span></p>
          <p>Incorporated in ${esc(company.country)} on <time datetime="${esc(company.incorporationDate)}">${esc(company.incorporationDateLabel)}</time></p>
          <p>CIN ${esc(company.cin)}</p>
        </div>
      </div>
    </footer>`;
}

export function renderSinglePage(page: PublicPage, { siteUrl, publicLaunch, assetVersion }: PageOptions): string {
  const missing = page.path === '/404.html';
  const title = missing ? page.title : 'Irium Labs | Independent technology';
  const description = missing ? 'Return to the Irium Labs homepage.' : company.description;
  const asset = (reference: string): string => esc(`${reference}?v=${assetVersion}`);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#10121a">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="${publicLaunch && !missing ? 'index,follow' : 'noindex,nofollow'}">
  <link rel="canonical" href="${esc(siteUrl + page.path)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Irium Labs">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(siteUrl + page.path)}">
  <meta property="og:image" content="${esc(siteUrl)}/assets/social.png">
  <meta property="og:image:alt" content="Irium Labs company identity">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="${asset('/assets/favicon.svg')}">
  <link rel="preload" href="${asset('/fonts/archivo-latin.woff2')}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${asset('/assets/main.css')}">
  ${missing ? '' : `<script type="module" src="${asset('/assets/visual-scenes.js')}"></script>`}
  <script type="application/ld+json">${organizationJson}</script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${missing ? '' : `<div class="site-backdrop" aria-hidden="true">
    <canvas class="circuit-background" data-circuit-background></canvas>
  </div>`}
  <header class="shell site-header">
    <a class="brand" href="/" aria-label="Irium Labs home">
      <img src="${asset('/assets/brand-horizontal.svg')}" alt="Irium Labs" width="340" height="64">
    </a>
  </header>
  <main id="main" tabindex="-1">
    ${missing ? `<section class="shell missing"><h1>Page not found.</h1><a class="action" href="/">Back to Irium Labs</a></section>` : homepage(asset)}
  </main>
  ${missing ? '' : renderCompanyFooter(asset('/assets/brand-horizontal.svg'))}
</body>
</html>`;
}
