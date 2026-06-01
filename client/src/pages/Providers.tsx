/**
 * MAPIT — Providers Page ("For Pilots")
 * B2B landing page for drone service providers.
 * Design: Jobsian — #0A0A0A, stark white, MAPIT Green CTAs only.
 */

import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { GlobalHamburgerHeader } from "@/components/GlobalHamburgerHeader";
import { motion } from "framer-motion";
import { ChevronRight, X, Check, Link2, Tablet, Layers, Ruler } from "lucide-react";
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

const oldWay = [
  "Client needs specific GIS software installed",
  "Downloads take hours on a job-site connection",
  "Client is confused by raw data formats",
  "Pilot wastes hours doing tech support",
  "Files get lost in email threads",
];

const mapitWay = [
  "Instant browser access on any device",
  "Client interacts with the map immediately",
  "Measurements and annotations built in",
  "Pilot looks like an enterprise agency",
  "Secure, permanent link — always accessible",
];

const featureCards = [
  {
    icon: Link2,
    title: "Zero-Friction Delivery",
    body: "Send a URL, not a hard drive. One click — they're inside a live digital twin.",
  },
  {
    icon: Tablet,
    title: "Device Agnostic",
    body: "iPad in the truck. Desktop in the office. No app. No login. No friction.",
  },
  {
    icon: Layers,
    title: "2-Point CAD Alignment",
    body: "Overlay utility drawings onto your map. Two reference points. Perfect alignment.",
  },
  {
    icon: Ruler,
    title: "Instant Measurements",
    body: "Clients measure distance and area themselves. They get answers. You get time back.",
  },
];

export default function Providers() {
  const [showContactModal, setShowContactModal] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "MAPIT for Pilots — Deliver intelligence. Not just images.";
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-hidden">
      <GlobalHamburgerHeader />

      {/* ─── HERO ─── */}
      <section className="relative w-full min-h-screen flex items-center justify-center" style={{overflow: 'hidden'}}>
        {/* Full-bleed video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-center"
        >
          <source
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/GatewayConstructionPilotHeroVideo_477e04c1.mp4"
            type="video/mp4"
          />
        </video>
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-[#0A0A0A]" />
        
        {/* Content layer */}
        <div className="relative z-20 max-w-3xl mx-auto px-6 text-center" style={{ paddingTop: '60px' }}>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.p
              variants={fadeInUp}
              className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/40 mb-8"
            >
              For Drone Service Providers
            </motion.p>

            <motion.h1
              variants={fadeInUp}
              className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-8 text-white"
              style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
            >
              <span className="block">Deliver intelligence.</span>
              <span className="block">Not just images.</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-xl text-white/60 mt-6"
            >
              Stop shipping hard drives. Start sending digital twins.
            </motion.p>
            
            <motion.p
              variants={fadeInUp}
              className="text-xl text-white/60 mt-2"
            >
              No account required. Experience the live demo instantly.
            </motion.p>

            {/* Social proof pill */}
            <motion.div variants={fadeInUp} className="flex justify-center mb-8 mt-8">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.05] text-sm text-white/50 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] flex-shrink-0" />
                Built for commercial operators.
              </span>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col items-center">
              <Button
                size="lg"
                className="bg-white hover:bg-gray-100 hover:scale-105 transition-all duration-300 text-black font-bold px-10 py-6 text-base rounded-full shadow-xl"
                onClick={() => setLocation("/pricing")}
              >
                Start Free Trial
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="mt-2 text-xs text-gray-300">
                Live demo — no account required. Your map saves instantly.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── EVOLUTION ─── */}
      <section className="py-40 px-6 bg-[#0A0A0A] border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mb-20 flex flex-col items-center text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight text-center"
            >
              The Evolution of Delivery
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-white/50 max-w-2xl text-center mx-auto"
            >
              Trade the complexity of the past for the speed of the future.
            </motion.p>
          </motion.div>

          {/* Two-column grid */}
          <div className="grid md:grid-cols-2 gap-0 border border-white/10 rounded-2xl overflow-hidden">
            {/* LEFT — The Friction */}
            <div className="bg-[#0D0D0D] p-10 md:p-12 space-y-10 border-r border-white/10">
              <h3 className="text-xs font-bold tracking-[0.25em] uppercase text-red-400/70">The Friction</h3>

              {/* Item 1 */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="space-y-2"
              >
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-400/70 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold leading-snug">Manual Labor</p>
                    <p className="text-white/50 text-sm mt-1">Shipping drives and installing GIS.</p>
                    <p className="text-[#FF4D4D] text-sm font-bold mt-2">The Cost: 8+ hours wasted per project.</p>
                  </div>
                </div>
              </motion.div>

              {/* Item 2 */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="space-y-2"
              >
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-400/70 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold leading-snug">The Support Burden</p>
                    <p className="text-white/50 text-sm mt-1">Explaining data to confused clients.</p>
                    <p className="text-[#FF4D4D] text-sm font-bold mt-2">The Cost: 3x more support requests.</p>
                  </div>
                </div>
              </motion.div>

              {/* Item 3 */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="space-y-2"
              >
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-400/70 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold leading-snug">Data Decay</p>
                    <p className="text-white/50 text-sm mt-1">Lost links and broken email threads.</p>
                    <p className="text-[#FF4D4D] text-sm font-bold mt-2">The Result: A fading competitive edge.</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* RIGHT — The Flow */}
            <div className="bg-[#080808] p-10 md:p-12 space-y-10">
              <h3 className="text-xs font-bold tracking-[0.25em] uppercase text-[#00C853]/80">The Flow</h3>

              {/* Item 1 */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="space-y-2"
              >
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#00C853] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold leading-snug">Instant Clarity</p>
                    <p className="text-white/50 text-sm mt-1">One link. Total immersion.</p>
                  </div>
                </div>
              </motion.div>

              {/* Item 2 */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="space-y-2"
              >
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#00C853] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold leading-snug">Self-Service Power</p>
                    <p className="text-white/50 text-sm mt-1">They measure. You deliver.</p>
                  </div>
                </div>
              </motion.div>

              {/* Item 3 */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="space-y-2"
              >
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#00C853] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold leading-snug">The New Standard</p>
                    <p className="text-white/50 text-sm mt-1">Secure, permanent, and profoundly professional.</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PLATFORM CAPABILITIES ─── */}
      <section className="py-40 px-6 bg-[#0A0A0A] border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mb-20 flex flex-col items-center text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight text-center"
            >
              Platform Capabilities
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-white/50 max-w-2xl text-center mx-auto"
            >
              Everything you need to deliver professional client portals.
            </motion.p>
          </motion.div>

          {/* Feature cards grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="p-8 bg-[#080808] border border-white/10 rounded-lg hover:border-white/20 transition-colors duration-300"
                >
                  <Icon className="w-8 h-8 text-[#00C853] mb-4" />
                  <h3 className="text-lg font-bold text-white mb-3">{card.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{card.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── JOBSIAN BOTTOM CTA ─── */}
      <section className="relative py-40 flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-[#0A0A0A]">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-[#00e676] opacity-[0.03] blur-[120px] rounded-full"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight mb-8"
            >
              Expertly flown.<br />
              <span className="text-slate-400">Magically processed.</span>
            </motion.h2>
            
            <motion.p
              variants={fadeInUp}
              className="text-xl md:text-2xl text-slate-300 font-light mb-12 max-w-3xl mx-auto"
            >
              Stop sharing raw files. Deliver an interactive client portal.<br className="hidden md:block" />
              Your first map is one photo away.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col items-center">
              <button 
                onClick={() => setLocation("/pricing")}
                className="w-full sm:w-auto bg-white hover:bg-gray-100 text-black px-10 py-4 rounded-full text-lg font-bold hover:scale-105 transition-all duration-300 shadow-xl"
              >
                Build Your First Map Free
              </button>
              <p className="mt-3 text-sm text-gray-400">
                Upload your photo. Your map saves automatically. 14-day trial, no credit card.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />

      {/* CONTACT MODAL */}
      {showContactModal && (
        <ContactModal open={showContactModal} onOpenChange={setShowContactModal} />
      )}
    </div>
  );
}
