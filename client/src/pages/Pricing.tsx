/**
 * MAPIT Pricing — The Jobsian Invitation to Power
 * Three floating glassmorphic monoliths on pure black.
 * No clutter. No periods. No compromise.
 */

import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const METALLIC = "linear-gradient(160deg, #ffffff 0%, #d1d5db 45%, #6b7280 100%)";

const tiers = [
  {
    hook: "Experience",
    price: "Complimentary",
    priceNote: "14-day free trial",
    description:
      "Full access to the MAPIT engine for 14 days. Create your first digital twin and master the terrain without limits.",
    cta: "Start Mapping",
    ctaStyle: "solid",
    features: [
      "Unlimited GPS marker rendering",
      "Flight path visualization",
      "KML · CSV · GeoJSON export",
      "PDF map overlay",
      "Install as PWA",
    ],
    highlighted: false,
    trialFlow: true,
  },
  {
    hook: "Precision",
    price: "$149",
    priceNote: "per month",
    description:
      "For the dedicated engineer. Unlimited projects, advanced APWA utility overlays, and high-frequency data processing.",
    cta: "Get Started",
    ctaStyle: "solid",
    features: [
      "Everything in Experience",
      "Unlimited projects",
      "APWA utility overlays",
      "High-frequency data processing",
      "Priority rendering queue",
      "Team collaboration (up to 5)",
    ],
    highlighted: true,
    trialFlow: false,
  },
  {
    hook: "Dominance",
    price: "Custom",
    priceNote: "enterprise pricing",
    description:
      "Global scale. Custom integrations, white-label reporting, and dedicated infrastructure for organizations that shape the world.",
    cta: "Contact Us",
    ctaStyle: "ghost",
    features: [
      "Everything in Precision",
      "White-label reporting",
      "Custom integrations & API",
      "Dedicated infrastructure",
      "SLA & uptime guarantee",
      "Unlimited team members",
    ],
    highlighted: false,
    trialFlow: false,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.12 },
  }),
};

export default function Pricing() {
  const [, setLocation] = useLocation();

  const handleCTA = (tier: (typeof tiers)[0]) => {
    if (tier.trialFlow) {
      setLocation("/name");
    } else if (tier.ctaStyle === "ghost") {
      window.location.href = "mailto:hello@skyveedrones.com?subject=MAPIT%20Dominance%20Inquiry";
    } else {
      setLocation("/name");
    }
  };

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ background: "#0A0A0A", fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
    >
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/5">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors duration-200 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span
          className="text-white text-lg font-bold tracking-widest"
          style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
        >
          MAP<span className="text-emerald-400">i</span>T
        </span>
        <div className="w-16" /> {/* spacer */}
      </nav>

      {/* ── Hero ── */}
      <div className="text-center pt-20 pb-16 px-6">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-white/30 text-sm tracking-[0.25em] uppercase mb-6"
        >
          Choose your level of control
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="font-bold bg-clip-text text-transparent"
          style={{
            fontSize: "clamp(2.8rem, 7vw, 5rem)",
            letterSpacing: "-0.04em",
            lineHeight: 1.0,
            backgroundImage: METALLIC,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Precision mapping<br />for every scale
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-white/40 text-base max-w-md mx-auto leading-relaxed"
        >
          Every plan ships with a complimentary 14-day trial at full resolution. No credit card required.
        </motion.p>
      </div>

      {/* ── Three Monoliths ── */}
      <div className="flex-1 flex items-start justify-center px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.hook}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="relative flex flex-col"
              style={{
                background: tier.highlighted
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.025)",
                border: tier.highlighted
                  ? "1px solid rgba(255,255,255,0.18)"
                  : "1px solid rgba(255,255,255,0.10)",
                borderRadius: "20px",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                padding: "2.5rem 2rem",
              }}
            >
              {/* Highlighted badge */}
              {tier.highlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
                  style={{
                    background: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(16,185,129,0.35)",
                    color: "#10b981",
                  }}
                >
                  Most Popular
                </div>
              )}

              {/* Hook — metallic gradient, no period */}
              <p
                className="font-bold bg-clip-text text-transparent mb-1"
                style={{
                  fontSize: "clamp(2rem, 4.5vw, 2.75rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.0,
                  backgroundImage: METALLIC,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {tier.hook}
              </p>

              {/* Price */}
              <div className="mt-4 mb-5">
                <span
                  className="text-white font-semibold"
                  style={{ fontSize: tier.price === "Complimentary" ? "1.25rem" : "2rem", letterSpacing: "-0.02em" }}
                >
                  {tier.price}
                </span>
                <span className="text-white/30 text-sm ml-2">{tier.priceNote}</span>
              </div>

              {/* Description */}
              <p className="text-white/55 text-sm leading-relaxed mb-7">
                {tier.description}
              </p>

              {/* Feature list */}
              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleCTA(tier)}
                className="w-full py-3.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200"
                style={
                  tier.ctaStyle === "solid"
                    ? {
                        background: "#ffffff",
                        color: "#0A0A0A",
                      }
                    : {
                        background: "transparent",
                        color: "rgba(255,255,255,0.70)",
                        border: "1px solid rgba(255,255,255,0.20)",
                      }
                }
                onMouseEnter={(e) => {
                  if (tier.ctaStyle === "solid") {
                    (e.currentTarget as HTMLButtonElement).style.background = "#e5e7eb";
                  } else {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.50)";
                    (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (tier.ctaStyle === "solid") {
                    (e.currentTarget as HTMLButtonElement).style.background = "#ffffff";
                  } else {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.20)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.70)";
                  }
                }}
              >
                {tier.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Footer note ── */}
      <div className="text-center pb-12 text-white/20 text-xs tracking-wide">
        All plans include SSL, 99.9% uptime, and MAPIT's full GPS rendering engine
      </div>
    </div>
  );
}
