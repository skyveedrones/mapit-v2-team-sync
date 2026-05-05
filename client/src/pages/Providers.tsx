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
    <div className="text-white overflow-y-auto">
      <GlobalHamburgerHeader />

      {/* ─── HERO ─── */}
      <section className="relative w-full h-screen overflow-hidden bg-transparent">
        {/* 1. THE VIDEO LAYER */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          src="/manus-storage/ShorterConstruction_7e042e5b.mp4" 
          className="absolute top-0 left-0 w-full h-full object-cover -z-20" 
        />
        
        {/* 2. THE TRANSPARENT OVERLAY */}
        <div className="absolute top-0 left-0 w-full h-full bg-black/40 -z-10" />
        
        {/* 3. THE CONTENT LAYER */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full max-w-5xl mx-auto px-6 text-center">
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

            <motion.div variants={fadeInUp}>
              <Button
                size="lg"
                className="bg-[#00C853] hover:bg-[#00b548] text-black font-bold px-10 py-6 text-base rounded-full shadow-lg shadow-[#00C853]/20"
                onClick={() => setLocation("/welcome")}
              >
                Start Free Trial
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── BEFORE & AFTER ─── */}
      <section className="py-40 px-6 bg-[#0D0D0D] border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mb-20"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-bold text-white mb-4"
            >
              The Old Way vs. The MAPIT Way
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-white/60 max-w-2xl"
            >
              See how MAPIT transforms your workflow and client experience.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* OLD WAY */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
              className="space-y-6"
            >
              <h3 className="text-2xl font-bold text-red-400">The Old Way</h3>
              {oldWay.map((item, i) => (
                <motion.div key={i} variants={fadeInUp} className="flex gap-4">
                  <X className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  <p className="text-white/70">{item}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* MAPIT WAY */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
              className="space-y-6"
            >
              <h3 className="text-2xl font-bold text-[#00C853]">The MAPIT Way</h3>
              {mapitWay.map((item, i) => (
                <motion.div key={i} variants={fadeInUp} className="flex gap-4">
                  <Check className="w-6 h-6 text-[#00C853] flex-shrink-0 mt-1" />
                  <p className="text-white/70">{item}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── FEATURE CARDS ─── */}
      <section className="py-40 px-6 bg-[#0A0A0A] border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mb-20"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              Built for Your Workflow
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {featureCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-80px" }}
                  variants={fadeInUp}
                  className="p-8 rounded-lg border border-white/10 bg-white/[0.02] hover:border-[#00C853]/50 transition-colors"
                >
                  <Icon className="w-8 h-8 text-[#00C853] mb-4" />
                  <h3 className="text-xl font-bold text-white mb-3">{card.title}</h3>
                  <p className="text-white/60">{card.body}</p>
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
              Start your 14-day free trial today.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => setLocation("/pricing")}
                className="w-full sm:w-auto bg-[#00e676] text-black px-10 py-4 rounded-full text-lg font-bold hover:bg-[#00b548] hover:scale-105 transition-all duration-300 shadow-lg shadow-[#00e676]/20"
              >
                Start Free Trial
              </button>
            </motion.div>
            
            <motion.p
              variants={fadeInUp}
              className="text-sm text-slate-500 mt-6"
            >
              No credit card required. Works with any standard drone.
            </motion.p>
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
