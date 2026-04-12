/**
 * MAPIT Terms of Service
 * Dark glassmorphic theme — consistent with the platform aesthetic.
 */

import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const LAST_UPDATED = "April 12, 2026";

export default function TermsOfService() {
  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ background: "#0A0A0A", fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
    >
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-8 py-5 border-b border-white/5 sticky top-0 z-10"
        style={{ background: "rgba(10,10,10,0.85)", backdropFilter: "blur(20px)" }}
      >
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
            Terms of Service
          </h1>
          <p className="text-white/35 text-sm mb-10">Last updated: {LAST_UPDATED}</p>

          <div className="space-y-10 text-white/70 text-sm leading-relaxed">

            <section>
              <h2 className="text-white font-semibold text-base mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the MAPIT platform operated by SkyVee Drones, LLC ("SkyVee," "we," "us"),
                you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use MAPIT.
                These Terms constitute a legally binding agreement between you and SkyVee.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">2. Description of Service</h2>
              <p>
                MAPIT is a cloud-based drone data visualization and mapping platform that allows users to upload
                drone imagery, extract GPS metadata, render interactive flight maps, and export data in standard
                geospatial formats (KML, GPX, GeoJSON, CSV).
              </p>
            </section>

            <section
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.20)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <h2 className="text-white font-semibold text-base mb-3">
                3. Mapping Accuracy Disclaimer
              </h2>
              <p className="mb-3">
                <strong className="text-white">MAPIT IS A VISUALIZATION TOOL, NOT A SUBSTITUTE FOR
                PROFESSIONAL LAND SURVEYING.</strong>
              </p>
              <p className="mb-3">
                All maps, flight paths, GPS coordinates, overlays, and geospatial data generated or displayed by
                MAPIT are provided for <strong className="text-white">informational and reference purposes
                only.</strong> They do not constitute a legal survey, boundary determination, or certified
                geospatial product.
              </p>
              <p className="mb-3">
                GPS metadata extracted from drone imagery is subject to inherent inaccuracies including, but not
                limited to, satellite signal drift, atmospheric interference, and device calibration errors.
                <strong className="text-white"> GPS coordinates displayed in MAPIT should not be relied upon
                to establish legal property boundaries, easements, rights-of-way, or any other legally
                significant geographic determination.</strong>
              </p>
              <p>
                For any project requiring legally defensible spatial data, you must engage a licensed professional
                land surveyor in your jurisdiction. SkyVee Drones, LLC expressly disclaims all liability for
                decisions made based on MAPIT-generated mapping data.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">4. Drone Regulations &amp; User Responsibility</h2>
              <p className="mb-3">
                You are solely responsible for ensuring that all drone operations that generate data uploaded to
                MAPIT comply with applicable local, state, federal, and international laws and regulations,
                including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-3">
                <li>
                  <strong className="text-white">FAA Part 107</strong> (United States) — Remote Pilot Certificate
                  requirements, airspace authorization (LAANC), altitude limits, and operational restrictions
                </li>
                <li>
                  <strong className="text-white">FAA Recreational Flyer Rules</strong> — registration, safety
                  guidelines, and fly-safe requirements for hobbyist operators
                </li>
                <li>
                  Local municipal ordinances governing drone operations over private property, public spaces,
                  and restricted areas
                </li>
                <li>
                  International Civil Aviation Organization (ICAO) standards for operations outside the United States
                </li>
              </ul>
              <p>
                SkyVee Drones, LLC does not verify the legality of any drone operation and assumes no liability
                for regulatory violations arising from your use of MAPIT.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">5. User Content &amp; Right to Upload</h2>
              <p className="mb-3">
                By uploading imagery, flight logs, or other content to MAPIT, you represent and warrant that:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>You have the legal right to capture and upload the imagery (including permission to photograph the site)</li>
                <li>Your content does not violate any third-party intellectual property, privacy, or proprietary rights</li>
                <li>Your content does not depict illegal activity or violate any applicable law</li>
              </ul>
              <p className="mt-3">
                You retain full ownership of all content you upload. By uploading, you grant SkyVee a limited,
                non-exclusive license to store, process, and display your content solely to provide the MAPIT
                service to you.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">6. Subscriptions &amp; Billing</h2>
              <div className="space-y-3">
                <p>
                  <strong className="text-white">Free Trial:</strong> New accounts receive a 14-day complimentary
                  trial with full platform access. No credit card is required to start a trial.
                </p>
                <p>
                  <strong className="text-white">Paid Subscriptions:</strong> After your trial period, continued
                  access requires a paid subscription. Subscription fees are billed in advance on a monthly or
                  annual basis, as selected at checkout.
                </p>
                <p>
                  <strong className="text-white">Automatic Renewal:</strong> Subscriptions renew automatically at
                  the end of each billing period. You authorize SkyVee to charge your payment method on file for
                  the applicable subscription fee at each renewal. You may cancel auto-renewal at any time through
                  your account billing settings or the Stripe Customer Portal.
                </p>
                <p>
                  <strong className="text-white">Cancellation:</strong> You may cancel your subscription at any
                  time. Cancellation takes effect at the end of the current billing period. No refunds are issued
                  for partial billing periods, except as required by applicable law.
                </p>
                <p>
                  <strong className="text-white">Price Changes:</strong> SkyVee reserves the right to change
                  subscription pricing with 30 days' advance notice. Your continued use after the effective date
                  constitutes acceptance of the new pricing.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">7. Prohibited Uses</h2>
              <p className="mb-3">You agree not to use MAPIT to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Upload content that violates any law or infringes any third-party rights</li>
                <li>Conduct surveillance of individuals without their knowledge or consent</li>
                <li>Attempt to reverse-engineer, decompile, or extract proprietary algorithms from the platform</li>
                <li>Use automated scripts or bots to scrape data or overload our infrastructure</li>
                <li>Resell or sublicense access to MAPIT without written authorization from SkyVee</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">8. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SKYVEE DRONES, LLC SHALL NOT BE LIABLE FOR
                ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS,
                DATA, OR GOODWILL, ARISING FROM YOUR USE OF OR INABILITY TO USE MAPIT. SKYVEE'S TOTAL CUMULATIVE
                LIABILITY TO YOU FOR ANY CLAIMS ARISING UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID TO
                SKYVEE IN THE 12 MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">9. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the State of Texas, United States, without regard to
                conflict of law principles. Any disputes shall be resolved exclusively in the state or federal
                courts located in Dallas County, Texas.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">10. Changes to Terms</h2>
              <p>
                SkyVee reserves the right to modify these Terms at any time. We will provide at least 14 days'
                notice of material changes via email or a prominent platform notice. Your continued use of MAPIT
                after the effective date constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">11. Contact</h2>
              <p>
                For questions about these Terms, contact SkyVee Drones, LLC at{" "}
                <a href="mailto:legal@skyveedrones.com" className="text-emerald-400 hover:text-emerald-300 underline">
                  legal@skyveedrones.com
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
        <a href="/privacy" className="hover:text-white/50 underline">Privacy Policy</a>
      </footer>
    </div>
  );
}
