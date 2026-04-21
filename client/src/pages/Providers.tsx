/**
 * MAPIT — Providers Page ("For Pilots")
 * B2B landing page for drone service providers.
 * Design: Same Jobsian system as Home.tsx — #0A0A0A, stark white, MAPIT Green CTAs only.
 */

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

const valueProps = [
  {
    number: "01",
    headline: "Share a link. Not a file.",
    body: "Stop crashing client inboxes with 4GB GeoTIFFs. Send a secure, interactive web link in seconds.",
  },
  {
    number: "02",
    headline: "No GIS degree required.",
    body: "Your clients want answers, not software tutorials. Give them an intuitive 3D environment they can explore instantly.",
  },
  {
    number: "03",
    headline: "Win more bids.",
    body: "Differentiate your agency. Delivering a live MAPIT dashboard makes you look like an enterprise firm, securing repeat contracts.",
  },
];

export default function Providers() {
  const [showContactModal, setShowContactModal] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "MAPIT for Pilots — Deliver intelligence. Not just images.";
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-y-auto">
      <GlobalHamburgerHeader />

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Full-bleed video — same source as Home */}
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
        {/* Overlays */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#0A0A0A]" />

        {/* Hero content */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-20 max-w-3xl mx-auto px-6 text-center"
          style={{ paddingTop: "60px" }}
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
            className="text-xl text-gray-300 max-w-xl mx-auto mb-12 leading-relaxed"
          >
            MAPIT is the ultimate client-handoff portal for drone service providers. Stop shipping hard drives and start sending interactive digital twins.
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
            No credit card required. Works with any drone.
          </motion.p>
        </motion.div>
      </section>

      {/* ─── VALUE PROPS ─── */}
      <section className="py-32 px-6 bg-[#0A0A0A] border-t border-white/5">
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
              Built for pilots who bill clients.
            </motion.h2>

            <div className="grid md:grid-cols-3 gap-16">
              {valueProps.map((vp) => (
                <motion.div
                  key={vp.number}
                  variants={fadeInUp}
                  className="text-center"
                >
                  <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/30 mb-4">
                    {vp.number}
                  </p>
                  <h3 className="text-2xl font-bold text-white mb-4 leading-tight">{vp.headline}</h3>
                  <p className="text-gray-400 text-base leading-relaxed">{vp.body}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── STATEMENT BLOCK ─── */}
      <section className="py-40 px-6 bg-[#0A0A0A] border-t border-white/5">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-8"
          >
            Your clients deserve
            <br />
            better than a Dropbox link.
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-xl sm:text-2xl text-gray-300 leading-relaxed max-w-2xl mx-auto"
          >
            Give them a live, interactive map they can explore on any device — no downloads, no logins, no confusion.
          </motion.p>
        </motion.div>
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
            Ready to look like a pro?
          </motion.h2>

          <motion.div variants={fadeInUp}>
            <Button
              size="lg"
              className="bg-[#00C853] hover:bg-[#00b548] text-black font-bold px-12 py-7 text-lg rounded-full shadow-lg shadow-[#00C853]/20"
              onClick={() => setLocation("/pricing")}
            >
              See Pilot Plans
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
