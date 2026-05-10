/**
 * Municipal Solutions — Jobsian Vertical Scroll-Story
 * Design: Pure black (#0A0A0A), white text, slate-gray secondary, green #00e676 accents
 * Structure: 7 sections building a narrative arc from problem to solution to action
 */

import { motion } from "framer-motion";
import { ChevronRight, Building2, Users, Shield, ChevronDown, Hammer } from "lucide-react";
import { useState, useRef } from "react";
import { useScroll, useTransform } from "framer-motion";
import { GlobalHamburgerHeader } from "@/components/GlobalHamburgerHeader";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { MunicipalBriefingForm } from "@/components/MunicipalBriefingForm";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/municipal-hero-aerial_0ce36c3a.jpg";
const INFRASTRUCTURE_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/muni-card-subsurface-XheCyMcVLXCFkjdcG9yGnT.webp";

export default function Municipal() {
  const [, setLocation] = useLocation();
  const [briefingFormOpen, setBriefingFormOpen] = useState(false);
  const infrastructureRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: infrastructureRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-hidden">
      <GlobalHamburgerHeader />

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: HERO — "Your entire city. Live from above."
          ═══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative w-full h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Full-bleed video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/manus-storage/MunicipalHeroVideo_6ac18ae2.mp4" type="video/mp4" />
        </video>
        {/* Overlay — dark at top for nav legibility, fades to #0A0A0A at bottom */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#0A0A0A]" />

        {/* Green glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[800px] bg-[#00e676] opacity-[0.02] blur-[150px] rounded-full" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="font-bold text-white mb-6"
            style={{
              fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            A perfect digital twin of your entire city.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-300 text-lg md:text-xl mb-8 max-w-3xl mx-auto"
          >
            Real-time aerial intelligence for every department.<br className="hidden md:block" /> One platform. One unified source of truth.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onClick={() => setBriefingFormOpen(true)}
            className="inline-flex items-center gap-2 bg-[#00e676] text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-[#00b548] transition-all duration-300 shadow-lg shadow-[#00e676]/20"
          >
            Start Municipal Pilot
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: THE CONTRAST — "The Old Way" vs "The MAPIT Way"
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-32 px-6 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-white mb-16 text-center"
          >
            The Problem. The Solution.
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-12">
            {/* The Old Way */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl border border-red-500/20 bg-red-500/5"
            >
              <h3 className="text-2xl font-bold text-red-400 mb-6">The Old Way</h3>
              <ul className="space-y-4 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-bold mt-1">✕</span>
                  <span>Departments work in silos with outdated maps</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-bold mt-1">✕</span>
                  <span>Manual data entry and spreadsheet chaos</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-bold mt-1">✕</span>
                  <span>Delays in emergency response and planning</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-bold mt-1">✕</span>
                  <span>No real-time visibility into infrastructure</span>
                </li>
              </ul>
            </motion.div>

            {/* The MAPIT Way */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl border border-[#00e676]/30 bg-[#00e676]/5"
            >
              <h3 className="text-2xl font-bold text-[#00e676] mb-6">The MAPIT Way</h3>
              <ul className="space-y-4 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-[#00e676] font-bold mt-1">✓</span>
                  <span>One unified map. All departments. Real-time.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#00e676] font-bold mt-1">✓</span>
                  <span>Automatic data capture and verification</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#00e676] font-bold mt-1">✓</span>
                  <span>Faster response times. Better coordination.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#00e676] font-bold mt-1">✓</span>
                  <span>Complete infrastructure visibility at your fingertips</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3: THE IMPACT — "50% Cost Reduction"
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-40 px-6 bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
        {/* Green glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-[#00e676] opacity-[0.04] blur-[120px] rounded-full" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="relative z-10 text-center max-w-3xl"
        >
          <p className="text-slate-400 text-lg mb-4">The Impact</p>
          <h2
            className="text-[#00e676] font-bold mb-6"
            style={{
              fontSize: "clamp(3rem, 12vw, 6rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            50% Cost
            <br />
            Reduction
          </h2>
          <p className="text-slate-300 text-xl mb-12">
            Do more with less. Redirect human capital to high-value analysis.
          </p>

          {/* 3-Column Metric Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {/* Metric 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-5xl md:text-6xl font-bold text-[#00e676] mb-2">85%</div>
              <p className="text-slate-300 font-semibold mb-1">Faster</p>
              <p className="text-slate-500 text-sm">Data capture in hours, not weeks</p>
            </motion.div>

            {/* Metric 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-5xl md:text-6xl font-bold text-[#00e676] mb-2">1</div>
              <p className="text-slate-300 font-semibold mb-1">Pilot</p>
              <p className="text-slate-500 text-sm">Replaces multi-person field crews</p>
            </motion.div>

            {/* Metric 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-5xl md:text-6xl font-bold text-[#00e676] mb-2">Zero</div>
              <p className="text-slate-300 font-semibold mb-1">Risk</p>
              <p className="text-slate-500 text-sm">Autonomous flights remove traffic hazards</p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4: THE RECORD — Bleed Image Layout
          ═══════════════════════════════════════════════════════════════════════ */}
      <section ref={infrastructureRef} className="relative py-32 px-6 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <p className="text-slate-400 text-sm uppercase tracking-widest mb-4">Infrastructure Record</p>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Monitor roads and bridges with profound simplicity.
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed">
                Every pothole. Every crack. Every bridge inspection. Captured, verified, and accessible to every stakeholder in real-time.
              </p>
            </motion.div>

            {/* Right: Demo Video with Premium Styling */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative h-96 md:h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl shadow-[#00e676]/10"
              style={{ y: imageY }}
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-cover"
              >
                <source src="/manus-storage/12060119-hd_1920_1080_60fps_df43abf6.mp4" type="video/mp4" />
              </video>
              {/* Subtle overlay for premium feel */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="flex justify-center mt-16"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-6 h-6 text-slate-500" />
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4.5: APWA UTILITY COLOR CODING
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-40 px-6 bg-[#0A0A0A] flex items-center justify-center">
        <div className="max-w-4xl mx-auto text-center">
          {/* Subtle background glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[600px] h-[600px] bg-[#00e676] opacity-[0.02] blur-[120px] rounded-full"></div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative z-10"
          >
            {/* Heading */}
            <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight mb-8">
              Beneath the surface.<br />
              <span className="text-slate-400">Perfectly mapped.</span>
            </h2>

            {/* Subtext */}
            <p className="text-xl md:text-2xl text-slate-300 font-light mb-16">
              Full APWA color-coded utility overlays. Prevent strikes, eliminate guesswork, and know exactly what lies beneath before you dig.
            </p>

            {/* APWA Color Indicators */}
            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
              {/* Red - Electric */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0 }}
                viewport={{ once: true }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 rounded-full bg-red-600 shadow-lg shadow-red-600/50 flex items-center justify-center border border-red-500/30"></div>
                <span className="text-sm font-medium text-slate-300">Electric</span>
              </motion.div>

              {/* Yellow - Gas */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50 flex items-center justify-center border border-yellow-400/30"></div>
                <span className="text-sm font-medium text-slate-300">Gas</span>
              </motion.div>

              {/* Blue - Water */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 flex items-center justify-center border border-blue-400/30"></div>
                <span className="text-sm font-medium text-slate-300">Water</span>
              </motion.div>

              {/* Orange - Communications */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50 flex items-center justify-center border border-orange-400/30"></div>
                <span className="text-sm font-medium text-slate-300">Communications</span>
              </motion.div>

              {/* Green - Sewer */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 rounded-full bg-green-600 shadow-lg shadow-green-600/50 flex items-center justify-center border border-green-500/30"></div>
                <span className="text-sm font-medium text-slate-300">Sewer</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5: THE ECOSYSTEM — Three-Column Grid
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-32 px-6 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-white mb-16 text-center"
          >
            Built for Every Department
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Public Works */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0, ease: "easeOut" }}
              viewport={{ once: true, margin: "-100px" }}
              className="p-8 rounded-2xl border border-[#00e676]/20 bg-[#00e676]/5 text-center hover:bg-[#00e676]/10 transition-colors duration-300"
            >
              <Building2 className="w-12 h-12 text-[#00e676] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Public Works</h3>
              <p className="text-slate-400">
                Manage infrastructure, track maintenance, and coordinate projects in real-time.
              </p>
            </motion.div>

            {/* Urban Planning */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              viewport={{ once: true, margin: "-100px" }}
              className="p-8 rounded-2xl border border-[#00e676]/20 bg-[#00e676]/5 text-center hover:bg-[#00e676]/10 transition-colors duration-300"
            >
              <Hammer className="w-12 h-12 text-[#00e676] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Engineering</h3>
              <p className="text-slate-400">
                Design with precision, validate site conditions, and optimize project planning with real-time data.
              </p>
            </motion.div>

            {/* Public Safety */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              viewport={{ once: true, margin: "-100px" }}
              className="p-8 rounded-2xl border border-[#00e676]/20 bg-[#00e676]/5 text-center hover:bg-[#00e676]/10 transition-colors duration-300"
            >
              <Shield className="w-12 h-12 text-[#00e676] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Public Safety</h3>
              <p className="text-slate-400">
                Respond faster with complete situational awareness and real-time data access.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 6: THE VALIDATION — Premium Quote Section
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-40 px-6 bg-[#0A0A0A] flex items-center justify-center">
        {/* Green glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-[#00e676] opacity-[0.03] blur-[120px] rounded-full" />
        </div>

        <motion.blockquote
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="relative z-10 text-center max-w-4xl"
        >
          <p
            className="text-white italic font-light"
            style={{
              fontSize: "clamp(1.8rem, 5vw, 3rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
            }}
          >
            "Visibility is the first step toward absolute efficiency in modern governance."
          </p>
        </motion.blockquote>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 7: FINAL CTA — Jobsian Style
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-40 flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Green glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-[#00e676] opacity-[0.03] blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight mb-8"
          >
            City-wide scale.
            <br />
            <span className="text-slate-400">Profoundly simple.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-xl md:text-2xl text-slate-300 font-light mb-12"
          >
            Start your municipal pilot today. No credit card required.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            onClick={() => setBriefingFormOpen(true)}
            className="inline-flex items-center gap-2 bg-[#00e676] text-black px-10 py-4 rounded-full text-lg font-bold hover:bg-[#00b548] hover:scale-105 transition-all duration-300 shadow-lg shadow-[#00e676]/20"
          >
            Start Municipal Pilot
            <ChevronRight className="w-5 h-5" />
          </motion.button>

          <p className="text-sm text-slate-500 mt-6">
            Dedicated municipal onboarding and training included.
          </p>
        </div>
      </section>

      <Footer />
      
      {/* Municipal Briefing Form Modal */}
      <MunicipalBriefingForm open={briefingFormOpen} onOpenChange={setBriefingFormOpen} />
    </div>
  );
}
