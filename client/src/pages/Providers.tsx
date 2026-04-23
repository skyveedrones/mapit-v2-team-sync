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

const oldWay = [
  "Client needs specific GIS software installed",
  "Downloads take hours on a job-site connection",
  "Client is confused by raw data formats",
  "Pilot wastes hours doing tech support",
  "Files get lost in email threads",
];

const mapitWay = [
  "Instant browser access on any device",
  "Client can interact with the map immediately",
  "Measurements and annotations built in",
  "Pilot looks like an enterprise agency",
  "Secure, permanent link — always accessible",
];

const featureCards = [
  {
    icon: Link2,
    title: "Zero-Friction Delivery",
    body: "Send a URL, not a hard drive. Your client clicks once and they're inside an interactive digital twin of their site.",
  },
  {
    icon: Tablet,
    title: "Device Agnostic",
    body: "Your clients can view their site on an iPad in the truck or a desktop in the office — no app, no login, no friction.",
  },
  {
    icon: Layers,
    title: "2-Point CAD Alignment",
    body: "Overlay their utility drawings directly onto your map. Two reference points. Perfect alignment. Every time.",
  },
  {
    icon: Ruler,
    title: "Instant Measurements",
    body: "Clients can measure distance and area without asking you to do it. They get answers. You get time back.",
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
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#0A0A0A]" />

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
            <p className="text-sm text-white/40 mt-3 text-center">No account required. Experience the live demo instantly.</p>
          </motion.div>

          <motion.p variants={fadeInUp} className="mt-4 text-sm text-white/40 text-center">
            No credit card required. Works with any drone.
          </motion.p>
        </motion.div>
      </section>

      {/* ─── BEFORE & AFTER ─── */}
      <section className="py-32 px-6 bg-[#0D0D0D] border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.p
              variants={fadeInUp}
              className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/30 text-center mb-5"
            >
              The Business Case
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-16"
            >
              Two ways to deliver a job.
            </motion.h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Old Way */}
              <motion.div
                variants={fadeInUp}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-8"
              >
                <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/30 mb-4">The Old Way</p>
                <h3 className="text-2xl font-bold text-white mb-6 leading-tight">Sending a 4GB GeoTIFF.</h3>
                <ul className="space-y-4">
                  {oldWay.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <X className="w-3 h-3 text-red-400" />
                      </span>
                      <span className="text-gray-400 text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* MAPIT Way */}
              <motion.div
                variants={fadeInUp}
                className="rounded-2xl border border-[#00C853]/20 bg-[#00C853]/[0.04] p-8"
              >
                <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#00C853]/60 mb-4">The MAPIT Way</p>
                <h3 className="text-2xl font-bold text-white mb-6 leading-tight">Sending a MAPIT Link.</h3>
                <ul className="space-y-4">
                  {mapitWay.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center">
                        <Check className="w-3 h-3 text-[#00C853]" />
                      </span>
                      <span className="text-gray-300 text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── ROI METRIC ─── */}
      <section className="py-40 px-6 bg-[#0A0A0A] border-t border-white/5">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.p
            variants={fadeInUp}
            className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/30 mb-6"
          >
            The ROI
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-8"
          >
            Pays for itself on the first flight.
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto"
          >
            When you deliver an interactive digital twin instead of a raw file, you aren't just a drone operator anymore — you're a data consultant. Command higher retainer fees and win the bids your competitors lose.
          </motion.p>
        </motion.div>
      </section>

      {/* ─── FEATURE CARDS ─── */}
      <section className="py-32 px-6 bg-[#0D0D0D] border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.p
              variants={fadeInUp}
              className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/30 text-center mb-5"
            >
              Platform Capabilities
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-16"
            >
              Everything your clients need. Nothing they don't.
            </motion.h2>

            <div className="grid sm:grid-cols-2 gap-6">
              {featureCards.map((card) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    variants={fadeInUp}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-8 hover:border-white/15 hover:bg-white/[0.05] transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center mb-5">
                      <Icon className="w-5 h-5 text-[#00C853]" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 leading-tight">{card.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{card.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
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
              className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-20"
            >
              Your work, beautifully delivered.
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
      <section className="py-40 px-6 bg-[#0D0D0D] border-t border-white/5">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-8"
          >
            Your clients deserve better than a Dropbox link.
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
            className="text-4xl md:text-5xl font-bold tracking-tight mb-12"
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

      <ContactModal open={showContactModal} onOpenChange={setShowContactModal} />
    </div>
  );
}
