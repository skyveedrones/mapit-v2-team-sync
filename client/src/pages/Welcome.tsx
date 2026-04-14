/**
 * MAPIT — /welcome Page — Jobsian Rewrite
 * Pure black (#0A0A0A), stark white, MAPIT Green reserved for CTA only.
 * Typography-as-Art: Drop / Snap / Share
 */

import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { GlobalHamburgerHeader } from "@/components/GlobalHamburgerHeader";
import Footer from "@/components/Footer";
import { useState } from "react";
import { ContactModal } from "@/components/ContactModal";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const steps = [
  {
    hook: "Drop.",
    body: "Upload drone imagery and watch the GPS data extract automatically.",
  },
  {
    hook: "Snap.",
    body: "Align your blueprints to reality with centimeter-level precision.",
  },
  {
    hook: "Share.",
    body: "One link. Total site awareness for your entire team.",
  },
];

export default function Welcome() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showContactModal, setShowContactModal] = useState(false);

  const handleGetStarted = () => {
    setLocation("/pricing");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-y-auto">
      <GlobalHamburgerHeader />

      {/* ─── HERO ─── */}
      <section className="pt-40 pb-32 px-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-8 text-white"
          >
            The map begins here.
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-xl text-gray-400 max-w-xl mx-auto mb-14 leading-relaxed"
          >
            Your footage. Our engine. Total clarity.
            <br />
            Let's build your first digital twin.
          </motion.p>

          <motion.div variants={fadeInUp}>
            <Button
              size="lg"
              className="bg-[#00C853] hover:bg-[#00b548] text-black font-bold px-10 py-6 text-base rounded-full shadow-lg shadow-[#00C853]/20"
              onClick={handleGetStarted}
            >
              Get Started
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── RULE OF THREE ─── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <div className="grid md:grid-cols-3 divide-x divide-white/5 border border-white/5 rounded-2xl">
              {steps.map((step) => (
                <motion.div
                  key={step.hook}
                  variants={fadeInUp}
                  className="bg-[#0A0A0A] p-10 flex flex-col justify-between overflow-hidden"
                >
                  <p
                    className="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tighter leading-none mb-8 bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #4b5563)" }}
                  >
                    {step.hook}
                  </p>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CLOSING CTA ─── */}
      <section className="py-40 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-[#00C853]/5 blur-[100px]" />
        </div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="relative z-10 max-w-2xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-12"
          >
            Ready to fly?
          </motion.h2>
          <motion.div variants={fadeInUp}>
            <Button
              size="lg"
              className="bg-[#00C853] hover:bg-[#00b548] text-black font-bold px-12 py-7 text-lg rounded-full shadow-lg shadow-[#00C853]/20"
              onClick={handleGetStarted}
            >
              Create Free Account
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
          <motion.p variants={fadeInUp} className="mt-8 text-sm text-white/25">
            No credit card required &nbsp;·&nbsp; Works with any drone
          </motion.p>
        </motion.div>
      </section>

      <Footer onContactClick={() => setShowContactModal(true)} />
      <ContactModal open={showContactModal} onOpenChange={setShowContactModal} />
    </div>
  );
}
