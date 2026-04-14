/**
 * Municipal Solutions Landing Page — Jobsian Rewrite
 * Design: Pure black (#0A0A0A), stark white, MAPIT Green (#00C853) reserved for CTA + product name only.
 * Copy: Jobs-style — name the pain, deliver the promise, one door.
 */

import { Button } from "@/components/ui/button";
import { PilotProgramModal } from "@/components/PilotProgramModal";
import Footer from "@/components/Footer";
import { GlobalHamburgerHeader } from "@/components/GlobalHamburgerHeader";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/municipal-hero-aerial_0ce36c3a.jpg";
const TRENCH_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/muni-card-subsurface-XheCyMcVLXCFkjdcG9yGnT.webp";
const DIGITAL_TWIN_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/muni-card-interdept-3mR7B9wUkt5ZFwjKKdLgCB.webp";
const GIS_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/muni-card-overlay-3nmwWrVxQ8Zqmu4hBtuZ8r.webp";
const ACCOUNTABILITY_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/muni-card-accountability-QNNJ3wMUutMTCmeXaRCJqc.webp";

// APWA Uniform Color Code palette
const APWA_COLORS = [
  { label: "Potable Water",    hex: "#0057FF", name: "Blue"   },
  { label: "Sewers / Drain",   hex: "#00CC44", name: "Green"  },
  { label: "Electric",         hex: "#FF2222", name: "Red"    },
  { label: "Gas / Oil",        hex: "#FFE500", name: "Yellow" },
  { label: "Comm / Signal",    hex: "#FF8C00", name: "Orange" },
  { label: "Survey",           hex: "#FF1493", name: "Pink"   },
  { label: "Excavation",       hex: "#FFFFFF", name: "White"  },
  { label: "Reclaimed Water",  hex: "#A020F0", name: "Purple" },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const outcomeCards = [
  {
    headline: "Every department. One map.",
    body: "Public Works, Engineering, and City Council all see the same aerial record — in real time. No data silos. No version conflicts.",
    image: DIGITAL_TWIN_IMG,
  },
  {
    headline: "No utility strike goes undocumented.",
    body: "Overlay your existing utility drawings on live drone imagery. Know exactly what's there before you dig.",
    image: TRENCH_IMG,
  },
  {
    headline: "Plans meet reality.",
    body: "Verify construction alignment against design plans with centimeter-level precision using our 2-point calibration engine.",
    image: GIS_IMG,
  },
  {
    headline: "Your record. Forever.",
    body: "Every flight is archived. Every project has a before, during, and after. Admissible in court. Presentable to City Council.",
    image: ACCOUNTABILITY_IMG,
  },
];

export default function Municipal() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-y-auto">
      <GlobalHamburgerHeader />

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Full-bleed aerial photo */}
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#0A0A0A]" />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 max-w-3xl mx-auto px-6 text-center"
        >
          <motion.p
            variants={fadeInUp}
            className="text-sm font-semibold tracking-[0.25em] uppercase text-white/50 mb-8"
          >
            For Municipal Leaders
          </motion.p>

          <motion.h1
            variants={fadeInUp}
            className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-8"
          >
            Your city.{" "}
            <span className="text-[#00C853]">Documented.</span>
            <br />
            From above.
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-xl text-white/60 max-w-xl mx-auto mb-12 leading-relaxed"
          >
            MAPIT provides every department with a live aerial record of every project—roads, utilities, and infrastructure—updated directly from the sky.
          </motion.p>

          <motion.div variants={fadeInUp}>
            <a
              href="/#map-begins-here"
              className="inline-flex items-center gap-2 bg-[#00C853] hover:bg-[#00b548] text-black font-bold px-10 py-6 text-base rounded-full shadow-lg shadow-[#00C853]/20 transition-colors"
            >
              See Your City From Above
              <ChevronRight className="ml-2 h-5 w-5" />
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── APWA COLORIZATION ─── */}
      <section className="w-full bg-[#0A0A0A] py-32 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {/* Headline */}
            <motion.div variants={fadeInUp} className="mb-20 max-w-3xl">
              <p className="text-sm font-semibold tracking-[0.25em] uppercase text-[#00C853]/70 mb-6">
                New Feature
              </p>
              <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-8">
                Black and white
                <br />
                is dead.
              </h2>
              <p className="text-xl text-white/60 leading-relaxed max-w-2xl">
                One click. Every pipe, wire, and trench instantly translated from a faded PDF into the APWA Uniform Color
                Code. Just glowing, unmistakable truth.
              </p>
            </motion.div>

            {/* APWA Color Palette — edge-to-edge swatches */}
            <motion.div
              variants={stagger}
              className="grid grid-cols-4 sm:grid-cols-8 gap-0 rounded-2xl overflow-hidden border border-white/5"
            >
              {APWA_COLORS.map((color) => (
                <motion.div
                  key={color.hex}
                  variants={fadeInUp}
                  className="group relative flex flex-col items-center justify-end py-8 px-2 cursor-default transition-all duration-300"
                  style={{ backgroundColor: color.hex === "#FFFFFF" ? "#1a1a1a" : `${color.hex}18` }}
                >
                  {/* Glow bar at top */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-2"
                    style={{ backgroundColor: color.hex }}
                  />
                  {/* Color dot */}
                  <div
                    className="w-10 h-10 rounded-full mb-4 shadow-lg transition-transform duration-300 group-hover:scale-125"
                    style={{
                      backgroundColor: color.hex,
                      boxShadow: `0 0 20px ${color.hex}60`,
                    }}
                  />
                  <p className="text-[10px] font-bold tracking-widest uppercase text-white/80 text-center leading-tight">
                    {color.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* Supporting statement */}
            <motion.p
              variants={fadeInUp}
              className="mt-12 text-sm text-white/30 tracking-wide text-center"
            >
              APWA Uniform Color Code — the industry standard for underground utility identification
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ─── THE PAIN ─── */}
      <section className="py-32 px-6 bg-[#0A0A0A]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-12"
            >
              Your city has $40M in underground utilities.
              <br />
              <span className="text-white/40">You're managing them with a PDF from 2009.</span>
            </motion.h2>

            <motion.div variants={fadeInUp} className="border-t border-white/10 pt-12">
              <p className="text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
                When a crew hits an unmarked utility line, it costs $50,000 and two weeks. Every time. Most
                municipalities rely on fragmented data and aging paper plans — and nobody in City Hall knows it until
                something goes wrong. MAPIT is a live aerial map of your active projects, overlaid with your utility
                drawings, accessible by every department. Updated after every flight. No consultants. No delays. No excuses.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── OUTCOME CARDS ─── */}
      <section id="outcomes" className="py-24 px-6 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.p
              variants={fadeInUp}
              className="text-sm font-semibold tracking-[0.25em] uppercase text-white/30 mb-16"
            >
              What MAPIT Does
            </motion.p>

            <div className="grid md:grid-cols-2 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
              {outcomeCards.map((card) => (
                <motion.div
                  key={card.headline}
                  variants={fadeInUp}
                  className="group bg-[#0A0A0A] p-0 overflow-hidden relative"
                >
                  {/* Image */}
                  <div className="h-56 overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.headline}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-70 group-hover:opacity-90"
                    />
                  </div>
                  {/* Text */}
                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-white mb-3 leading-tight">{card.headline}</h3>
                    <p className="text-white/50 leading-relaxed">{card.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── COMPLIANCE — quiet, below the desire ─── */}
      <section className="py-24 px-6 bg-[#0A0A0A] border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.p variants={fadeInUp} className="text-sm text-white/25 tracking-widest uppercase mb-6">
              Built for Government Standards
            </motion.p>
            <motion.p variants={fadeInUp} className="text-white/40 text-base leading-relaxed">
              US-based cloud storage &nbsp;·&nbsp; ArcGIS / AutoCAD export &nbsp;·&nbsp; Part 107 certified pilots
              &nbsp;·&nbsp; FAA compliant &nbsp;·&nbsp; Comprehensive liability insurance
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ─── ENCAPSULATION + CTA ─── */}
      <section className="py-40 px-6 bg-[#0A0A0A] relative overflow-hidden">
        {/* Subtle green ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-[#00C853]/5 blur-[120px]" />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-12"
          >
            MAPIT is the first time a city director can open a laptop and see exactly what is happening on every job
            site —{" "}
            <span className="text-[#00C853]">right now.</span>
          </motion.h2>

          <motion.div variants={fadeInUp}>
            <Button
              size="lg"
              className="bg-[#00C853] hover:bg-[#00b548] text-black font-bold px-12 py-7 text-lg rounded-full shadow-lg shadow-[#00C853]/20"
              onClick={() => setContactOpen(true)}
            >
              Request the Municipal Pilot Program
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>

          <motion.p variants={fadeInUp} className="mt-8 text-sm text-white/25">
            Municipal Pilot Program &nbsp;·&nbsp; No commitment required
          </motion.p>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <Footer onContactClick={() => setContactOpen(true)} />

      {/* ─── Modal ─── */}
      <PilotProgramModal open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
