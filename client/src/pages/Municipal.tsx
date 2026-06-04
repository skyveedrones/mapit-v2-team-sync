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
      <GlobalHamburgerHeader onBriefingRequest={() => setBriefingFormOpen(true)} />

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
          <source src="https://res.cloudinary.com/dp1fvan1x/video/upload/mapit-site/municipal_hero.mp4" type="video/mp4" />
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

          <div className="flex flex-col items-center">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              onClick={() => setBriefingFormOpen(true)}
              className="inline-flex items-center gap-2 bg-[#00e676] hover:bg-[#00c853] text-black px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-all duration-300 shadow-xl"
            >
              Start Municipal Pilot
              <ChevronRight className="w-5 h-5" />
            </motion.button>
            <p className="mt-4 text-xs text-gray-300">
              Live demo — no account required. Your map saves instantly.
            </p>
          </div>
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
            className="text-5xl md:text-7xl font-bold text-white mb-16 text-center"
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
          SECTION 2.5: SMART SURVEY - PDF Data Unlock
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative px-6 bg-[#0A0A0A]" style={{ paddingTop: '140px', paddingBottom: '140px' }}>
        <div className="max-w-7xl mx-auto">
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
            <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight mb-8 text-center">
              Stop paying twice for the<br />
              <span className="text-[#00e676]">exact same survey data.</span>
            </h2>

            {/* Subtext */}
            <p className="text-xl md:text-2xl text-slate-300 font-light mb-16 max-w-3xl text-center mx-auto">
              MAPIT Smart Survey unlocks decades of buried PDF data in a single afternoon — sub-centimeter accuracy, zero manual entry.
            </p>

            {/* Image - Smart Survey Interface */}
            <div className="mb-16 rounded-2xl border border-slate-800 shadow-2xl shadow-[#00e676]/10 overflow-hidden">
              <img
                src="https://pub-4e15c1350b3b4f3e87823e90991b0cf4.r2.dev/MAPIT%20PDF%20Import%20Survey%20Points%20Video.mp4https://dronemapv2-fis5wf2n.manus.space/manus-storage/SmartSurveyImage_cropped_dd7d8dc5.png"
                alt="MAPIT Smart Survey - PDF Data Unlock Interface"
                className="w-full max-h-[50vh] object-cover"
              />
            </div>

            {/* Three-Step Process */}
            <div className="grid md:grid-cols-3 gap-8 mt-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-[#00e676] text-sm font-bold tracking-widest mb-4">01</div>
                <h3 className="text-2xl font-bold text-white mb-3">Drop the PDF</h3>
                <p className="text-slate-400">Any engineering survey table.</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-[#00e676] text-sm font-bold tracking-widest mb-4">02</div>
                <h3 className="text-2xl font-bold text-white mb-3">Pick your zone</h3>
                <p className="text-slate-400">Select the State Plane zone.</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-[#00e676] text-sm font-bold tracking-widest mb-4">03</div>
                <h3 className="text-2xl font-bold text-white mb-3">Get a live map</h3>
                <p className="text-slate-400">Every point pinned automatically.</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3: APWA UTILITY COLOR CODING (moved up)
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-40 px-6 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
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
            <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight mb-8 text-center">
              Beneath the surface.<br />
              <span className="text-[#00C853]">Perfectly mapped.</span>
            </h2>

            {/* Subtext */}
            <p className="text-xl md:text-2xl text-slate-300 font-light mb-16 text-center max-w-5xl mx-auto text-balance leading-relaxed">
              Full APWA color-coded utility overlays. Prevent strikes, eliminate guesswork, and know exactly what lies beneath before you dig.
            </p>

            {/* Graphic - Neon Street Cutaway */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              viewport={{ once: true }}
              className="mb-16 rounded-2xl border border-slate-800 shadow-2xl shadow-[#00e676]/10 flex items-center justify-center"
            >
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/neon_street_cutaway_solid_pipes-iWFEmVe2zVQbKSo2erbExk.webp"
                alt="3D Neon Street Cutaway - Underground Infrastructure"
                className="w-full max-h-[75vh] object-contain"
              />
            </motion.div>


          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5: THE RECORD — Bleed Image Layout
          ═══════════════════════════════════════════════════════════════════════ */}
      <section ref={infrastructureRef} className="relative px-6 bg-[#0A0A0A]" style={{ paddingTop: '140px', paddingBottom: '140px' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-slate-400 text-sm uppercase tracking-widest mb-4">Infrastructure Record</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Automated surface analysis. <span className="text-[#00e676]">Catch degradation before it costs you.</span>
            </h2>
            <p className="text-slate-300 text-lg md:text-xl leading-relaxed max-w-4xl mx-auto mb-12">
              Track millimeter-level changes in road surfaces and bridge integrity over time. Ditch the manual clipboards and let automated drone capture highlight exactly where your paving budget needs to go.
            </p>

            {/* Bridge Thermal Image */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative mx-auto h-[22rem] md:h-[34rem] w-full max-w-4xl rounded-2xl overflow-hidden border border-slate-800 shadow-2xl shadow-[#00e676]/10"
              style={{ y: imageY }}
            >
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663204719166/IyMAHOecBZsjsGWl.jpg"
                alt="Highway thermal analysis with AI surface detection"
                className="w-full h-full object-cover"
              />
              {/* Subtle overlay for premium feel */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </motion.div>

            {/* Tech Tags */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl mx-auto">
              <div className="px-4 py-2 border border-[#00e676] rounded-full text-sm text-[#00e676] font-medium bg-[#00e676]/5 hover:bg-[#00e676]/10 transition-colors text-center">
                AI Surface Detection
              </div>
              <div className="px-4 py-2 border border-[#00e676] rounded-full text-sm text-[#00e676] font-medium bg-[#00e676]/5 hover:bg-[#00e676]/10 transition-colors text-center">
                Thermal Bridge Scans
              </div>
              <div className="px-4 py-2 border border-[#00e676] rounded-full text-sm text-[#00e676] font-medium bg-[#00e676]/5 hover:bg-[#00e676]/10 transition-colors text-center">
                Historical Timeline Compare
              </div>
            </div>
          </motion.div>
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
          SECTION 4: THE IMPACT — "50% Cost Reduction"
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
          SECTION 6: THE ECOSYSTEM — Three-Column Grid
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-32 px-6 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-bold text-white mb-16 text-center"
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

      {/* ─── GOVERNMENT TRUST SIGNALS ─── */}
      <section className="py-40 px-6 bg-[#0A0A0A] border-t border-white/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-3 mb-10 px-6 py-3 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm">
            <svg className="w-4 h-4 text-white/50 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" />
            </svg>
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-white/40">Trust &amp; Security</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 text-[#00e676]">
            Built for the public trust.
          </h2>
          <p className="text-lg text-white/50 leading-relaxed max-w-xl mx-auto">
            Secure cloud infrastructure. Immutable audit trails for capital projects. Public Works ready.
          </p>

          <motion.blockquote
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            viewport={{ once: true }}
            className="mt-16 text-center max-w-4xl mx-auto"
          >
            <p
              className="text-white italic font-light"
              style={{
                fontSize: "clamp(1.8rem, 5vw, 3rem)",
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
              }}
            >
              "Managing city infrastructure meant drowning in paper and complicated software. MAPIT changed everything. We just drop in a photo, and it instantly builds a live map our entire team can understand. Simply, It just works."<br />
              <span className="text-sm md:text-base text-slate-400 font-normal not-italic">Director of Public Works, Mid-Sized Texas Municipality</span>
            </p>
          </motion.blockquote>
        </motion.div>
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
            <span className="text-white font-bold">Profoundly simple.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-xl md:text-2xl text-slate-300 font-light mb-4"
          >
            Start your municipal pilot today. No credit card required.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            viewport={{ once: true }}
            className="text-xl md:text-2xl text-slate-300 font-light mb-12"
          >
            Dedicated municipal onboarding and training included.
          </motion.p>

          <div className="flex flex-col items-center">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              onClick={() => setBriefingFormOpen(true)}
              className="inline-flex items-center gap-2 bg-[#00e676] hover:bg-[#00c853] text-black px-10 py-4 rounded-full text-lg font-bold hover:scale-105 transition-all duration-300 shadow-xl"
            >
              Start Municipal Pilot
              <ChevronRight className="w-5 h-5" />
            </motion.button>
            <p className="mt-4 text-sm md:text-base text-gray-300">
              Live demo — no account required. Your map saves instantly.
            </p>
          </div>
        </div>
      </section>

      <Footer />

      {/* Municipal Briefing Form Modal */}
      <MunicipalBriefingForm open={briefingFormOpen} onOpenChange={setBriefingFormOpen} />
    </div>
  );
}
