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
      <section id="map-begins-here" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Full-bleed video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/hero_background_new_fe49dcb4.mp4"
            type="video/mp4"
          />
        </video>
        {/* Overlay — dark at top for nav legibility, fades to #0A0A0A at bottom */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#0A0A0A]" />

        {/* Hero content — headline + single CTA, nothing else */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-20 max-w-3xl mx-auto px-6 text-center"
          style={{ paddingTop: '60px' }}
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
          <motion.p variants={fadeInUp} className="mt-4 text-sm text-white/40 text-center">
            Drop one photo. See your map. Your 14-day trial starts instantly. No credit card required.
          </motion.p>
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

            <motion.div variants={fadeInUp} className="mt-12">
              <a
                href="/municipal"
                className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-full text-base hover:bg-gray-100 transition-colors shadow-lg"
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
            <div className="grid md:grid-cols-3 divide-x divide-white/5 border border-white/5 rounded-2xl">
              {/* Card 1 */}
              <motion.div variants={fadeInUp} className="bg-[#0A0A0A] p-10 flex flex-col justify-between overflow-hidden">
                <p
                  className="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tighter leading-none mb-8 bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #4b5563)" }}
                >
                  1cm
                </p>
                <div>
                  <h3 className="text-xl font-bold text-white mb-3 leading-tight">Perfect clarity.</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Interactive maps built with centimeter-level accuracy, ready to share in minutes.</p>
                </div>
              </motion.div>

              {/* Card 2 */}
              <motion.div variants={fadeInUp} className="bg-[#0A0A0A] p-10 flex flex-col justify-between overflow-hidden">
                <p
                  className="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tighter leading-none mb-8 bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #4b5563)" }}
                >
                  Universal.
                </p>
                <div>
                  <h3 className="text-xl font-bold text-white mb-3 leading-tight">Your data. Any format.</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">KML, CSV, GeoJSON, GPX — one click, every tool.</p>
                </div>
              </motion.div>

              {/* Card 3 */}
              <motion.div variants={fadeInUp} className="bg-[#0A0A0A] p-10 flex flex-col justify-between overflow-hidden">
                <p
                  className="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tighter leading-none mb-8 bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #4b5563)" }}
                >
                  2-Point.
                </p>
                <div>
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
              onClick={() => setLocation("/pricing")}
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
