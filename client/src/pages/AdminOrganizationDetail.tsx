/**
 * Organization Management — Civic Tier Preview
 * Dark glassmorphic layout matching the map HUD aesthetic.
 */

import { ArrowLeft, Building2, Users, FolderOpen, Receipt, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: Users,
    title: "Team Roles",
    description:
      "Assign pilots, analysts, and viewers with granular permission controls. Every team member sees exactly what they need — nothing more.",
  },
  {
    icon: FolderOpen,
    title: "Shared Assets",
    description:
      "One central library for all company drone data. Projects, overlays, and exports — organized, versioned, and accessible to your entire fleet.",
  },
  {
    icon: Receipt,
    title: "Enterprise Billing",
    description:
      "Unified invoicing for your entire organization. One invoice, one line item, zero friction — built for finance teams and procurement workflows.",
  },
];

export default function AdminOrganizationDetail({ id: _id }: { id?: string }) {
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #0f1a14 50%, #0a0a0a 100%)",
        fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      <nav className="flex items-center px-8 py-5 border-b border-white/5">
        <button
          onClick={() => navigate("/account")}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors duration-200 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Account
        </button>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="w-full max-w-3xl"
        >
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(16,185,129,0.10)",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <Building2 className="w-7 h-7 text-emerald-400" />
            </div>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
              style={{
                background: "rgba(234,179,8,0.12)",
                border: "1px solid rgba(234,179,8,0.30)",
                color: "#fbbf24",
              }}
            >
              Coming Soon
            </span>
          </div>

          <h1
            className="font-bold text-white mb-3"
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Organization Management
          </h1>
          <p className="text-white/45 text-base leading-relaxed mb-12 max-w-xl">
            The Civic tier transforms MAPIT into a command center for your entire
            organization — from the flight deck to the boardroom.
          </p>

          <div className="grid gap-4 sm:grid-cols-3 mb-12">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 + i * 0.1 }}
                className="relative flex flex-col gap-3 p-5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.028)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <div
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <Lock className="w-3 h-3 text-white/30" />
                </div>

                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.18)",
                  }}
                >
                  <feature.icon className="text-emerald-400" style={{ width: "1.1rem", height: "1.1rem" }} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{feature.title}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => {
                window.location.href =
                  "mailto:clay@skyveedrones.com?subject=MAPIT%20Civic%20Tier%20Inquiry&body=Hi%2C%20I%27m%20interested%20in%20learning%20more%20about%20the%20Civic%20tier%20for%20my%20organization.";
              }}
              className="px-8 py-3.5 rounded-xl font-semibold text-sm text-black transition-all duration-200 active:scale-[0.98] hover:opacity-90"
              style={{ background: "#ffffff" }}
            >
              Inquire About Civic Tier
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="px-8 py-3.5 rounded-xl font-semibold text-sm text-white/60 hover:text-white transition-colors duration-200"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              View All Plans
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
