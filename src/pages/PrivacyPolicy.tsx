import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const LAST_UPDATED = '17 May 2026';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-800">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold shadow-sm">
              M
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Neomed</p>
              <h1 className="text-lg font-extrabold text-zinc-900">Privacy Policy</h1>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-emerald-600"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10 pb-16">
        <div className="flex items-start gap-3 mb-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
          <Shield className="text-emerald-600 shrink-0 mt-0.5" size={22} />
          <p className="text-sm text-zinc-700 leading-relaxed">
            This Privacy Policy explains how <strong>Neomed</strong> (“we”, “us”, “our”) collects, uses,
            stores, and protects personal information when you use our delivery and invoice management
            platform, including the <strong>Neomed web application</strong> and the <strong>Neomed mobile
            app</strong> (Android/iOS), together with related APIs and services.
          </p>
        </div>

        <p className="text-xs text-zinc-500 mb-8">Last updated: {LAST_UPDATED}</p>

        <PolicySection title="1. Who this policy applies to">
          <p>This policy applies to users of Neomed who access the service through a web browser or the
            mobile application, including but not limited to:</p>
          <ul>
            <li>Administrators and super administrators</li>
            <li>Managers</li>
            <li>Delivery personnel</li>
            <li>Staff users</li>
          </ul>
          <p>
            If you use Neomed on behalf of an organization (for example, a pharmacy or distribution
            company), your organization may also have its own policies. This document describes how the
            Neomed platform handles data technically.
          </p>
        </PolicySection>

        <PolicySection title="2. Information we collect">
          <h3 className="text-sm font-bold text-zinc-900 mt-4 mb-2">2.1 Account and profile information</h3>
          <ul>
            <li>Email address and full name</li>
            <li>Phone number (when provided by your administrator)</li>
            <li>Role and account status (active/inactive)</li>
            <li>Password (stored only in hashed form on our servers; we do not store plain-text passwords)</li>
          </ul>

          <h3 className="text-sm font-bold text-zinc-900 mt-4 mb-2">2.2 Delivery and invoice operations</h3>
          <p>When you use Neomed to manage or complete deliveries, we process operational data such as:</p>
          <ul>
            <li>Invoice numbers, hospital or customer names, amounts, and status</li>
            <li>Assignment of tasks to delivery users</li>
            <li>Proof of delivery: signed invoice images, payment details (cash/cheque amounts, cheque number, bank name)</li>
            <li>Cheque photographs when uploaded</li>
            <li>Delivery timestamps (created, accepted, delivered)</li>
            <li>GPS location (latitude/longitude), speed, heading, and device battery level when a delivery user is on duty and the app sends location updates</li>
            <li>Travel path history for on-duty delivery users (stored for operational tracking and reporting)</li>
            <li>Cancellation reasons and delivery feedback where provided</li>
          </ul>

          <h3 className="text-sm font-bold text-zinc-900 mt-4 mb-2">2.3 Notifications and realtime connectivity</h3>
          <ul>
            <li>
              <strong>Push notifications:</strong> Firebase Cloud Messaging (FCM) device tokens for mobile
              delivery users and browser push tokens for admin/manager web sessions (when enabled)
            </li>
            <li>
              <strong>WebSocket sessions:</strong> connection metadata while the app maintains a live
              connection for new tasks and updates
            </li>
            <li>In-app notification content (for example, new invoice alerts)</li>
          </ul>

          <h3 className="text-sm font-bold text-zinc-900 mt-4 mb-2">2.4 Optional Gmail integration (web)</h3>
          <p>
            Administrators or managers may optionally connect a Gmail account in Profile to import invoice
            emails. If you connect Gmail, we access Gmail data only as needed for this feature, including:
          </p>
          <ul>
            <li>Email metadata (subject, sender, date, snippet)</li>
            <li>Email body text where stored for display in the app</li>
            <li>PDF attachments in the inbox, processed to create draft invoices</li>
            <li>OAuth tokens required to maintain the connection (stored securely on our servers)</li>
          </ul>
          <p>
            Gmail access uses Google’s APIs under the permissions you approve during connection. You can
            disconnect Gmail at any time from Profile.
          </p>

          <h3 className="text-sm font-bold text-zinc-900 mt-4 mb-2">2.5 Technical and usage information</h3>
          <ul>
            <li>IP address, browser or device type, and request logs from our API</li>
            <li>Authentication tokens (JWT) issued when you sign in</li>
            <li>Error and diagnostic logs to maintain security and reliability</li>
          </ul>

          <h3 className="text-sm font-bold text-zinc-900 mt-4 mb-2">2.6 Information stored on your device</h3>
          <ul>
            <li>
              <strong>Web:</strong> session token and user preferences in browser local storage
            </li>
            <li>
              <strong>Mobile:</strong> authentication token in secure app storage; optional cached app data
            </li>
            <li>Local notifications shown by the mobile app when a push message is received in the foreground</li>
          </ul>
        </PolicySection>

        <PolicySection title="3. How we use your information">
          <p>We use personal and operational data to:</p>
          <ul>
            <li>Authenticate users and enforce role-based access</li>
            <li>Create, assign, track, and complete invoice deliveries</li>
            <li>Display live maps and delivery history to authorized managers and administrators</li>
            <li>Send push and in-app notifications about new tasks and important updates</li>
            <li>Import invoice data from connected Gmail inboxes (when enabled)</li>
            <li>Maintain audit trails, reports, and operational records</li>
            <li>Protect the service against fraud, abuse, and security incidents</li>
            <li>Improve stability and fix technical issues</li>
          </ul>
        </PolicySection>

        <PolicySection title="4. Legal bases for processing (EEA/UK users)">
          <p>Where applicable data protection law requires a legal basis, we rely on:</p>
          <ul>
            <li>
              <strong>Contract:</strong> processing necessary to provide the Neomed service you or your
              organization use
            </li>
            <li>
              <strong>Legitimate interests:</strong> securing the platform, fraud prevention, and improving
              delivery operations, balanced against your rights
            </li>
            <li>
              <strong>Consent:</strong> optional features such as push notifications, Gmail connection, and
              device location while on duty (you can withdraw consent via device or app settings, though some
              features may not work without it)
            </li>
            <li>
              <strong>Legal obligation:</strong> where we must retain or disclose data to comply with law
            </li>
          </ul>
        </PolicySection>

        <PolicySection title="5. How we share information">
          <p>We do not sell your personal information. We may share data only in these situations:</p>
          <ul>
            <li>
              <strong>Within your organization:</strong> administrators, managers, and authorized users see
              data according to their role (for example, delivery users see assigned tasks; managers may see
              live locations of on-duty drivers)
            </li>
            <li>
              <strong>Service providers:</strong> hosting, database, and cloud infrastructure providers that
              process data on our behalf under contractual safeguards
            </li>
            <li>
              <strong>Google services:</strong> Firebase Cloud Messaging for push delivery; Gmail API when you
              connect Gmail (subject to Google’s policies)
            </li>
            <li>
              <strong>Legal requirements:</strong> if required by law, court order, or governmental request
            </li>
          </ul>
        </PolicySection>

        <PolicySection title="6. Data retention">
          <p>We retain information for as long as needed to provide the service and meet legal or business
            requirements, including:</p>
          <ul>
            <li>Account data while your account is active and for a reasonable period after deactivation</li>
            <li>Invoice and delivery records according to your organization’s operational and legal needs</li>
            <li>
              Signed delivery proof images may no longer be shown to delivery users in the app after a short
              period following completion (administrators and managers retain access as configured)
            </li>
            <li>Location path archives for historical tracking and reporting</li>
            <li>Gmail-synchronized email metadata until you disconnect Gmail or delete stored messages</li>
            <li>Server logs for a limited period for security and troubleshooting</li>
          </ul>
          <p>
            Your organization may define additional retention rules. Contact your administrator or us for
            deletion requests where applicable.
          </p>
        </PolicySection>

        <PolicySection title="7. Security">
          <p>
            We use industry-standard measures including HTTPS encryption in transit, password hashing,
            role-based access controls, and restricted access to production systems. No method of
            transmission or storage is 100% secure; please use a strong password and protect your device.
          </p>
        </PolicySection>

        <PolicySection title="8. Your rights and choices">
          <p>Depending on your location, you may have rights to:</p>
          <ul>
            <li>Access, correct, or delete personal data we hold about you</li>
            <li>Object to or restrict certain processing</li>
            <li>Withdraw consent for optional features (push, location, Gmail)</li>
            <li>Export your data where technically feasible</li>
            <li>Lodge a complaint with a data protection authority</li>
          </ul>
          <p>Practical controls in Neomed:</p>
          <ul>
            <li>Sign out to end your session on web; uninstall the mobile app to remove local data</li>
            <li>Disable notifications in device settings or decline the permission prompt</li>
            <li>Go offline in the delivery app to stop location sharing</li>
            <li>Disconnect Gmail from Profile (admin/manager)</li>
            <li>Contact your organization’s administrator for account changes or deletion</li>
          </ul>
        </PolicySection>

        <PolicySection title="9. Mobile app permissions">
          <p>The Neomed mobile app may request the following device permissions:</p>
          <ul>
            <li>
              <strong>Location (precise):</strong> while on duty, to share your position with dispatchers and
              record delivery routes
            </li>
            <li>
              <strong>Camera:</strong> to capture signed delivery proofs and cheque images
            </li>
            <li>
              <strong>Notifications:</strong> to alert you about new delivery tasks (optional; you may deny
              and still use other features)
            </li>
            <li>
              <strong>Internet:</strong> required for all core functionality
            </li>
            <li>
              <strong>Foreground service (Android):</strong> to continue location updates while on duty when
              the app is in the background
            </li>
          </ul>
        </PolicySection>

        <PolicySection title="10. Cookies and local storage (web)">
          <p>
            The web application uses browser local storage to keep you signed in (authentication token and
            basic profile) and to store local notification preferences. We do not use third-party
            advertising cookies. Service workers may be used for web push notifications when you enable
            them.
          </p>
        </PolicySection>

        <PolicySection title="11. Children’s privacy">
          <p>
            Neomed is intended for business use and is not directed at children under 16 (or the minimum age
            in your jurisdiction). We do not knowingly collect personal information from children.
          </p>
        </PolicySection>

        <PolicySection title="12. International data transfers">
          <p>
            Your data may be processed on servers located in countries other than your own. Where required,
            we implement appropriate safeguards for cross-border transfers.
          </p>
        </PolicySection>

        <PolicySection title="13. Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. The “Last updated” date at the top
            indicates the latest revision. Material changes may be communicated through the app or by email
            where appropriate.
          </p>
        </PolicySection>

        <PolicySection title="14. Contact us">
          <p>
            For privacy questions, data subject requests, or concerns about this policy, contact:
          </p>
          <ul>
            <li>
              Email:{' '}
              <a href="mailto:privacy@encryptedbar.com" className="text-emerald-600 font-semibold hover:underline">
                privacy@encryptedbar.com
              </a>
            </li>
          </ul>
          <p className="text-sm text-zinc-500 mt-4">
            If you use Neomed through an employer or client organization, you may also contact your
            organization’s data protection or IT contact for account-specific requests.
          </p>
        </PolicySection>

        <footer className="mt-12 pt-8 border-t border-zinc-200 text-center text-sm text-zinc-500">
          <Link to="/" className="text-emerald-600 font-semibold hover:underline">
            Return to Neomed sign in
          </Link>
        </footer>
      </main>
    </div>
  );
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-base font-extrabold text-zinc-900 mb-3">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-zinc-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-zinc-900">
        {children}
      </div>
    </section>
  );
}
