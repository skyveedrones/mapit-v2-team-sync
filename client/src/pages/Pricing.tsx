/**
 * MAPIT Pricing — 4-Tier Jobsian Invitation to Power
 * Experience / Precision / Scale / Civic
 * Pure black, glassmorphic monoliths, monthly/annual toggle.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowLeft, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const METALLIC = "linear-gradient(160deg, #ffffff 0%, #d1d5db 45%, #9ca3af 100%)";

const TIERS = [
  {
    id: "experience",
    hook: "Experience",
    monthlyPrice: 49,
    annualMonthly: 41.65,
    annualTotal: 499.80,
    priceLabel: null,
    trialTag: false,
    badge: null,
    description:
      "Full access to the MAPIT engine for 14 days. Create your first digital twin and master the terrain without limits.",
    specs: [
      "100 GB Storage",
      "10 Projects",
      "CAD Overlay Basics",
      "Email Support",
      "14-Day Free Trial",
    ],
    cta: "Start Your Trial",
    ctaStyle: "solid" as const,
    action: "trial",
  },
  {
    id: "precision",
    hook: "Precision",
    monthlyPrice: 149,
    annualMonthly: 126.65,
    annualTotal: 1519.80,
    priceLabel: null,
    trialTag: false,
    badge: "MOST POPULAR",
    description:
      "For the dedicated engineer. Unlimited projects, advanced APWA utility overlays, and high-frequency data processing.",
    specs: [
      "500 GB Storage",
      "Unlimited Projects",
      "5 Stakeholder Seats",
      "Sub-Surface Verification Docs",
      "Priority Email Support",
    ],
    cta: "Start Your Trial",
    ctaStyle: "solid" as const,
    action: "trial",
  },
  {
    id: "scale",
    hook: "Scale",
    monthlyPrice: 349,
    annualMonthly: 296.65,
    annualTotal: 3559.80,
    priceLabel: null,
    trialTag: false,
    badge: null,
    description:
      "Global scale. Unlimited stakeholder viewing, API access, and priority processing for organizations that shape the world.",
    specs: [
      "1.5 TB Storage",
      "Unlimited Stakeholder Viewing",
      "API Access",
      "Priority Processing",
      "Dedicated Account Manager",
    ],
    cta: "Start Your Trial",
    ctaStyle: "solid" as const,
    action: "trial",
  },
  {
    id: "civic",
    hook: "Civic",
    monthlyPrice: null,
    annualMonthly: null,
    annualTotal: null,
    priceLabel: "Custom",
    trialTag: false,
    badge: null,
    description:
      "White-label city portals, on-site training, and dedicated infrastructure for organizations that define the standard.",
    specs: [
      "White-Label City Portals",
      "On-Site Training",
      "SLA Guarantee",
      "Dedicated Success Manager",
      "Custom Integrations",
    ],
    cta: "Contact Sales",
    ctaStyle: "ghost" as const,
    action: "contact",
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const createPortalSession = trpc.payment.createPortalSession.useMutation();

  const handleCTA = async (tier: (typeof TIERS)[0]) => {
    if (tier.action === "contact") {
      window.location.href = "mailto:clay@skyveedrones.com?subject=MAPIT%20Civic%20Inquiry";
      return;
    }
    if (user) {
      // Signed-in user → Stripe Customer Portal to upgrade/manage
      setPortalLoading(true);
      try {
        const result = await createPortalSession.mutateAsync();
        if (result.portalUrl) {
          window.open(result.portalUrl, "_blank");
        }
      } catch {
        toast.error("Failed to open billing portal. Please try again.");
      } finally {
        setPortalLoading(false);
      }
    } else {
      // Anonymous visitor → OAuth signup
      window.location.href = getLoginUrl();
    }
  };

  const isExpired = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('expired') === '1';

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ background: "#0A0A0A", fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
    >
      {/* ── Trial Expired Banner ── */}
      {isExpired && (
        <div
          className="flex items-center justify-center gap-3 px-6 py-3 text-sm font-medium"
          style={{ background: "rgba(239,68,68,0.12)", borderBottom: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Your complimentary experience has concluded. Upgrade to Precision to keep your projects.
        </div>
      )}
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors duration-200 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-white text-lg font-bold tracking-tight">
          MAP<span className="text-emerald-400">i</span>T
        </span>
        <div className="w-16" />
      </nav>

      {/* ── Hero ── */}
      <div className="text-center pt-16 pb-10 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="font-bold text-white mb-4"
          style={{ fontSize: "clamp(1.9rem, 4.5vw, 2.8rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}
        >
          Precision mapping for every scale
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="text-center max-w-lg mx-auto space-y-1"
        >
          <p className="text-white text-base leading-relaxed">Experience the complete platform.</p>
          <p className="text-white text-base leading-relaxed">Your first 14 days are complimentary.</p>
          <p className="text-white text-base leading-relaxed">No credit card required.</p>
        </motion.div>

        {/* Monthly / Annual Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.26 }}
          className="flex items-center justify-center gap-4 mt-9"
        >
          <span className={`text-sm font-medium transition-colors ${!annual ? "text-white" : "text-white/35"}`}>
            Monthly
          </span>
          <button
            onClick={() => setAnnual((v) => !v)}
            className="relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            style={{ background: annual ? "#10b981" : "rgba(255,255,255,0.15)" }}
            aria-label="Toggle billing period"
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300"
              style={{ transform: annual ? "translateX(24px)" : "translateX(0)" }}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${annual ? "text-white" : "text-white/35"}`}>
            Annual{" "}
            <span className="text-emerald-400 text-xs font-bold ml-1">Save 15%</span>
          </span>
        </motion.div>
      </div>

      {/* ── Four Monoliths ── */}
      <div className="flex-1 flex items-start justify-center px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full max-w-6xl">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 + i * 0.09 }}
              className="relative flex flex-col"
              style={{
                background: tier.badge
                  ? "rgba(16,185,129,0.055)"
                  : "rgba(255,255,255,0.028)",
                border: tier.badge
                  ? "1px solid rgba(16,185,129,0.28)"
                  : "1px solid rgba(255,255,255,0.10)",
                borderRadius: "20px",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                padding: "2rem 1.6rem 1.8rem",
              }}
            >
              {/* MOST POPULAR badge — absolute, outside content flow so it never pushes hook text down */}
              {tier.badge && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold tracking-widest whitespace-nowrap pointer-events-none"
                  style={{
                    background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                    color: "#fff",
                    letterSpacing: "0.12em",
                  }}
                >
                  {tier.badge}
                </div>
              )}

              {/* Hook — metallic gradient, no period. All four cards start here at the same Y. */}
              <p
                className="font-bold bg-clip-text text-transparent"
                style={{
                  fontSize: "clamp(1.55rem, 3vw, 1.9rem)",
                  letterSpacing: "-0.03em",
                  backgroundImage: METALLIC,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1.1,
                }}
              >
                {tier.hook}
              </p>

              {/* Price */}
              <div className="mt-3 mb-4 min-h-[3.5rem] flex flex-col justify-center">
                {tier.priceLabel ? (
                  <p
                    className="text-white font-bold"
                    style={{ fontSize: "2rem", letterSpacing: "-0.03em", lineHeight: 1 }}
                  >
                    {tier.priceLabel}
                  </p>
                ) : (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={annual ? "annual" : "monthly"}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.18 }}
                        className="text-white font-extrabold"
                        style={{ fontSize: "2.1rem", letterSpacing: "-0.04em", lineHeight: 1 }}
                      >
                        ${annual ? tier.annualMonthly!.toFixed(2) : tier.monthlyPrice}
                        <span className="text-white/35 text-sm font-normal ml-1">/mo</span>
                      </motion.p>
                    </AnimatePresence>
                    {annual && tier.annualTotal && (
                      <p className="text-white/30 text-xs mt-1">
                        Billed ${tier.annualTotal.toFixed(2)}/yr
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Description */}
              <p className="text-white/42 text-sm leading-relaxed mb-5">
                {tier.description}
              </p>

              {/* Specs */}
              <ul className="flex-1 space-y-2.5 mb-7">
                {tier.specs.map((spec) => (
                  <li key={spec} className="flex items-start gap-2.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white/62 text-sm">{spec}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleCTA(tier)}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
                style={
                  tier.ctaStyle === "solid"
                    ? { background: "#ffffff", color: "#0A0A0A" }
                    : {
                        background: "transparent",
                        color: "rgba(255,255,255,0.70)",
                        border: "1px solid rgba(255,255,255,0.20)",
                      }
                }
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  if (tier.ctaStyle === "solid") {
                    el.style.background = "#e5e7eb";
                  } else {
                    el.style.borderColor = "rgba(255,255,255,0.45)";
                    el.style.color = "#ffffff";
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  if (tier.ctaStyle === "solid") {
                    el.style.background = "#ffffff";
                  } else {
                    el.style.borderColor = "rgba(255,255,255,0.20)";
                    el.style.color = "rgba(255,255,255,0.70)";
                  }
                }}
              >
                  {portalLoading && tier.action !== "contact"
                  ? "Opening portal…"
                  : user && tier.action !== "contact"
                  ? "Manage Plan"
                  : tier.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Manage Billing footer link for signed-in users */}
      {user && (
        <div className="text-center pb-12">
          <button
            onClick={async () => {
              setPortalLoading(true);
              try {
                const result = await createPortalSession.mutateAsync();
                if (result.portalUrl) window.open(result.portalUrl, "_blank");
              } catch {
                toast.error("Failed to open billing portal.");
              } finally {
                setPortalLoading(false);
              }
            }}
            disabled={portalLoading}
            className="text-sm text-white/30 hover:text-white/70 underline underline-offset-4 transition-colors"
          >
            {portalLoading ? "Opening Stripe portal…" : "Manage Billing & Payment History →"}
          </button>
        </div>
      )}
    </div>
  );
}
