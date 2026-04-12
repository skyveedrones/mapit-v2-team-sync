/**
 * MAPIT Privacy Policy
 * Dark glassmorphic theme — consistent with the platform aesthetic.
 */

import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const LAST_UPDATED = "April 12, 2026";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ background: "#0A0A0A", fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5 sticky top-0 z-10"
        style={{ background: "rgba(10,10,10,0.85)", backdropFilter: "blur(20px)" }}>
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors duration-200 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
        <span className="text-white text-lg font-bold tracking-tight">
          MAP<span className="text-emerald-400">i</span>T
        </span>
        <div className="w-24" />
      </nav>

      {/* Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <div
          className="rounded-2xl p-10"
          style={{
            background: "rgba(255,255,255,0.028)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(24px)",
          }}
        >
          <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: "-0.03em" }}>
            Privacy Policy
          </h1>
          <p className="text-white/35 text-sm mb-10">Last updated: {LAST_UPDATED}</p>

          <div className="space-y-10 text-white/70 text-sm leading-relaxed">

            <section>
              <h2 className="text-white font-semibold text-base mb-3">1. Introduction</h2>
              <p>
                SkyVee Drones, LLC ("SkyVee," "we," "us," or "our") operates the MAPIT platform
                (<strong className="text-white">mapit.skyveedrones.com</strong>). This Privacy Policy explains what
                information we collect, how we use it, and the choices you have regarding your data. By using MAPIT,
                you agree to the practices described below.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">2. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-white/90 font-medium mb-1">Account Information</p>
                  <p>
                    When you register, we collect your <strong className="text-white">email address</strong> and
                    display name. This is used to identify your account, send transactional emails (receipts,
                    password resets), and communicate important platform updates.
                  </p>
                </div>
                <div>
                  <p className="text-white/90 font-medium mb-1">Drone Imagery &amp; Media Files</p>
                  <p>
                    You may upload drone photographs, videos, and associated files to MAPIT. These files are stored
                    securely on our infrastructure and are accessible only to you and any collaborators you explicitly
                    invite. <strong className="text-white">We do not sell, license, or share your site imagery with
                    any third party.</strong>
                  </p>
                </div>
                <div>
                  <p className="text-white/90 font-medium mb-1">GPS &amp; Flight Log Metadata</p>
                  <p>
                    MAPIT extracts GPS coordinates embedded in your media files (EXIF data) and from uploaded flight
                    logs in KML, GPX, GeoJSON, and CSV formats. This location data is used exclusively to render
                    your flight paths, place markers on the map, and generate export files. It is never used for
                    advertising or sold to third parties.
                  </p>
                </div>
                <div>
                  <p className="text-white/90 font-medium mb-1">Usage &amp; Analytics Data</p>
                  <p>
                    We collect anonymized usage data (page views, feature interactions, session duration) to improve
                    the platform. This data does not include personally identifiable information and cannot be linked
                    back to individual users.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">3. Payment Data &amp; PCI-DSS Compliance</h2>
              <p>
                All payment processing is handled by <strong className="text-white">Stripe, Inc.</strong>, a
                PCI-DSS Level 1 certified payment processor. MAPIT <strong className="text-white">does not store,
                transmit, or have access to your full credit card number, CVV, or other sensitive payment
                credentials.</strong> When you enter payment details, they are transmitted directly to Stripe's
                secure servers. We store only a Stripe Customer ID and Subscription ID to manage your billing
                relationship. For more information, see{" "}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 underline"
                >
                  Stripe's Privacy Policy
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">4. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>To provide, maintain, and improve the MAPIT platform</li>
                <li>To render interactive maps, flight paths, and overlays from your uploaded data</li>
                <li>To process subscription payments and send billing receipts</li>
                <li>To send transactional emails (account creation, password reset, trial expiry notices)</li>
                <li>To detect and prevent fraud, abuse, and security incidents</li>
                <li>To comply with applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">5. Data Sharing &amp; Third Parties</h2>
              <p className="mb-3">
                We do not sell your personal data. We share data only with the following categories of service
                providers, strictly to operate the platform:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong className="text-white">Stripe</strong> — payment processing</li>
                <li><strong className="text-white">Cloud storage providers</strong> — secure file hosting for your uploaded media</li>
                <li><strong className="text-white">Analytics providers</strong> — anonymized, aggregated usage statistics only</li>
              </ul>
              <p className="mt-3">
                All third-party providers are contractually required to handle your data in accordance with
                applicable privacy laws and our data processing agreements.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">6. Data Retention</h2>
              <p>
                Your account data and uploaded files are retained for the duration of your active subscription.
                Upon account deletion, your data is permanently removed from our systems within 30 days, except
                where retention is required by law (e.g., billing records for tax purposes, retained for 7 years).
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">7. Your Rights</h2>
              <p className="mb-3">
                Depending on your jurisdiction, you may have the right to access, correct, delete, or export your
                personal data. To exercise any of these rights, contact us at{" "}
                <a href="mailto:privacy@skyveedrones.com" className="text-emerald-400 hover:text-emerald-300 underline">
                  privacy@skyveedrones.com
                </a>.
              </p>
              <p>
                If you are a resident of the European Economic Area (EEA) or California, additional rights may
                apply under GDPR or CCPA respectively. We will respond to all verified requests within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">8. Security</h2>
              <p>
                We implement industry-standard security measures including TLS encryption in transit, encrypted
                storage at rest, and access controls limiting data access to authorized personnel only. No method
                of transmission over the internet is 100% secure; however, we are committed to protecting your
                data using commercially reasonable means.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes via
                email or a prominent notice on the platform at least 14 days before the changes take effect. Your
                continued use of MAPIT after the effective date constitutes acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">10. Contact</h2>
              <p>
                For privacy-related questions or requests, contact SkyVee Drones, LLC at{" "}
                <a href="mailto:privacy@skyveedrones.com" className="text-emerald-400 hover:text-emerald-300 underline">
                  privacy@skyveedrones.com
                </a>{" "}
                or by mail at: SkyVee Drones, LLC, Dallas, TX, USA.
              </p>
            </section>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-white/20 text-xs border-t border-white/5">
        &copy; {new Date().getFullYear()} SkyVee Drones, LLC. All rights reserved. &nbsp;|&nbsp;{" "}
        <a href="/terms" className="hover:text-white/50 underline">Terms of Service</a>
      </footer>
    </div>
  );
}
