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
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "MAPIT — Your job site. From above. In minutes.";
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-y-auto">
      <LandscapeNudge />
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
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter text-center drop-shadow-2xl mb-6 w-full mx-auto px-4"
            style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
          >
            <span className="block text-white">Your site.</span>
            <span className="block text-slate-400">Documented.</span>
            <span className="block text-slate-400">Verified.</span>
            <span className="block text-slate-400">Delivered.</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-lg md:text-2xl font-medium tracking-tight text-gray-400 max-w-3xl text-center mt-6 mb-10"
          >
            Stop managing data. Start making decisions.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center mt-8 text-center w-full">
           <Button
  size="lg"
  className="bg-[#00e676] hover:bg-[#00c853] hover:scale-105 transition-all duration-300 text-[#003314] font-semibold px-8 py-4 rounded-full shadow-xl"
  onClick={() => {
    posthog.capture('demo_started', { 
      location: 'homepage_hero',
      version: 'v1_demo' 
    });
    window.open('/create', '_blank');
  }}
>
  Drop a Photo. Build Your Map.
  <ChevronRight className="ml-2 h-5 w-5" />
</Button>
            <p className="mt-3 text-sm text-gray-400 font-medium">
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
              Three steps. Pure magic.
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
              Manage the city. <span className="text-[#00C853]">Not the maps.</span>
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
              You fly the mission. <span className="text-[#00C853]">We build the intelligence.</span>
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

       {/* ═══════════════════════════════════════════════════════════════════════
          SMART SURVEY OCR SHOWCASE
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-[#0A0A0A] flex flex-col items-center border-t border-white/5 relative overflow-hidden">
  {/* Subtle Background Glow */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />
  
  <div className="max-w-4xl mx-auto text-center mb-16 relative z-10">
    <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
      From paper to pixel. <br/><span className="text-[#00e676]">Instantly.</span>
    </h2>
    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
      Stop manually plotting coordinates. Drop an engineering PDF with an embedded <span className="text-white font-semibold">Point Table</span> into MAPIT and watch our OCR intelligence engine pin every survey point to your 3D site with sub-centimeter accuracy.
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
      >
        <source src="https://res.cloudinary.com/dp1fvan1x/video/upload/v1778603585/mapit-homepage/ocr-demo.mp4" type="video/mp4" />
      </video>
    </div>
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
                <p 
                  className="text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tighter leading-tight pb-1 mb-8 bg-clip-text text-transparent whitespace-nowrap" 
                  style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #4b5563)" }}
                >
                  Exact.
                </p>
                <div>
                  <h3 className="text-xl font-bold text-white mb-3 leading-tight">Perfect clarity.</h3>
                  <p className="text-white/50 text-sm leading-relaxed">Centimeter-level accuracy. Ready to share in minutes.</p>
                </div>
              </motion.div>

              {/* Card 2 */}
              <motion.div variants={fadeInUp} className="bg-[#111111] border border-white/5 rounded-2xl p-8 flex flex-col justify-between overflow-hidden">
                <p 
                  className="text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tighter leading-tight pb-1 mb-8 bg-clip-text text-transparent whitespace-nowrap" 
                  style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #4b5563)" }}
                >
                  Universal.
                </p>
                <div>
                  <h3 className="text-xl font-bold text-white mb-3 leading-tight">Native to your workflow.</h3>
                  <p className="text-white/50 text-sm leading-relaxed">Export to Esri, ArcGIS, or CAD in one click. KML, CSV, GeoJSON, GPX — all native.</p>
                </div>
              </motion.div>

              {/* Card 3 */}
              <motion.div variants={fadeInUp} className="bg-[#111111] border border-white/5 rounded-2xl p-8 flex flex-col justify-between overflow-hidden">
                <p 
                  className="text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tighter leading-tight pb-1 mb-8 bg-clip-text text-transparent whitespace-nowrap" 
                  style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #4b5563)" }}
                >
                  Aligned.
                </p>
                <div>
                  <h3 className="text-xl font-bold text-white mb-3 leading-tight">Plans meet reality.</h3>
                  <p className="text-white/50 text-sm leading-relaxed">Drop utility drawings onto live aerial maps. Two reference points. Perfect alignment.</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── JOBSIAN BOTTOM CTA ─── */}
      <section className="relative bg-[#0A0A0A] py-40 flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
            Magically precise.<br />
            <span className="bg-gradient-to-r from-gray-300 to-gray-600 bg-clip-text text-transparent">
              Profoundly simple.
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-slate-300 font-light mb-12">
            Your first map is one photo away.<br className="hidden md:block" />
          </p>
          
          <div className="flex flex-col items-center">
            <Link 
              to="/register"
              className="inline-flex items-center justify-center w-full sm:w-auto bg-[#00e676] hover:bg-[#00c853] text-[#003314] px-10 py-4 rounded-full text-lg font-semibold hover:scale-105 transition-all duration-300 shadow-xl"
            >
              Build Your First Map Free
            </Link>
            <p className="mt-3 text-sm text-gray-400">
              Upload your photo. Your map saves automatically. 14-day trial, no credit card.
            </p>
          </div>
        </div>
      </section>

      <Footer onContactClick={() => setShowContactModal(true)} />
      <ContactModal open={showContactModal} onOpenChange={setShowContactModal} />
    </div>
  );
}