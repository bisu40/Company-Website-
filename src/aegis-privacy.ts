import { escapeHtml as esc } from './components.ts';
import { company } from './data.ts';
import { organizationJson } from './pages.ts';

type PageOptions = { siteUrl: string; publicLaunch: boolean; assetVersion: string };

type PolicySection = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
};

export const AEGIS_PRIVACY_PATH = '/aegis/privacy';
export const AEGIS_PRIVACY_EFFECTIVE_DATE = '2026-11-27';
export const AEGIS_PRIVACY_EFFECTIVE_LABEL = '27 November 2026';

const mail = `<a href="mailto:${esc(company.email)}">${esc(company.email)}</a>`;
const siteLink = `<a href="${esc(company.domain)}">${esc(company.domain)}</a>`;

export const aegisPrivacySections: readonly PolicySection[] = Object.freeze([
  {
    id: 'identity',
    title: '1. Company and Application Identity',
    body: `
      <p>This Privacy Policy explains how <strong>${esc(company.legalName)}</strong> (incorporated in ${esc(company.country)}, Corporate Identity Number <code>${esc(company.cin)}</code>, website ${siteLink}) handles information in connection with the mobile application <strong>Aegis</strong> (Android package identifier: <code>io.aegis.vault</code>).</p>
      <p>References to &ldquo;Irium Labs,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo; refer to ${esc(company.legalName)}. For any privacy questions or requests, contact us at ${mail}.</p>
    `,
  },
  {
    id: 'summary',
    title: '2. Summary of Data Collection and Processing',
    body: `
      <p>Aegis is designed as an on-device encrypted vault. <strong>We do not operate cloud storage for your vault files, we do not require you to create an Irium Labs account, and Aegis does not upload your photos, videos, documents, private Notes, filenames, thumbnails, PINs, or encryption keys to any Irium Labs server.</strong></p>
      <p>However, Aegis is <strong>not</strong> completely network-isolated: when you view subscription plans, start a free trial, purchase or restore a subscription, or verify active entitlement, Aegis communicates with external subscription services — specifically <strong>Google Play Billing</strong> (on Android), <strong>Apple App Store / StoreKit</strong> (where supported on iOS), and <strong>RevenueCat</strong> — which process purchase history and an anonymous subscription identifier (<code>$RCAnonymousID</code>) needed to deliver, verify, and measure subscriptions.</p>
      <p>Aegis does not include third-party advertising SDKs, behavioral analytics trackers, or cross-app ad tracking.</p>
    `,
  },
  {
    id: 'on-device-storage',
    title: '3. On-Device Encrypted Storage (Photos, Videos, Documents, and Notes)',
    body: `
      <p>All user content imported into or created within Aegis — including photos, videos, PDFs, general documents, and private Notes — is encrypted locally on your device before being written into Aegis&rsquo;s private application storage.</p>
      <ul>
        <li><strong>Encryption &amp; Key Derivation:</strong> Vault files, metadata, and encrypted thumbnails are encrypted on-device using <strong>AES-256-GCM</strong> authenticated encryption (with unique per-file 256-bit Data Encryption Keys wrapped under a randomly generated 256-bit Master Key, and SHA-256 integrity digests). Your PIN and Recovery Key wrap the Master Key locally using memory-hard <code>scrypt</code> key derivation (<code>N=16384, r=8, p=1</code>); legacy PBKDF2-HMAC-SHA256 derivation is retained solely for migrating older vaults.</li>
        <li><strong>No Cloud Backup of App Storage:</strong> On Android, Aegis disables Android Auto Backup and cloud app-data backup (<code>allowBackup="false"</code>, <code>fullBackupContent="false"</code>) and disables cleartext network traffic (<code>usesCleartextTraffic="false"</code>).</li>
        <li><strong>Zero Vault Uploads:</strong> Aegis contains no server endpoint for uploading, syncing, or indexing your encrypted vault contents.</li>
      </ul>
    `,
  },
  {
    id: 'authentication',
    title: '4. PIN, Biometric Authentication, and Platform Security',
    body: `
      <p>Access to your vault is protected by a 6-digit PIN that you choose during setup, with optional device biometric unlock (fingerprint or face authentication where supported by your device).</p>
      <ul>
        <li><strong>Local Verification Only:</strong> Your PIN is never transmitted off your device. Biometric authentication is delegated to the operating system (Android BiometricPrompt / iOS LocalAuthentication); Aegis never accesses, reads, or stores raw biometric templates.</li>
        <li><strong>Platform Security Mechanisms:</strong> Aegis uses Android Keystore / Expo Secure Store (and corresponding platform keystore mechanisms where supported) to protect local key material. On Android release builds, Aegis also enables screenshot/screen-recording protection (<code>FLAG_SECURE</code>), overlay/tapjacking protection (<code>HIDE_OVERLAY_WINDOWS</code> and touch-obscuration filtering), recents exclusion, and automatic locking when backgrounded or idle.</li>
      </ul>
    `,
  },
  {
    id: 'permissions',
    title: '5. Media, Camera, Document, and Share Sheet Permissions',
    body: `
      <p>Aegis requests platform permissions only to perform features you initiate:</p>
      <ul>
        <li><strong>Photos &amp; Videos (Android Photo Picker / Media Library):</strong> Used to let you select photos and videos to encrypt into your vault, to save decrypted copies back to your device when you choose Export/Save, and — if you enable Smart Protection — to detect recently added media locally.</li>
        <li><strong>Documents (Storage Access Framework):</strong> Used to import user-selected PDFs and files or save encrypted backups to a folder or USB drive you choose.</li>
        <li><strong>Camera (Optional):</strong> Used only when you explicitly choose to capture a photo directly into your encrypted vault.</li>
        <li><strong>Android Share Sheet:</strong> Allows you to send files from other apps into Aegis. Shared items are never imported silently while the vault is locked or without an active entitlement.</li>
        <li><strong>Biometric &amp; Haptics:</strong> Used for optional biometric unlock and tactile feedback.</li>
      </ul>
    `,
  },
  {
    id: 'original-removal',
    title: '6. User-Authorized Original File Removal',
    body: `
      <p>When importing files, you may optionally choose to remove the original file from your device after import. Aegis enforces a strict verification sequence: an original file is never requested for deletion until the encrypted copy has been durably written to your vault, verified for integrity, and committed to vault metadata.</p>
      <p>On Android, deletion of shared media or documents requires your explicit operating-system confirmation (via Android <code>MediaStore</code> delete request or Storage Access Framework). If you deny the OS prompt or if the provider is read-only, the original file is kept and Aegis reports that accurately.</p>
      <p><strong>Important Notice on Cloud Copies:</strong> Removing an original file from your device does not automatically delete copies that were previously synced to third-party cloud services (such as Google Photos, Google Drive, iCloud, or messaging backups) or duplicates stored elsewhere.</p>
    `,
  },
  {
    id: 'smart-protection',
    title: '7. Smart Protection and Optional Notifications',
    body: `
      <p>Smart Protection is an optional feature that checks your device&rsquo;s media library locally to help you review and secure newly captured photos or videos. All detection runs entirely on-device; no file lists, timestamps, or media metadata are sent to Irium Labs or any third party.</p>
      <p>If you grant notification permission (<code>POST_NOTIFICATIONS</code>), Aegis may display local, privacy-preserving reminder notifications (for example, that recent items are ready for review or a backup reminder). Notifications do not include filenames, image previews, or personal file contents, and can be disabled anytime in Aegis Settings or Android Settings.</p>
    `,
  },
  {
    id: 'thumbnails-temp',
    title: '8. Encrypted Thumbnails and Temporary Media Processing',
    body: `
      <p>Thumbnails for photos and videos are stored encrypted inside your vault and decrypted on-demand into a bounded in-memory preview cache (capped by item count and byte size) while the vault is unlocked. When you lock Aegis, the in-memory preview cache is immediately cleared from application state and pending thumbnail tasks are cancelled.</p>
      <p>Viewing certain media (such as video playback or external sharing/export) may require brief temporary file handling inside private app cache storage; Aegis removes temporary playback/export files when the viewer closes or the vault locks. Note that in managed runtimes (such as JavaScript/Hermes), clearing in-memory references prevents further app access but does not guarantee immediate forensic RAM zeroing prior to OS memory reclamation.</p>
    `,
  },
  {
    id: 'backup-recovery',
    title: '9. Encrypted Backups, Restoration, Export, and Recovery Key Responsibilities',
    body: `
      <p>Aegis allows you to create encrypted backup archives (<code>.aegisbackup</code>) streamed directly to a storage location you choose (such as a local folder, SD card, USB drive, or user-selected cloud storage app). Backups are encrypted on-device using your Recovery Key before leaving Aegis.</p>
      <p><strong>Your Recovery Key Responsibility:</strong> Your Recovery Key is generated locally on your device and is never sent to or stored by Irium Labs. If you lose both your PIN and your Recovery Key, or if you lose your device without an encrypted backup and Recovery Key, <strong>Irium Labs cannot reset your vault, decrypt your backups, or recover your files</strong>.</p>
    `,
  },
  {
    id: 'subscriptions',
    title: '10. Google Play Billing, RevenueCat, and Third-Party Subscription Data',
    body: `
      <p>Aegis offers optional auto-renewing subscriptions (<strong>Aegis Premium</strong> — Annual and Monthly plans, with an introductory 3-day free trial for eligible new customers as determined by the app store).</p>
      <p>Subscription billing and entitlement verification are processed by:</p>
      <ul>
        <li><strong>Google Play Billing (Google LLC):</strong> Handles payment processing, localized pricing, tax, free-trial eligibility, renewals, cancellations, and refunds on Android under Google&rsquo;s Privacy Policy (<a href="https://policies.google.com/privacy" rel="noopener noreferrer">policies.google.com/privacy</a>). Irium Labs never receives your payment card or bank details.</li>
        <li><strong>RevenueCat, Inc. (<code>react-native-purchases</code> SDK):</strong> Used as a service provider to validate store receipts/purchase tokens, synchronize subscription entitlement status (<code>aegis_premium</code>), and provide aggregated subscription analytics (such as trial starts, renewals, and cancellations). Because Aegis does not use user accounts, does not collect custom customer attributes (such as name or email), does not call device/advertising identifier collection APIs, and enables no optional third-party attribution integrations, RevenueCat operates solely with an anonymous app-user identifier (<code>$RCAnonymousID</code>) and store purchase history under RevenueCat&rsquo;s Privacy Policy (<a href="https://www.revenuecat.com/privacy" rel="noopener noreferrer">revenuecat.com/privacy</a>).</li>
      </ul>
      <p>All network traffic between Aegis and subscription services is encrypted in transit using HTTPS/TLS.</p>
    `,
  },
  {
    id: 'sharing',
    title: '11. Data Sharing and Third-Party Service Providers',
    body: `
      <p>We do not sell your personal information, do not share your personal data for cross-context behavioral advertising, and never share your vault contents with any third party.</p>
      <p>Limited subscription and technical metadata is processed only by the third-party infrastructure providers required to deliver subscriptions (Google Play Billing, Apple App Store where applicable, and RevenueCat) and by our email provider if you voluntarily contact us at ${mail}. We may also disclose non-vault administrative records if required by applicable law or lawful government request (note that we do not possess your encrypted vault contents or keys and therefore cannot produce them).</p>
    `,
  },
  {
    id: 'retention-deletion',
    title: '12. Data Retention, Deletion, and Subscription Expiration',
    body: `
      <ul>
        <li><strong>Vault Data (On-Device):</strong> Retained solely on your device until you delete individual items, use <em>Settings &rarr; Reset Vault</em>, or uninstall Aegis. Uninstalling Aegis permanently removes app-private encrypted vault storage on the device (exported backups you saved elsewhere remain under your control).</li>
        <li><strong>Non-Hostage Policy After Subscription Expiration:</strong> If your Aegis Premium subscription expires or is cancelled, <strong>your existing encrypted vault remains accessible on your device</strong>. You can continue to unlock your vault, view existing items, export files back to your device, and create/restore backups. An active subscription is only required to import new files.</li>
        <li><strong>Subscription &amp; Support Records:</strong> Purchase and entitlement records held by Google Play and RevenueCat are retained according to their respective retention schedules and legal/tax obligations. Support emails sent to ${mail} are retained only as long as needed to respond to your enquiry and meet legal obligations.</li>
      </ul>
    `,
  },
  {
    id: 'rights',
    title: '13. Your Privacy Rights and Regional Disclosures',
    body: `
      <p>Depending on your jurisdiction — including India (Digital Personal Data Protection Act, 2023), the European Economic Area / UK (GDPR / UK GDPR), and US state privacy laws (such as CCPA/CPRA) — you may have rights to access, correct, delete, or restrict processing of personal data we control, or to withdraw consent.</p>
      <p>Because your vault data is stored exclusively on your device, you exercise direct control over accessing, exporting, and deleting it within Aegis. To request access to or deletion of any subscription-identifier records held via RevenueCat or support correspondence held by Irium Labs, email ${mail} with your anonymous RevenueCat app-user ID (if applicable) or enquiry details. Manage or cancel subscriptions directly through Google Play Store settings.</p>
    `,
  },
  {
    id: 'children',
    title: '14. Children&rsquo;s Privacy',
    body: `
      <p>Aegis is a general-audience utility application and is not directed to children under the age of 13 (or the higher minimum digital consent age in your jurisdiction, such as 16 in certain EEA regions or 18 under Indian law where parental consent is required). We do not knowingly collect personal information from children. If you believe a child has sent personal information to us via support email, please contact ${mail} so we can promptly delete it.</p>
    `,
  },
  {
    id: 'international',
    title: '15. International Data Transfers',
    body: `
      <p>Irium Labs is incorporated in India. While your vault contents remain on your device, subscription verification through Google Play and RevenueCat involves processing on servers located in the United States and other countries where those providers operate. Those providers maintain their own cross-border transfer mechanisms and contractual safeguards.</p>
    `,
  },
  {
    id: 'limitations',
    title: '16. Security Limitations',
    body: `
      <p>We engineer Aegis with strong modern cryptography and platform hardening, but no software or device can guarantee absolute security. Aegis cannot protect against a compromised or rooted operating system, physical device seizure while unlocked, weak or disclosed PINs, compromised third-party keyboards, or loss of your Recovery Key. We do not claim third-party security certifications or independent audit seals that have not been formally obtained.</p>
    `,
  },
  {
    id: 'contact-updates',
    title: '17. Contact Information and Policy Updates',
    body: `
      <p><strong>Publisher &amp; Data Controller:</strong> ${esc(company.legalName)}<br>
      <strong>Corporate Identity Number:</strong> ${esc(company.cin)}<br>
      <strong>Website:</strong> ${siteLink}<br>
      <strong>Privacy Contact:</strong> ${mail}</p>
      <p><strong>Effective Date:</strong> <time datetime="${AEGIS_PRIVACY_EFFECTIVE_DATE}">${AEGIS_PRIVACY_EFFECTIVE_LABEL}</time>. We may update this Privacy Policy when Aegis&rsquo;s features, third-party SDKs, or legal requirements change. The updated version will be published at this URL with a revised effective date.</p>
    `,
  },
]);

export function renderAegisPrivacyPage({ siteUrl, publicLaunch, assetVersion }: PageOptions): string {
  const canonical = `${siteUrl.replace(/\/$/, '')}${AEGIS_PRIVACY_PATH}`;
  const title = 'Aegis Privacy Policy — Irium Labs';
  const description = 'Privacy Policy for Aegis (io.aegis.vault), published by Irium Labs (OPC) Private Limited. Details on-device encryption, permissions, backups, Google Play Billing, and RevenueCat.';
  const asset = (reference: string): string => esc(`${reference}?v=${assetVersion}`);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#10121a">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="${publicLaunch ? 'index,follow' : 'noindex,nofollow'}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Irium Labs">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(siteUrl)}/assets/social.png">
  <meta property="og:image:alt" content="Irium Labs company identity">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="${asset('/assets/favicon.svg')}">
  <link rel="preload" href="${asset('/fonts/archivo-latin.woff2')}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${asset('/assets/main.css')}">
  <script type="application/ld+json">${organizationJson}</script>
</head>
<body class="aegis-policy-page">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="shell site-header aegis-policy-header">
    <a class="brand" href="/" aria-label="Irium Labs home">
      <img src="${asset('/assets/brand-horizontal.svg')}" alt="Irium Labs" width="340" height="64">
    </a>
    <a class="aegis-policy-home-link" href="/">Irium Labs Home</a>
  </header>
  <main id="main" tabindex="-1" class="shell aegis-policy-main">
    <header class="aegis-policy-hero">
      <p class="section-label">Aegis &middot; Android Package <code>io.aegis.vault</code></p>
      <h1>Privacy Policy</h1>
      <p class="aegis-policy-deck">Published by ${esc(company.legalName)} &middot; Effective <time datetime="${AEGIS_PRIVACY_EFFECTIVE_DATE}">${AEGIS_PRIVACY_EFFECTIVE_LABEL}</time></p>
    </header>
    <div class="aegis-policy-layout">
      <aside class="aegis-policy-toc" aria-label="Table of contents">
        <h2>Contents</h2>
        <nav>
          <ul>
            ${aegisPrivacySections.map(({ id, title: heading }) => `<li><a href="#${esc(id)}">${esc(heading)}</a></li>`).join('\n            ')}
          </ul>
        </nav>
      </aside>
      <article class="aegis-policy-body">
        ${aegisPrivacySections.map(({ id, title: heading, body }) => `
        <section id="${esc(id)}" aria-labelledby="h-${esc(id)}">
          <h2 id="h-${esc(id)}">${esc(heading)}</h2>
          ${body.trim()}
        </section>`).join('\n')}
      </article>
    </div>
  </main>
  <footer class="site-footer">
    <div class="shell">
      <div class="footer-record">
        <p>${esc(company.legalName)} <span>(One Person Company)</span></p>
        <p>Privacy contact: ${mail}</p>
        <p>CIN ${esc(company.cin)} &middot; <a href="/">iriumlabs.org</a></p>
      </div>
    </div>
  </footer>
</body>
</html>`;
}
