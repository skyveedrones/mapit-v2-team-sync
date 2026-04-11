/**
 * MAPIT - Home Page — Jobsian Rewrite
 * Design: Pure black (#0A0A0A), stark white, MAPIT Green (#00C853) reserved for CTA + product name only.
 * Copy: Jobs-style — name the feeling, one door, no jargon.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { GlobalHamburgerHeader } from "@/components/GlobalHamburgerHeader";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const fadeInUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

// 3 cards only — 4-word headline + one sentence each
const featureCards = [
  {
    headline: "See every inch.",
    body: "Interactive maps built from your footage, ready to share in minutes.",
  },
  {
    headline: "Your data. Any format.",
    body: "KML, CSV, GeoJSON, GPX — one click, every tool.",
  },
  {
    headline: "Plans meet reality.",
    body: "Drop utility drawings onto live aerial maps. Align them with two points.",
  },
];

// 3-step workflow — human action, not software function
const workflowSteps = [
  {
    number: "01",
    label: "Fly",
    body: "Take the shot. That's your only job.",
  },
  {
    number: "02",
    label: "MAPIT",
    body: "GPS, flight paths, and metadata — extracted in seconds.",
  },
  {
    number: "03",
    label: "Share",
    body: "A live map your whole team can see. No GIS degree required.",
  },
];

export default function Home() {
  const [showContactModal, setShowContactModal] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "MAPIT — Your job site. From above. In minutes.";
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-y-auto">
      <GlobalHamburgerHeader />

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Full-bleed video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/VideoProject_e838c8e5.mp4"
            type="video/mp4"
          />
        </video>
        {/* Gradient overlay — dark at top for nav, fades to #0A0A0A at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-[#0A0A0A]" />

        {/* Hero content — headline + single CTA, nothing else */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-20 max-w-3xl mx-auto px-6 text-center"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-8 text-white"
            style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
          >
            <span className="block">Your job site.</span>
            <span className="block">From above.</span>
            <span className="block">In minutes.</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-xl text-gray-300 max-w-xl mx-auto mb-12 leading-relaxed"
          >
            MAPIT turns drone footage into interactive maps, GPS exports, and utility overlays — automatically.
          </motion.p>

          <motion.div variants={fadeInUp}>
            <Button
              size="lg"
              className="bg-[#00C853] hover:bg-[#00b548] text-black font-bold px-10 py-6 text-base rounded-full shadow-lg shadow-[#00C853]/20"
              onClick={() => setLocation("/welcome")}
            >
              Start Mapping Free
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── 3-STEP WORKFLOW ─── */}
      <section className="py-32 px-6 bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl sm:text-5xl font-bold tracking-tight text-center mb-20"
            >
              Three steps. Zero complexity.
            </motion.h2>

            <div className="grid md:grid-cols-3 gap-16">
              {workflowSteps.map((step) => (
                <motion.div
                  key={step.label}
                  variants={fadeInUp}
                  className="text-center"
                >
                  <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/30 mb-4">
                    {step.number}
                  </p>
                  <h3 className="text-3xl font-bold text-white mb-4">{step.label}</h3>
                  <p className="text-gray-400 text-base leading-relaxed">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── MUNICIPAL GATEWAY ─── */}
      <section className="py-32 px-6 bg-[#0A0A0A] border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-8"
            >
              Cities don't have time
              <br />
              to wait for paper maps.
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto mb-12"
            >
              MAPIT gives municipal teams a live digital record of every project — roads, utilities,
              infrastructure — updated from the air. No consultants. No delays. No excuses.
            </motion.p>

            <motion.div variants={fadeInUp}>
              <a
                href="/municipal"
                className="inline-flex items-center gap-2 text-white/60 hover:text-white text-base font-semibold transition-colors"
              >
                Explore Municipal Solutions <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── 3-CARD FEATURE GRID ─── */}
      <section id="features" className="py-24 px-6 bg-[#0A0A0A] border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <div className="grid md:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
              {/* Card 1 — Topographic grid with pulsing drone dot */}
              <motion.div variants={fadeInUp} className="group bg-[#0A0A0A] overflow-hidden">
                <div
                  className="h-48 relative overflow-hidden"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                    backgroundColor: "#0A0A0A",
                  }}
                >
                  {/* Radial vignette */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#0A0A0A_100%)]" />
                  {/* Pulsing drone dot */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                  </div>
                  {/* Glow halo */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-emerald-500/10 blur-xl" />
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-bold text-white mb-3 leading-tight">See every inch.</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Interactive maps built from your footage, ready to share in minutes.</p>
                </div>
              </motion.div>

              {/* Card 2 — Glassmorphic format pills */}
              <motion.div variants={fadeInUp} className="group bg-[#0A0A0A] overflow-hidden">
                <div className="h-48 relative overflow-hidden bg-[#0A0A0A] flex flex-wrap items-center justify-center gap-3 p-6">
                  {[".KML", ".CSV", ".GeoJSON", ".GPX", ".KMZ"].map((fmt) => (
                    <div
                      key={fmt}
                      className="px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-white text-xs font-mono font-semibold tracking-wider shadow-lg"
                    >
                      {fmt}
                    </div>
                  ))}
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-bold text-white mb-3 leading-tight">Your data. Any format.</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">KML, CSV, GeoJSON, GPX — one click, every tool.</p>
                </div>
              </motion.div>

              {/* Card 3 — X-Ray APWA glowing lines */}
              <motion.div variants={fadeInUp} className="group bg-[#0A0A0A] overflow-hidden">
                <div className="h-48 relative overflow-hidden bg-black">
                  {/* Electric — red */}
                  <div
                    className="absolute"
                    style={{
                      top: "30%",
                      left: 0,
                      right: 0,
                      height: "1.5px",
                      background: "linear-gradient(90deg, transparent 0%, #FF2222 30%, #FF2222 70%, transparent 100%)",
                      boxShadow: "0 0 8px 2px rgba(255,34,34,0.5)",
                    }}
                  />
                  {/* Gas / Oil — yellow */}
                  <div
                    className="absolute"
                    style={{
                      top: "52%",
                      left: 0,
                      right: 0,
                      height: "1.5px",
                      background: "linear-gradient(90deg, transparent 0%, #FFE500 30%, #FFE500 70%, transparent 100%)",
                      boxShadow: "0 0 8px 2px rgba(255,229,0,0.5)",
                    }}
                  />
                  {/* Potable Water — blue */}
                  <div
                    className="absolute"
                    style={{
                      top: "72%",
                      left: 0,
                      right: 0,
                      height: "1.5px",
                      background: "linear-gradient(90deg, transparent 0%, #0057FF 30%, #0057FF 70%, transparent 100%)",
                      boxShadow: "0 0 8px 2px rgba(0,87,255,0.5)",
                    }}
                  />
                  {/* Vignette */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#000_100%)]" />
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-bold text-white mb-3 leading-tight">Plans meet reality.</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Drop utility drawings onto live aerial maps. Align them with two points.</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── SINGLE CTA ─── */}
      <section className="py-40 px-6 bg-[#0A0A0A] relative overflow-hidden border-t border-white/5">
        {/* Subtle green ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-[#00C853]/5 blur-[120px]" />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-5xl sm:text-6xl font-bold tracking-tight mb-12"
          >
            The map is waiting.
          </motion.h2>

          <motion.div variants={fadeInUp}>
            <Button
              size="lg"
              className="bg-[#00C853] hover:bg-[#00b548] text-black font-bold px-12 py-7 text-lg rounded-full shadow-lg shadow-[#00C853]/20"
              onClick={() => setLocation("/welcome")}
            >
              Start for free
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>

          <motion.p variants={fadeInUp} className="mt-8 text-sm text-white/25">
            No credit card required &nbsp;·&nbsp; Works with any drone
          </motion.p>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <Footer onContactClick={() => setShowContactModal(true)} />

      {/* Contact Modal */}
      <ContactModal open={showContactModal} onOpenChange={setShowContactModal} />
    </div>
  );
}
