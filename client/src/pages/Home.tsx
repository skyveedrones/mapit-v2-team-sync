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
import { ChevronRight, Map, Download, Layers } from "lucide-react";
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
    icon: Map,
    headline: "See every inch.",
    body: "Interactive maps built from your footage, ready to share in minutes.",
    image: "/images/feature-maps-new.jpg",
  },
  {
    icon: Download,
    headline: "Your data. Any format.",
    body: "KML, CSV, GeoJSON, GPX — one click, every tool.",
    image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663204719166/gkNBTHRsPHDBWczp.png",
  },
  {
    icon: Layers,
    headline: "Plans meet reality.",
    body: "Drop utility drawings onto live aerial maps. Align them with two points.",
    image: "/images/feature-overlay-new.jpg",
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
          className="relative z-10 max-w-3xl mx-auto px-6 text-center"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-8"
          >
            Your job site.{" "}
            <span className="text-[#00C853]">From above.</span>
            <br />
            In minutes.
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

            <div className="grid md:grid-cols-3 gap-0 border border-white/5 rounded-2xl overflow-hidden">
              {workflowSteps.map((step, i) => (
                <motion.div
                  key={step.label}
                  variants={fadeInUp}
                  className={`p-10 bg-[#0A0A0A] ${
                    i < workflowSteps.length - 1
                      ? "border-b md:border-b-0 md:border-r border-white/5"
                      : ""
                  }`}
                >
                  <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#00C853]/70 mb-4">
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
              {featureCards.map((card) => (
                <motion.div
                  key={card.headline}
                  variants={fadeInUp}
                  className="group bg-[#0A0A0A] overflow-hidden"
                >
                  {/* Image */}
                  <div className="h-48 overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.headline}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-all duration-700 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  {/* Text */}
                  <div className="p-8">
                    <h3 className="text-xl font-bold text-white mb-3 leading-tight">
                      {card.headline}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{card.body}</p>
                  </div>
                </motion.div>
              ))}
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
