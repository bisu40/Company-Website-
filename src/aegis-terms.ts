import { escapeHtml as esc } from './components.ts';
import { company, officialPhone } from './data.ts';
import { organizationJson } from './pages.ts';
import { renderCompactLegalFooter } from './single-page.ts';

type PageOptions = { siteUrl: string; publicLaunch: boolean; assetVersion: string };

type TermsSection = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
};

export const AEGIS_TERMS_PATH = '/aegis/terms/';
export const AEGIS_TERMS_EFFECTIVE_DATE = '2026-11-27';
export const AEGIS_TERMS_EFFECTIVE_LABEL = '27 November 2026';

export const REGISTERED_OFFICE_ADDRESS =
  'Third Floor, Mr. Balraj Singh Lohiya House No. 170, Kh No. 393, G/F, L/S, Village Ghitorni, Gadaipur, South West Delhi, New Delhi, Delhi, India, 110030';

const mail = `<a href="mailto:${esc(company.email)}">${esc(company.email)}</a>`;
const grievanceMail = `<a href="mailto:grievance@iriumlabs.org">grievance@iriumlabs.org</a>`;
const phoneLink = `<a href="${esc(officialPhone.href)}">${esc(officialPhone.display)}</a>`;
const siteLink = `<a href="${esc(company.domain)}/">${esc(company.domain)}/</a>`;
const privacyLink = `<a href="/aegis/privacy/">Aegis Privacy Policy</a>`;
const googlePlaySubsLink = `<a href="https://play.google.com/store/account/subscriptions" rel="noopener noreferrer">Google Play Subscriptions</a>`;
const googlePlayCancelHelpLink = `<a href="https://support.google.com/googleplay/answer/7018481" rel="noopener noreferrer">Google Play subscription cancellation guide</a>`;
const googlePlayRefundPolicyLink = `<a href="https://support.google.com/googleplay/answer/2479637" rel="noopener noreferrer">Google Play refund policies</a>`;
const googlePlayRefundRequestLink = `<a href="https://support.google.com/googleplay/answer/2479639" rel="noopener noreferrer">request a refund on Google Play</a>`;
const appleCancelLink = `<a href="https://support.apple.com/HT202039" rel="noopener noreferrer">Apple Support subscription guide</a>`;
const appleRefundLink = `<a href="https://reportaproblem.apple.com/" rel="noopener noreferrer">reportaproblem.apple.com</a>`;

export const aegisTermsSections: readonly TermsSection[] = Object.freeze([
  {
    id: 'introduction',
    title: '1. Introduction and Acceptance',
    body: `
      <p>These Terms of Service (&ldquo;Terms&rdquo;) form a legally binding agreement between you (&ldquo;you&rdquo; or &ldquo;User&rdquo;) and <strong>IRIUM LABS (OPC) PRIVATE LIMITED</strong> (incorporated in ${esc(company.country)}, Corporate Identification Number <code>${esc(company.cin)}</code>, website ${siteLink}) (&ldquo;Irium Labs,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) governing your download, installation, access to, and use of the mobile application <strong>Aegis</strong> (Android application ID: <code>io.aegis.vault</code>) and related subscription or entitlement features.</p>
      <p>These Terms apply when you download, install, open, or use Aegis, or when you review the subscription terms and initiate a free trial or Aegis Premium purchase through the application&rsquo;s onboarding or subscription screens. Where affirmative acceptance prompts are presented in the application, your confirmation records your agreement to these Terms. If you do not agree to these Terms, do not download, install, or use Aegis.</p>
      <p><strong>Effective Date:</strong> <time datetime="${AEGIS_TERMS_EFFECTIVE_DATE}">${AEGIS_TERMS_EFFECTIVE_LABEL}</time> &middot; <strong>Last Updated:</strong> <time datetime="${AEGIS_TERMS_EFFECTIVE_DATE}">${AEGIS_TERMS_EFFECTIVE_LABEL}</time>.</p>
    `,
  },
  {
    id: 'application-description',
    title: '2. Application Description',
    body: `
      <p><strong>Aegis</strong> is a privacy-focused, locally encrypted file vault designed to help you secure user-selected photographs, videos, PDFs, general documents, private Notes, and other supported file types directly on your mobile device.</p>
      <p>Unlike an ordinary device gallery or standard file manager &mdash; which stores unencrypted files in shared device directories accessible to other installed applications, media indexers, or system gallery viewers &mdash; Aegis encrypts your selected items locally inside private application storage protected by your PIN, optional device biometrics, and local cryptographic keys.</p>
      <p><strong>What Aegis Is Not:</strong> Aegis is a personal encrypted file vault utility. It is <strong>not</strong> a financial wallet or payment service, a cloud storage or cloud-sync provider, an antivirus or anti-malware product, a healthcare or medical application, or a government-issued identity or compliance application.</p>
    `,
  },
  {
    id: 'eligibility',
    title: '3. Eligibility and Legal Capacity',
    body: `
      <p><strong>Intended Adult Audience (18+):</strong> Aegis is intended strictly for adults aged <strong>18 years and older</strong> (or the higher legal age of majority in your jurisdiction) who have full legal capacity to enter into a binding contract under applicable law. Aegis is not directed to, and may not be used by, minors under the age of 18.</p>
      <p>By downloading, installing, accessing, or subscribing to Aegis, you represent and confirm that you are at least 18 years old and legally capable of entering into these Terms in your country or region of residence.</p>
      <p><strong>Distinction from App-Store Content Ratings:</strong> App-store content ratings (such as Google Play content ratings) classify general content suitability and do <strong>not</strong> expand our intended adult target audience or override the legal contractual capacity required to accept these Terms and enter into paid subscription agreements. Purchases remain subject to the account eligibility rules of the authorized app store.</p>
    `,
  },
  {
    id: 'licence',
    title: '4. Application Licence',
    body: `
      <p>Subject to your compliance with these Terms and the applicable app-store terms (including the Google Play Terms of Service, and where applicable in the future, Apple&rsquo;s App Store terms), Irium Labs grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable licence to download, install, and use Aegis on compatible devices that you own or control for your lawful personal or internal professional/business use.</p>
      <p>Except as expressly permitted by these Terms or mandatory applicable law, you must not:</p>
      <ul>
        <li>Copy, redistribute, resell, rent, lease, lend, or commercially exploit Aegis or any portion of it;</li>
        <li>Bypass, disable, tamper with, or circumvent subscription verification, entitlement checks, or platform security protections;</li>
        <li>Modify, adapt, or create derivative works of Aegis, or remove proprietary notices, logos, or copyright markings; or</li>
        <li>Use automated scripts or unauthorized tools to abuse promotional access or subscription verification endpoints.</li>
      </ul>
      <p><strong>Statutory Exceptions Preserved:</strong> Nothing in this section restricts any rights you may have under mandatory applicable law, including legally protected interoperability, decompilation where strictly permitted by statute, or good-faith security research conducted in accordance with applicable law.</p>
    `,
  },
  {
    id: 'user-ownership',
    title: '5. User Ownership of Files',
    body: `
      <p><strong>As between you and Irium Labs, you retain all existing ownership and lawful rights you hold in the files and content you store in or export from Aegis.</strong> Irium Labs does not claim or acquire any ownership interest, copyright, or licence to access, reproduce, distribute, analyze, monetize, or otherwise exploit any photographs, videos, documents, private Notes, filenames, thumbnails, or encrypted backups that you store in or export from Aegis. Nothing in these Terms grants you ownership of any third-party copyrighted or proprietary material that you do not already own or have lawful rights to store.</p>
      <p>Aegis stores and encrypts your vault locally on your device and does not upload your private vault contents to Irium Labs servers. If you separately choose to export an encrypted backup archive to an external storage location or third-party cloud service that you select (see Section 9), that export is performed solely at your direction and remains under your control.</p>
    `,
  },
  {
    id: 'encryption-security',
    title: '6. Local Encryption and Security',
    body: `
      <p>Aegis is engineered around a local-first encryption and authentication architecture:</p>
      <ul>
        <li><strong>Local Authenticated Encryption:</strong> Imported files, vault metadata, and encrypted thumbnails are encrypted locally on your device using <strong>AES-256-GCM</strong> authenticated encryption with unique per-file Data Encryption Keys wrapped under a randomly generated local Master Key and cryptographic integrity verification.</li>
        <li><strong>PIN &amp; Secure Key Derivation:</strong> Access to your vault is protected by a user-created PIN. Your PIN and Recovery Key protect your local Master Key using memory-hard key derivation (<code>scrypt</code>, with legacy migration support retained where needed for older vaults).</li>
        <li><strong>Optional Biometric Authentication:</strong> Where supported by your device, you may enable biometric unlock (such as fingerprint or face authentication), which is delegated to the operating system&rsquo;s native biometric framework. Aegis never reads or stores raw biometric templates.</li>
        <li><strong>Recovery Key &amp; Encrypted Backups:</strong> Aegis generates a local Recovery Key that protects your Master Key and derives encryption keys for supported encrypted backup archives (<code>.aegisbackup</code>).</li>
        <li><strong>Platform Hardening:</strong> On supported Android builds, Aegis disables automatic cloud app-data backup and cleartext network traffic, and applies platform security protections such as screenshot/screen-recording blocking, overlay protection, and automatic locking when backgrounded or idle.</li>
      </ul>
      <p><strong>Security Limitations:</strong> No software application or mobile device can be guaranteed to be completely immune from attack or compromise. Irium Labs makes no absolute security guarantees. The confidentiality and integrity of your vault may be affected by a compromised, rooted, or jailbroken operating system, malicious system modifications, unauthorized physical access while the vault is unlocked, weak or disclosed PINs, compromised third-party keyboards, or loss of your Recovery Key.</p>
    `,
  },
  {
    id: 'pin-recovery',
    title: '7. PIN and Recovery Key Responsibilities',
    body: `
      <p>You are solely responsible for selecting a strong PIN, keeping your PIN confidential, and securely recording and safeguarding your Recovery Key in a safe location separate from your device.</p>
      <p><strong>Supported Recovery Procedure:</strong> If you forget your PIN, you may reset access to your vault on your device only by supplying your valid Recovery Key. Similarly, restoring an encrypted <code>.aegisbackup</code> archive requires the Recovery Key associated with that backup.</p>
      <p><strong>No Server-Side Key Recovery:</strong> Irium Labs does <strong>not</strong> receive, store, escrow, or possess your PIN, Recovery Key, or vault decryption keys. <strong>If you lose both your PIN and your Recovery Key, or if you lose your device without a valid encrypted backup and Recovery Key, Irium Labs cannot reset your vault, decrypt your files, or recover your data.</strong></p>
    `,
  },
  {
    id: 'file-import-removal',
    title: '8. File Import and Original File Removal',
    body: `
      <p>You explicitly select which photographs, videos, documents, or other supported files to import into Aegis through your device&rsquo;s photo picker, document picker, camera capture, or share sheet.</p>
      <p><strong>Optional Original File Removal &amp; Default Behaviour:</strong> Removing the original file after import is optional. Before confirming an import, Aegis presents a confirmation prompt allowing you to choose whether to remove the original file or keep it in its original location. For supported removable media items, the option to remove originals after import may be pre-selected by default unless you choose to keep the original before confirming. Original file removal is never requested until the encrypted copy has been durably written to your vault, verified for cryptographic integrity, and committed to vault metadata, and remains subject to explicit operating-system authorization (such as Android <code>MediaStore</code> delete confirmation or Storage Access Framework permissions).</p>
      <ul>
        <li><strong>Move vs. Copy Behaviour (Qualified by OS &amp; Provider Rules):</strong> If you authorize original file removal and the operating system completes the requested action, the file is intended to remain stored in encrypted form inside Aegis rather than in its original unencrypted device folder; however, depending on your operating system, storage provider, and device settings, an authorized removal may place the original file into a system Trash or &ldquo;Recently Deleted&rdquo; recovery folder rather than immediately erasing it, and synchronized copies held elsewhere are not removed by Aegis.</li>
        <li><strong>Unsuccessful Removal &amp; Operating-System Variations:</strong> Deletion behaviour varies by operating-system version, device manufacturer, storage provider, and system Trash or &ldquo;Recently Deleted&rdquo; folders. If you decline a system confirmation prompt, if removal is unsupported for that source, or if a storage provider is read-only, your encrypted copy remains safely stored inside Aegis, the original file remains in place, and Aegis reports the actual outcome accurately.</li>
        <li><strong>Cloud &amp; External Copies:</strong> Removing a local original file does <strong>not</strong> guarantee that copies previously synchronized to third-party cloud services (such as Google Photos, Google Drive, iCloud, or messaging backups) or duplicated elsewhere have been erased. You are responsible for managing or deleting any external or cloud-synced copies directly with those providers.</li>
      </ul>
    `,
  },
  {
    id: 'backup-restoration',
    title: '9. Backup and Restoration',
    body: `
      <p>Aegis provides on-device encrypted streaming backup and restoration tools that allow you to export your vault into an encrypted archive file (<code>.aegisbackup</code>) stored in a destination you choose &mdash; such as local device storage, an SD card, an external USB drive, or a third-party cloud storage app that you select &mdash; and restore it later using your Recovery Key.</p>
      <p><strong>Distinction Between No Irium Labs Uploads &amp; User-Selected Backup Destinations:</strong> Aegis never uploads your vault to Irium Labs servers. If you voluntarily choose to save or copy an encrypted <code>.aegisbackup</code> archive to a third-party cloud storage provider or external medium, that transfer is initiated solely by you and governed by that third-party provider&rsquo;s terms and privacy policy; the archive is encrypted on-device with your Recovery Key before leaving Aegis.</p>
      <p><strong>User Backup Responsibility:</strong> Because Irium Labs does not host cloud copies of your vault, you are solely responsible for creating regular encrypted backups, verifying that they are stored safely, and retaining the corresponding Recovery Key. Uninstalling Aegis, clearing application data, using <em>Settings &rarr; Reset Vault</em>, resetting or losing your device, or experiencing hardware or storage corruption may result in permanent, irreversible data loss if a usable encrypted backup and Recovery Key are not available.</p>
      <p><strong>Purchase Restoration vs. Vault Content Restoration:</strong> Using <em>Restore Purchases</em> restores only your active Aegis Premium subscription entitlement from the authorized app store. <strong>Restoring a subscription does not automatically restore private vault files</strong>; encrypted vault files can only be restored from an existing <code>.aegisbackup</code> archive using your Recovery Key.</p>
    `,
  },
  {
    id: 'subscription-plans',
    title: '10. Premium Subscription Plans',
    body: `
      <p>Aegis offers optional auto-renewing <strong>Aegis Premium</strong> subscriptions:</p>
      <ul>
        <li><strong>Monthly Plan:</strong> USD 9.99 per month (reference US list price).</li>
        <li><strong>Annual Plan:</strong> USD 39.99 per year (reference US list price).</li>
        <li><strong>Introductory Free Trial:</strong> Eligible new subscribers may receive a 3-day free trial, subject to store-determined eligibility rules.</li>
      </ul>
      <p><strong>Localized Pricing &amp; Governing Store Offer:</strong> Actual prices, currencies, applicable taxes (such as GST, VAT, or sales tax), and introductory offer eligibility may vary by country, region, and app-store account history. We do not guarantee that every user will be eligible for a free trial. The exact price, currency, billing period, and trial or promotional terms displayed by the authorized app store at the time of checkout govern your purchase.</p>
    `,
  },
  {
    id: 'trial-auto-renewal',
    title: '11. Free Trial and Automatic Renewal',
    body: `
      <p>Where a 3-day free trial is displayed and offered to you by the app store, your subscription begins with a 3-day trial period controlled by the store&rsquo;s eligibility rules. A free trial is temporary and is <strong>not</strong> permanently free.</p>
      <ul>
        <li><strong>Automatic Conversion:</strong> Unless you cancel before the end of the 3-day free trial in accordance with the applicable app store&rsquo;s cancellation rules, your trial will automatically convert into a paid Aegis Premium subscription, and the store will charge your payment method the recurring Monthly or Annual subscription price displayed at checkout.</li>
        <li><strong>Automatic Renewal:</strong> Paid subscriptions renew automatically at the end of each billing cycle (monthly or annually) for an equivalent period at the then-applicable subscription price, unless cancelled in advance of the renewal date.</li>
        <li><strong>Preventing Renewal Charges:</strong> To avoid being charged for the next billing period, you must cancel your subscription through your app-store account settings prior to the renewal cutoff specified by the store (for Google Play, before the renewal date shown in your subscription settings; for future Apple App Store subscriptions, at least 24 hours before the end of the current period).</li>
      </ul>
    `,
  },
  {
    id: 'billing-payment',
    title: '12. Billing and Payment Processing',
    body: `
      <p><strong>Android (Google Play Billing):</strong> Where Aegis is distributed for Android through Google Play, all Android digital subscription purchases, renewals, taxes, and payment transactions are processed exclusively through <strong>Google Play Billing</strong> (operated by the applicable regional Google contracting and billing entity, such as Google LLC, Google Ireland Limited, or Google Asia Pacific Pte. Ltd., depending on your country or region) under Google Play&rsquo;s applicable billing terms. Irium Labs does not directly collect, process, or store your payment card or bank account details.</p>
      <p><strong>Subscription Infrastructure (RevenueCat):</strong> Aegis uses <strong>RevenueCat, Inc.</strong> as a technical service provider to validate store purchase tokens/receipts and synchronize your <code>aegis_premium</code> entitlement status using an anonymous app-user identifier (<code>$RCAnonymousID</code>). RevenueCat is not your payment processor and does not charge your payment method.</p>
      <p><strong>Future iOS Distribution (Conditional):</strong> If and when an iOS version of Aegis is made publicly available through Apple&rsquo;s App Store, subscriptions purchased on iOS will be billed and processed exclusively by Apple through App Store In-App Purchases and governed by Apple&rsquo;s applicable billing terms.</p>
    `,
  },
  {
    id: 'subscription-management',
    title: '13. Subscription Management and Cancellation',
    body: `
      <p>You may view, change, or cancel an Android subscription at any time through the Google Play account associated with your purchase:</p>
      <ul>
        <li>Manage or cancel directly at ${googlePlaySubsLink}, or open the Google Play Store app &rarr; Profile icon &rarr; <em>Payments &amp; subscriptions</em> &rarr; <em>Subscriptions</em> &rarr; select <strong>Aegis</strong> &rarr; <em>Cancel subscription</em>.</li>
        <li>For additional instructions, see the official ${googlePlayCancelHelpLink}.</li>
      </ul>
      <p><strong>Uninstalling Does Not Cancel Billing:</strong> Deleting or uninstalling Aegis from your device does <strong>not</strong> automatically cancel an active subscription. You must cancel directly through your app store to stop future recurring charges.</p>
      <p><strong>Effect of Cancellation:</strong> Cancelling a subscription ordinarily prevents future automatic renewals while allowing you to continue using Aegis Premium features through the end of your current paid billing period, subject to any exceptions required by applicable law, app-store policy, or the specific terms of your transaction.</p>
      <p><strong>Future iOS Customers (Conditional):</strong> If and when Aegis is offered on iOS, App Store subscriptions will be managed and cancelled through your Apple Account settings (<em>Settings &rarr; [Your Name] &rarr; Subscriptions</em>) in accordance with the ${appleCancelLink}.</p>
    `,
  },
  {
    id: 'refunds-withdrawal',
    title: '14. Refunds and Consumer Withdrawal Rights',
    body: `
      <p>Routine cancellation stops future renewal charges as described in Section 13 and is separate from refund requests and statutory withdrawal rights.</p>
      <ul>
        <li><strong>Google Play Refund Requests:</strong> Because Google Play processes Android billing, refund requests are handled in accordance with ${googlePlayRefundPolicyLink}. You may submit a request via Google&rsquo;s official process to ${googlePlayRefundRequestLink}, or contact us at ${mail} with your Google Play order number if you need assistance with a billing issue or statutory refund claim.</li>
        <li><strong>Future iOS Refund Requests (Conditional):</strong> For future Apple App Store purchases, refund requests will be submitted directly to Apple via ${appleRefundLink}.</li>
      </ul>
      <p><strong>Statutory Consumer &amp; Withdrawal Rights Preserved:</strong> Nothing in these Terms creates an absolute &ldquo;no-refund&rdquo; policy or waives any non-waivable right you have under applicable consumer protection laws. Depending on where you live, you may have mandatory rights &mdash; including statutory cooling-off or withdrawal rights for distance digital contracts (such as the 14-day right of withdrawal in the European Union, EEA, and United Kingdom where applicable), statutory conformity guarantees and remedies for defective digital content or services (including under EU Directive 2019/770, the UK Consumer Rights Act 2015, the Australian Consumer Law, the Indian Consumer Protection Act, 2019, Canadian provincial consumer protection laws, and applicable US federal and state subscription laws). Accepting these Terms does not automatically waive any statutory withdrawal period or mandatory consumer remedy.</p>
    `,
  },
  {
    id: 'expiry-non-hostage',
    title: '15. Subscription Expiry and Existing Vault Access',
    body: `
      <p>Aegis operates under a strict <strong>non-hostage policy</strong> for your encrypted files. Cancelling a subscription, allowing a subscription to expire, or having a complimentary entitlement end does <strong>not</strong> authorize Irium Labs to delete, confiscate, or intentionally prevent you from accessing your existing locally encrypted vault files.</p>
      <ul>
        <li><strong>What Remains Available Without an Active Subscription:</strong> You may continue to unlock your existing vault with your PIN or biometrics, view and browse your existing encrypted photos, videos, documents, and Notes, export or save existing files back to your device, delete existing items, and create or restore encrypted <code>.aegisbackup</code> backups.</li>
        <li><strong>What Requires an Active Premium Entitlement:</strong> Importing new photos, videos, documents, or other files into your vault (and other Premium-gated capabilities designated in the application) requires an active Aegis Premium subscription or valid authorized entitlement.</li>
      </ul>
    `,
  },
  {
    id: 'complimentary-access',
    title: '16. Complimentary and Promotional Access',
    body: `
      <p>From time to time, Irium Labs may make authorized complimentary, promotional, or review access available for evaluation, support, or promotional purposes. Where offered and enabled, any complimentary access entitlement:</p>
      <ul>
        <li>Applies for a defined, time-limited duration;</li>
        <li>Does <strong>not</strong> create a paid subscription and does <strong>not</strong> authorize automatic billing or recurring charges;</li>
        <li>May be modified, suspended, or revoked for misuse, unauthorized sharing, abuse, or other lawful reasons (subject to the non-hostage policy for existing local vault files in Section 15); and</li>
        <li>Does <strong>not</strong> bypass, weaken, or alter vault encryption, PIN authentication, or Recovery Key protection.</li>
      </ul>
      <p><strong>Optional Access-Code Verification (Where Offered):</strong> Where Irium Labs offers and enables an optional complimentary or review access-code verification program, redeeming an eligible access code involves limited HTTPS/TLS network communication in which the submitted request payload contains only the access code you enter and your pseudonymous subscription identifier (<code>$RCAnonymousID</code>) to verify eligibility and request a time-limited promotional entitlement through RevenueCat. As with any HTTPS request, ordinary network metadata (such as your connecting IP address and standard transport headers) is transiently processed by our infrastructure provider (Cloudflare) to route the request and enforce failed-attempt rate limiting; raw IP addresses, raw access codes, and raw <code>$RCAnonymousID</code> values are not stored in the verification database, and minimized salted-hash security audit records use activity-triggered cleanup targeting 30-day retention (records may remain longer in the absence of subsequent verification activity). No vault files, filenames, thumbnails, PINs, biometrics, or Recovery Keys are ever transmitted. Complimentary access codes are subject to eligibility and availability, are not guaranteed to all users, and never create automatic billing.</p>
    `,
  },
  {
    id: 'smart-protection',
    title: '17. Smart Protection and Optional Device Permissions',
    body: `
      <p>Aegis offers optional <strong>Smart Protection</strong> functionality that, when enabled by you and granted the necessary operating-system permissions, checks your device&rsquo;s media library locally to detect newly captured or indexed <strong>photographs and videos</strong> so you can review them and decide whether to import them into your vault. If you also grant notification permission, Aegis may show local, privacy-preserving reminder notifications.</p>
      <p><strong>Documents &amp; Supported Scope:</strong> Smart Protection&rsquo;s automatic local detection applies to newly indexed photographs and videos in your device&rsquo;s media library and does <strong>not</strong> perform universal background monitoring of all third-party download or document folders. Supported documents (such as PDFs and text files) can be imported explicitly through your device&rsquo;s document picker or share sheet.</p>
      <p><strong>No Automatic Encryption or Deletion Without Authorization:</strong> Smart Protection does <strong>not</strong> silently or automatically encrypt, move, or delete your files without your explicit action and authorization.</p>
      <p>Optional features &mdash; including Smart Protection, camera capture, biometric unlock, local notifications, and external-folder backups &mdash; depend on your device capabilities, operating-system version, granted permissions, active entitlement where applicable, and platform restrictions, and may behave differently across device models.</p>
    `,
  },
  {
    id: 'acceptable-use',
    title: '18. Acceptable Use',
    body: `
      <p>You agree to use Aegis only for lawful purposes and in compliance with all applicable laws and regulations. You must not use Aegis to:</p>
      <ul>
        <li>Violate any applicable local, national, or international law or infringe the intellectual property, privacy, or other legal rights of any third party;</li>
        <li>Distribute malicious software, exploit code, or harmful payloads;</li>
        <li>Attempt unauthorized access to Irium Labs systems, third-party billing infrastructure, or entitlement verification endpoints; or</li>
        <li>Engage in licence abuse, fraudulent refund schemes, or unauthorized redistribution of Aegis or promotional access entitlements.</li>
      </ul>
      <p><strong>No Vault Inspection:</strong> Consistent with Aegis&rsquo;s local encrypted architecture, Irium Labs does not monitor, inspect, scan, or access your private encrypted vault contents.</p>
    `,
  },
  {
    id: 'privacy-third-party',
    title: '19. Privacy and Third-Party Services',
    body: `
      <p>Our handling of personal and technical information &mdash; including how Aegis interacts with Google Play Billing, RevenueCat, and (where applicable in the future) Apple&rsquo;s App Store &mdash; is described in the ${privacyLink} (<code>https://iriumlabs.org/aegis/privacy/</code>).</p>
      <p>Your private vault files, Notes, PIN, and Recovery Key remain locally on your device and are never uploaded to Irium Labs servers (any export of an encrypted <code>.aegisbackup</code> archive to a third-party storage or cloud service occurs solely at your direction as described in Section 9). However, Aegis is <strong>not</strong> completely offline: viewing subscription offerings, starting a trial, purchasing or restoring a subscription, verifying active entitlements, and (where offered and enabled) verifying an optional complimentary access code require limited HTTPS/TLS network communication with external billing, entitlement, or verification service providers, which also involves ordinary network metadata (such as IP addresses and standard transport headers) processed by those infrastructure providers. Your use of third-party app stores, payment services, and user-chosen backup storage providers is governed by their respective terms and privacy policies.</p>
    `,
  },
  {
    id: 'availability-updates',
    title: '20. Availability, Compatibility, and Software Updates',
    body: `
      <p>Aegis depends on compatible device hardware, supported operating-system versions, and platform security and storage APIs. Core local vault functions (unlocking, viewing, exporting, and local backup/restore) operate on-device without requiring an active internet connection. Subscription purchases, purchase restoration, and periodic entitlement verification (including refreshing cached subscription entitlements after an extended offline period for new file imports) depend on internet connectivity and third-party store infrastructure that may occasionally experience maintenance or service interruptions.</p>
      <p>Irium Labs may release software updates to improve security, maintain operating-system compatibility, fix defects, or refine features. We will not arbitrarily withdraw core paid functionality during an active paid subscription period in disregard of your existing purchase commitments or applicable consumer protection laws.</p>
    `,
  },
  {
    id: 'intellectual-property',
    title: '21. Intellectual Property',
    body: `
      <p>All rights, title, and interest in and to the Aegis application &mdash; including its software code, user interface design, visual layout, original Aegis and Irium Labs logos and artwork, text, and documentation &mdash; are owned by or licensed to ${esc(company.legalName)} and are protected by applicable copyright and other intellectual property laws. No rights are granted to you other than the limited licence set out in Section 4.</p>
      <p>As stated in Section 5, as between you and Irium Labs, you retain all existing ownership and lawful rights you hold in the files and content stored in your vault. Aegis also incorporates third-party and open-source software components that remain subject to their respective licence terms.</p>
    `,
  },
  {
    id: 'warranties-liability',
    title: '22. Warranties and Limitation of Liability',
    body: `
      <p><strong>Proportionate Warranty Disclaimer:</strong> To the maximum extent permitted by applicable law, Aegis is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without express or implied warranties of uninterrupted operation, error-free performance, or fitness for a particular non-specified purpose. This disclaimer does <strong>not</strong> exclude, restrict, or modify any mandatory statutory warranty, consumer guarantee, or conformity obligation that cannot lawfully be excluded under applicable consumer law.</p>
      <p><strong>Foreseeable Local-Vault Risks:</strong> Because Aegis encrypts files locally and Irium Labs has no access to your device, PIN, Recovery Key, or backups, Irium Labs is not responsible for loss or damage resulting from causes outside our control, including device hardware or storage failure, operating-system defects or updates, forgotten PINs or lost Recovery Keys, unauthorized physical access to an unlocked device, accidental user deletion, or missing, incomplete, or corrupted backups stored outside our control. This paragraph does <strong>not</strong> excuse losses or damages caused by Irium Labs&rsquo; own defective software implementation where liability cannot lawfully be excluded, or by any breach of our non-excludable statutory obligations.</p>
      <p><strong>Limitation of Liability &amp; Non-Excludable Liabilities:</strong> To the maximum extent permitted by applicable law, Irium Labs shall not be liable for indirect, incidental, consequential, or special damages, or for loss of data caused by factors outside our reasonable control. <strong>Nothing in these Terms excludes or limits liability for Irium Labs&rsquo; breach of non-excludable statutory warranties or consumer guarantees, defective digital content or services where remedies are guaranteed by applicable law, fraud, fraudulent misrepresentation, wilful misconduct, gross negligence, death or personal injury caused by negligence, or any other liability that cannot lawfully be excluded or limited under applicable law.</strong></p>
    `,
  },
  {
    id: 'termination-suspension',
    title: '23. Termination and Suspension',
    body: `
      <p>You may stop using Aegis at any time by discontinuing use or uninstalling the application (remembering to export or back up your vault first and to cancel any active subscription separately through your app store).</p>
      <p>Irium Labs may suspend or revoke complimentary or promotional access, restrict future Premium entitlements, or terminate your licence to use Aegis if you materially breach these Terms, engage in fraud or licence abuse, or where required to comply with applicable law or app-store requirements.</p>
      <p><strong>Preservation of Local Files &amp; Lawful Remedies:</strong> Suspension or termination of an entitlement does <strong>not</strong> authorize arbitrary deletion or confiscation of your locally encrypted vault files. Consistent with Section 15 and applicable law, existing-file access, export, and backup/recovery functionality on your device, as well as any applicable statutory refund or consumer remedies, remain preserved.</p>
    `,
  },
  {
    id: 'governing-law',
    title: '24. Governing Law and Dispute Resolution',
    body: `
      <p>Irium Labs is incorporated in India. Subject to the mandatory consumer protections below, these Terms are governed by the laws of <strong>India</strong>, without regard to conflict-of-laws principles.</p>
      <p><strong>Mandatory International Consumer Rights Preserved:</strong> If you are a consumer residing outside India &mdash; including in the European Union, the European Economic Area, the United Kingdom, the United States, Australia, or Canada &mdash; nothing in these Terms deprives you of the protection of mandatory consumer laws in your country or state of residence, or restricts any mandatory right you have to bring or defend legal proceedings in the courts of your place of residence.</p>
      <p><strong>Informal Resolution:</strong> Before initiating formal legal proceedings, we encourage you to contact us at ${mail} with a description of your concern so we have an opportunity to resolve the matter promptly and in good faith.</p>
    `,
  },
  {
    id: 'changes',
    title: '25. Changes to These Terms',
    body: `
      <p>We may update these Terms from time to time to reflect changes in Aegis&rsquo;s features, supported platforms, subscription infrastructure, or applicable legal requirements. When we update these Terms, we will publish the revised version at <code>https://iriumlabs.org/aegis/terms/</code> and update the &ldquo;Last Updated&rdquo; date above. For material changes affecting active users or subscriptions, we will provide reasonable advance notice through the application, app-store listing, or this page where appropriate.</p>
      <p>Updated Terms apply prospectively from their stated effective date. We do not claim unrestricted authority to retroactively alter core paid subscription obligations for an already-paid current billing period or to diminish mandatory statutory consumer rights.</p>
    `,
  },
  {
    id: 'contact',
    title: '26. Contact, Consumer Support, and Grievance Redressal',
    body: `
      <p><strong>Legal Entity:</strong> IRIUM LABS (OPC) PRIVATE LIMITED<br>
      <strong>Corporate Identification Number (CIN):</strong> <code>${esc(company.cin)}</code><br>
      <strong>Registered Office:</strong> ${esc(REGISTERED_OFFICE_ADDRESS)}<br>
      <strong>Official Website:</strong> ${siteLink}<br>
      <strong>General Support &amp; Consumer Enquiries:</strong> ${mail}<br>
      <strong>Official Business &amp; Support Telephone:</strong> ${phoneLink}</p>
      <p><strong>Designated Grievance Officer:</strong><br>
      <strong>Name:</strong> Biswajit Mondal<br>
      <strong>Designation:</strong> Director &amp; Grievance Officer<br>
      <strong>Company:</strong> IRIUM LABS (OPC) PRIVATE LIMITED<br>
      <strong>Grievance Email:</strong> ${grievanceMail}<br>
      <strong>Grievance Telephone:</strong> ${phoneLink}</p>
      <p><strong>How to Contact Us &amp; Grievance Handling:</strong> For general application support, technical questions, or subscription enquiries, email ${mail} or call ${phoneLink}. For formal consumer grievances, billing disputes, refund complaints, or statutory rights requests, you may submit a complaint either by email to ${grievanceMail} or by telephone at ${phoneLink}. Formal consumer complaints received via ${grievanceMail} or ${phoneLink} are logged into our grievance register, acknowledged within <strong>48 hours</strong> with a unique complaint reference number (together with a recorded copy of the complaint where required by applicable law), and addressed within <strong>one calendar month</strong> from the date of receipt in accordance with applicable consumer protection rules.</p>
      <p>To help us assist you, please include your device model, operating-system version, Aegis version, and (for billing or refund enquiries) your app-store order reference. <strong>For your security, never include your PIN, Recovery Key, or private vault files in any support or grievance email.</strong></p>
    `,
  },
]);

export function renderAegisTermsPage({ siteUrl, publicLaunch, assetVersion }: PageOptions): string {
  const canonical = `${siteUrl.replace(/\/$/, '')}${AEGIS_TERMS_PATH}`;
  const title = 'Aegis Terms of Service — Irium Labs';
  const description =
    'Terms of Service for Aegis (io.aegis.vault), developed and published by Irium Labs (OPC) Private Limited. Covers local encryption, Recovery Key responsibilities, Aegis Premium subscriptions, refunds, and non-hostage vault access.';
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
  <script type="module" src="${asset('/assets/visual-scenes.js')}"></script>
  <script type="application/ld+json">${organizationJson}</script>
</head>
<body class="aegis-policy-page">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="site-backdrop" aria-hidden="true">
    <canvas class="circuit-background" data-circuit-background></canvas>
  </div>
  <header class="shell site-header aegis-policy-header">
    <a class="brand" href="/" aria-label="Irium Labs home">
      <img src="${asset('/assets/brand-horizontal.svg')}" alt="Irium Labs" width="340" height="64">
    </a>
    <nav class="aegis-policy-nav" aria-label="Primary">
      <a href="/">Home</a>
      <a href="/aegis/privacy/">Privacy Policy</a>
    </nav>
  </header>
  <main id="main" tabindex="-1" class="aegis-policy-main">
    <section class="shell editorial aegis-policy-hero" aria-labelledby="terms-title">
      <div class="product-legal-intro">
        <img class="product-legal-logo" src="${asset('/assets/aegis-logo.png')}" alt="Aegis application logo" width="88" height="88">
        <div class="section-heading">
          <p class="section-label">Aegis &middot; Terms of Service</p>
          <h1 class="statement aegis-policy-title" id="terms-title">Terms of Service</h1>
          <p class="section-copy">Terms governing the download, use, local encryption, and Aegis Premium subscriptions for the Aegis mobile application (<code>io.aegis.vault</code>), published by ${esc(company.legalName)}.</p>
        </div>
      </div>
      <dl class="company-record aegis-policy-meta">
        <div><dt>Application</dt><dd>Aegis (<code>io.aegis.vault</code>)</dd></div>
        <div><dt>Publisher</dt><dd>${esc(company.legalName)}</dd></div>
        <div><dt>Effective date</dt><dd><time datetime="${AEGIS_TERMS_EFFECTIVE_DATE}">${AEGIS_TERMS_EFFECTIVE_LABEL}</time></dd></div>
      </dl>
    </section>
    <section class="shell editorial aegis-policy-document" aria-label="Terms of service document">
      <div class="aegis-policy-layout">
        <aside class="aegis-policy-toc" aria-label="Table of contents">
          <p class="section-label">Contents</p>
          <nav>
            <ol>
              ${aegisTermsSections.map(({ id, title: heading }) => `<li><a href="#${esc(id)}">${esc(heading)}</a></li>`).join('\n              ')}
            </ol>
          </nav>
        </aside>
        <details class="aegis-policy-toc-mobile">
          <summary>Contents (${aegisTermsSections.length} sections)</summary>
          <nav aria-label="Table of contents">
            <ol>
              ${aegisTermsSections.map(({ id, title: heading }) => `<li><a href="#${esc(id)}">${esc(heading)}</a></li>`).join('\n              ')}
            </ol>
          </nav>
        </details>
        <article class="aegis-policy-body">
          ${aegisTermsSections.map(({ id, title: heading, body }) => `
          <section id="${esc(id)}" aria-labelledby="h-${esc(id)}">
            <h2 id="h-${esc(id)}">${esc(heading)}</h2>
            ${body.trim()}
          </section>`).join('\n')}
        </article>
      </div>
    </section>
  </main>
  ${renderCompactLegalFooter(asset('/assets/brand-horizontal.svg'), { currentPath: AEGIS_TERMS_PATH, privacyHref: '/aegis/privacy/', termsHref: AEGIS_TERMS_PATH })}
</body>
</html>`;
}
