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
import { MunicipalBriefingForm } from "@/components/MunicipalBriefingForm";
import LandscapeNudge from "@/components/LandscapeNudge";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import posthog from "posthog-js";

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
    headline: "Native to your workflow.",
    body: "Seamless GIS and CAD integration. Export to Esri/ArcGIS or CAD in one click. KML, CSV, GeoJSON, and GPX—supported natively.",
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
  const [briefingFormOpen, setBriefingFormOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "MAPIT — Your job site. From above. In minutes.";
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-y-auto">
      <LandscapeNudge />
      <GlobalHamburgerHeader onBriefingRequest={() => setBriefingFormOpen(true)} />
      <MunicipalBriefingForm open={briefingFormOpen} onOpenChange={setBriefingFormOpen} />

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
            src="https://pub-4e15c1350b3b4f3e87823e90991b0cf4.r2.dev/MAPit%20Homepage%20Hero%20Video.mp4"
            type="video/mp4"
          />
        </video>
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-[#0A0A0A]" />

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
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter text-center drop-shadow-2xl mb-6 w-full mx-auto px-4"
            style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
          >
            <span className="block text-white font-extrabold">Your site.</span>
            <span className="block text-white font-bold">Documented.</span>
            <span className="block text-white font-bold">Verified.</span>
            <span className="block text-white font-bold">Delivered.</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-2xl md:text-3xl lg:text-4xl font-medium tracking-tight text-white max-w-3xl text-center mt-6 mb-10"
          >
            Stop managing data. Start making decisions.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center mt-8 text-center w-full">
           <Button
  size="lg"
  className="bg-[#00e676] hover:bg-[#00c853] hover:scale-105 transition-all duration-300 text-[#003314] font-semibold px-12 py-6 rounded-full shadow-xl text-xl"
  onClick={() => {
    posthog.capture('demo_started', { 
      location: 'homepage_hero',
      version: 'v1_demo' 
    });
    window.open('/create', '_blank');
  }}
>
  Drop a Photo. Build Your Map.
  <ChevronRight className="ml-2 h-6 w-6" />
</Button>
            <p className="mt-4 text-lg md:text-xl text-gray-300 font-medium">
              Uses your drone photo. Builds a real project. Saves with your email.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── 3-STEP WORKFLOW ─── */}
      <section className="py-40 px-6 bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-center mb-20"
            >
              Three steps. <span className="text-[#00C853]">Pure magic.</span>
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

       {/* ═══════════════════════════════════════════════════════════════════════
          SMART SURVEY OCR SHOWCASE
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-[#0A0A0A] flex flex-col items-center border-t border-white/5 relative overflow-hidden">
  {/* Subtle Background Glow */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />
  
  <div className="max-w-4xl mx-auto text-center mb-16 relative z-10">
    <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
      Your Site. <span className="text-[#00e676]">Perfect Vision.</span>
    </h2>
    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
      Drop an engineering blueprint onto your screen, link two reference points, and watch it snap perfectly into real-world GPS alignment.
    </p>
  </div>
  
  <div className="w-full max-w-5xl mx-auto relative z-10">
    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(255,255,255,0.05)] bg-black aspect-video">
      <video
        className="w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        style={{ animationPlayState: 'running' }}
        onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).playbackRate = 0.75; }}
      >
        <source src="https://pub-4e15c1350b3b4f3e87823e90991b0cf4.r2.dev/US%2080%20Waterline%20Overlay%20for%20LinkedIn.mp4" type="video/mp4" />
      </video>
    </div>
  </div>
</section>

     {/* ─── MUNICIPAL GATEWAY ─── */}
      <section className="py-20 px-6 bg-[#0A0A0A] border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {/* 🚀 BUMPED FONT SIZE HERE */}
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-white text-center tracking-tight mb-8"
            >
              Manage the city.<br />
              <span className="text-[#00C853]">Not the maps.</span>
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-gray-400 text-lg mt-4 text-center max-w-3xl mx-auto mb-12"
            >
              <span className="block">Live aerial records for roads, utilities, and infrastructure.</span>
              <span className="block mt-1 md:mt-2">No consultants. No delays.</span>
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

      {/* ─── PILOT PERSONA ─── */}
      <section className="py-20 px-6 bg-[#0A0A0A] border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {/* 🚀 BUMPED FONT SIZE HERE */}
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-white text-center tracking-tight mb-8"
            >
              You fly the mission.<br />
              <span className="text-[#00C853]">We build the intelligence.</span>
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="text-lg text-white/60 leading-relaxed max-w-xl mx-auto mb-12"
            >
              Transform raw drone data into a professional client portal. Look like an enterprise agency and win the bid.
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-12">
              <a
                href="/providers"
                className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-full text-base hover:bg-gray-100 transition-colors shadow-lg"
              >
                Explore Pilot Solutions <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

{/* ─── 3-CARD FEATURE GRID ─── */}
      <section id="features" className="py-40 px-6 bg-[#0A0A0A] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {/* Changed from md:grid-cols-3 to lg:grid-cols-3 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Card 1 */}
              <motion.div variants={fadeInUp} className="bg-[#111111] border border-white/5 rounded-2xl p-8 flex flex-col justify-between overflow-hidden">
                <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/30 mb-4">Feature</p>
                <h3 className="text-2xl font-bold text-white mb-4">{featureCards[0].headline}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{featureCards[0].body}</p>
              </motion.div>

              {/* Card 2 */}
              <motion.div variants={fadeInUp} className="bg-[#111111] border border-white/5 rounded-2xl p-8 flex flex-col justify-between overflow-hidden">
                <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/30 mb-4">Feature</p>
                <h3 className="text-2xl font-bold text-white mb-4">{featureCards[1].headline}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{featureCards[1].body}</p>
              </motion.div>

              {/* Card 3 */}
              <motion.div variants={fadeInUp} className="bg-[#111111] border border-white/5 rounded-2xl p-8 flex flex-col justify-between overflow-hidden">
                <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/30 mb-4">Feature</p>
                <h3 className="text-2xl font-bold text-white mb-4">{featureCards[2].headline}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{featureCards[2].body}</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <Footer />
      <ContactModal open={showContactModal} onOpenChange={setShowContactModal} />
    </div>
  );
}
