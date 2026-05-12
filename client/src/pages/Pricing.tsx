/**
 * MAPIT Pricing — 4-Tier Jobsian Invitation to Power
 * Experience / Precision / Scale / Civic
 * Pure black, glassmorphic monoliths, monthly/annual toggle.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { GlobalHamburgerHeader } from "@/components/GlobalHamburgerHeader";

// Tier id → Stripe price IDs (mirrors server/products.ts)
const TIER_PRICE_IDS: Record<string, { monthly: string; annual: string } | null> = {
  experience: { monthly: "price_1TEhGLFY0MJy267nhoeWOHRG", annual: "price_1TEhGKFY0MJy267njMe7iATP" },
  precision:  { monthly: "price_1TEhGLFY0MJy267nPDaXRmgc", annual: "price_1TEhGLFY0MJy267nIy2dOIwV" },
  scale:      { monthly: "price_1TEhGLFY0MJy267neXSemGb5", annual: "price_1TEhGKFY0MJy267nNUiqaxJ3" },
  civic:      null,
};

// Map subscriptionTier DB key → pricing page tier id
const TIER_KEY_MAP: Record<string, string> = {
  starter: "experience",
  professional: "precision",
  business: "scale",
  enterprise: "civic",
  free: "free",
};

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
      "Full access to the MAPIT engine for 14 days. Build your first digital twin and master the terrain.",
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
      "For the dedicated engineer. Unlimited projects and advanced APWA overlays.",
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
      "Unlimited projects, API access, and priority processing for teams that operate at a global scale.",
    specs: [
      "1.5 TB Storage",
      "Unlimited Stakeholder Viewing",
      "API Access",
      "Priority Processing",
      "Dedicated Account Manager",
      "Smart Survey Integration",
    ],
    specTooltips: {
      "Smart Survey Integration": "Digitize engineering surveys instantly. Includes single point entry, batch CSV/XLS uploads, and PDF OCR data extraction.",
    } as Record<string, string>,
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
      "White-label city portals, on-site training, and dedicated infrastructure for those who define the standard.",
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
  const [loadingTierId, setLoadingTierId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const createPortalSession = trpc.payment.createPortalSession.useMutation();
  const createCheckoutSession = trpc.payment.createCheckoutSession.useMutation();

  // Determine the user's current plan tier id on this page
  const currentTierId = user ? (TIER_KEY_MAP[(user as any).subscriptionTier] ?? "free") : null;
  const hasActiveSubscription = !!(user && (user as any).stripeSubscriptionId);

  const handleCTA = async (tier: (typeof TIERS)[0]) => {
    if (tier.action === "contact") {
      window.location.href = "mailto:clay@skyveedrones.com?subject=MAPIT%20Civic%20Inquiry";
      return;
    }
    if (!user) {
      // Anonymous visitor → store checkout intent, then route to /signup
      const priceIds = TIER_PRICE_IDS[tier.id];
      if (priceIds) {
        const priceId = annual ? priceIds.annual : priceIds.monthly;
        sessionStorage.setItem(
          "checkoutIntent",
          JSON.stringify({
            priceId,
            planId: tier.id,
            planName: tier.hook,
            billingPeriod: annual ? "annual" : "monthly",
          })
        );
      }
      setLocation("/signup");
      return;
    }
    // Current plan — no-op
    if (tier.id === currentTierId) return;

    setLoadingTierId(tier.id);
    try {
      if (hasActiveSubscription) {
        // Active subscriber → Stripe Customer Portal to change plan
        const result = await createPortalSession.mutateAsync();
        if (result.portalUrl) window.open(result.portalUrl, "_blank");
      } else {
        // No subscription → Stripe Checkout to start a plan
        const priceIds = TIER_PRICE_IDS[tier.id];
        if (!priceIds) {
          toast.error("No price configured for this plan.");
          return;
        }
        const priceId = annual ? priceIds.annual : priceIds.monthly;
        const result = await createCheckoutSession.mutateAsync({ priceId, planId: tier.id });
        if (result.checkoutUrl) window.open(result.checkoutUrl, "_blank");
      }
    } catch {
      toast.error("No active subscription found. Please select a plan to get started.");
    } finally {
      setLoadingTierId(null);
    }
  };

  const isExpired = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('expired') === '1';

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ background: "#0A0A0A", fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
    >
      <GlobalHamburgerHeader />
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
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors duration-200 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          ← Back to MAPIT
        </button>
        <div className="w-16" />
        <div className="w-16" />
      </nav>

      {/* ── Hero ── */}
      <div className="relative text-center pb-10 px-6 overflow-hidden" style={{ paddingTop: 'calc(4rem + 60px)' }}>
        {/* Subtle background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-[#00e676] opacity-[0.03] blur-[120px] rounded-full"></div>
        </div>

        <div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="font-bold text-white mb-6"
            style={{ fontSize: "clamp(2.5rem, 6vw, 3.5rem)", letterSpacing: "-0.03em", lineHeight: 1.2 }}
          >
            Infinite scale.<br />
            <span className="text-slate-400">Simple pricing.</span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14 }}
            className="text-center max-w-2xl mx-auto"
          >
            <p className="text-white/70 text-lg leading-relaxed">Experience the complete platform risk-free. Your first 14 days are on us.</p>
          </motion.div>
        </div>

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
                      {annual ? (
                        <motion.div
                          key="annual"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          transition={{ duration: 0.18 }}
                        >
                          <p
                            className="text-white font-extrabold"
                            style={{ fontSize: "2.1rem", letterSpacing: "-0.04em", lineHeight: 1 }}
                          >
                            ${tier.annualTotal!.toFixed(2)}
                            <span className="text-white/35 text-sm font-normal ml-1">/yr</span>
                          </p>
                          <p className="text-emerald-400 text-sm font-semibold mt-2">
                            Save ${(tier.monthlyPrice! * 12 - tier.annualTotal!).toFixed(2)}/yr
                          </p>
                        </motion.div>
                      ) : (
                        <motion.p
                          key="monthly"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          transition={{ duration: 0.18 }}
                          className="text-white font-extrabold"
                          style={{ fontSize: "2.1rem", letterSpacing: "-0.04em", lineHeight: 1 }}
                        >
                          ${tier.monthlyPrice}
                          <span className="text-white/35 text-sm font-normal ml-1">/mo</span>
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>

              {/* Description */}
              <p className={`text-sm leading-[1.5] mb-5 line-clamp-4 ${tier.badge ? 'text-white' : 'text-white/42'}`} style={{ minHeight: '6em' }}>
                {tier.description}
              </p>

              {/* Specs */}
              <ul className="flex-1 space-y-2.5 mb-7">
                {tier.specs.map((spec) => {
                  const tooltip = (tier as any).specTooltips?.[spec];
                  return (
                    <li key={spec} className="flex items-start gap-2.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {tooltip ? (
                        <span className="text-white/62 text-sm group relative cursor-default">
                          {spec}
                          <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/10 text-white/50 text-[9px] font-bold leading-none align-middle">i</span>
                          <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 rounded-lg bg-[#1a1a1a] border border-white/10 px-3 py-2 text-xs text-white/70 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-xl">
                            {tooltip}
                          </span>
                        </span>
                      ) : (
                        <span className="text-white/62 text-sm">{spec}</span>
                      )}
                    </li>
                  );
                })}
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
                  {loadingTierId === tier.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Opening…
                    </span>
                  ) : tier.id === currentTierId ? (
                    "Current Plan"
                  ) : user && tier.action !== "contact" ? (
                    hasActiveSubscription ? "Upgrade Plan" : "Start Your Trial"
                  ) : (
                    tier.cta
                  )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Manage Billing footer link for signed-in users with active subscription */}
      {user && hasActiveSubscription && (
        <div className="text-center pb-12">
          <button
            onClick={async () => {
              setLoadingTierId("portal");
              try {
                const result = await createPortalSession.mutateAsync();
                if (result.portalUrl) window.open(result.portalUrl, "_blank");
              } catch {
                toast.error("Failed to open billing portal.");
              } finally {
                setLoadingTierId(null);
              }
            }}
            disabled={loadingTierId === "portal"}
            className="text-sm text-white/30 hover:text-white/70 underline underline-offset-4 transition-colors"
          >
            {loadingTierId === "portal" ? "Opening Stripe portal…" : "Manage Billing & Payment History →"}
          </button>
        </div>
      )}
    </div>
  );
}
