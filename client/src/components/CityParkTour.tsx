/**
 * CityParkTour — Guided 4-step DemoOnboarding overlay for the City Park Redevelopment project.
 *
 * Step 2 is tap-to-dismiss: clicking/tapping anywhere on the card (except the Next button) closes it.
 * The button uses a ref-based guard to prevent ghost click race conditions on mobile.
 */

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRef, useState } from "react";

// ── Tour step data ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    title: "Step 01: The Data Drop",
    text: "This project started with 142 raw drone photos. MAPIT's AI stitched them into this centimeter-accurate base map.",
    btn: "Next: Check Overlays",
  },
  {
    title: "Step 02: PDF & CAD Alignment",
    text: "Open the 'Layers' tab. We've overlaid a Utility PDF. See how the sewer lines match the physical manholes on the map?",
    btn: "Next: Verify Measurements",
  },
  {
    title: "Step 03: Precision Metrics",
    text: "Look at the playground area. That 4,500 sq ft measurement was generated in two clicks. No tape measure required.",
    btn: "Final: Launch Flyby",
  },
  {
    title: "The Stakeholder 'Wow' Moment",
    text: "This is the Cinematic Flyby. It's how you present your work to the City Manager. Ready for takeoff?",
    btn: "START FLYBY",
  },
] as const;

// ── Props ──────────────────────────────────────────────────────────────────────

export interface CityParkTourProps {
  onLaunchFlyby?: () => void;
  onClose?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CityParkTour({ onLaunchFlyby, onClose }: CityParkTourProps) {
  const [step, setStep] = useState(1);
  const [visible, setVisible] = useState(true);
  // Tracks whether the action button was just activated so the card-level handler can ignore it
  const buttonActivatedRef = useRef(false);

  const current = STEPS[step - 1];

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 350);
  };

  const handleAction = () => {
    if (step < 4) {
      setStep((s) => s + 1);
    } else {
      onLaunchFlyby?.();
      dismiss();
    }
  };

  // Card-level tap handler — only fires for Step 2, and only if the button wasn't what was tapped
  const handleCardTap = () => {
    if (step !== 2) return;
    if (buttonActivatedRef.current) {
      buttonActivatedRef.current = false;
      return;
    }
    dismiss();
  };

  const isFinalStep = step === 4;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="demo-onboarding"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          onClick={handleCardTap}
          onTouchEnd={(e) => {
            if (step !== 2) return;
            if (buttonActivatedRef.current) {
              buttonActivatedRef.current = false;
              return;
            }
            e.preventDefault();
            dismiss();
          }}
          className={`fixed bottom-4 sm:bottom-12 left-1/2 -translate-x-1/2 w-96 max-w-[calc(100vw-2rem)] bg-slate-900/90 border-2 border-[#10b981] p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl z-[999] backdrop-blur-md${step === 2 ? " cursor-pointer select-none" : ""}`}
        >
          {/* Dismiss button */}
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); dismiss(); }}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            aria-label="Close walkthrough"
          >
            <X size={15} />
          </button>

          {/* Step label */}
          <h4 className="text-[#10b981] font-mono text-xs mb-2 tracking-widest uppercase">
            Walkthrough: Step 0{step}
          </h4>

          {/* Step content — crossfade between steps */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              <h3 className="text-white font-bold text-lg mb-2">{current.title}</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">{current.text}</p>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i < step ? "bg-[#10b981]" : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Full-width action button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onPointerDown={() => { buttonActivatedRef.current = true; }}
            onClick={(e) => { e.stopPropagation(); handleAction(); }}
            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); buttonActivatedRef.current = true; handleAction(); }}
            className={`w-full py-3 font-black rounded-xl transition-all text-slate-900 ${
              isFinalStep
                ? "bg-[#10b981] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] text-base tracking-widest uppercase"
                : "bg-[#10b981] hover:bg-[#0da673]"
            }`}
          >
            {current.btn}
          </motion.button>

          {/* Step 2 hint */}
          {step === 2 && (
            <p className="text-center text-slate-600 text-[10px] mt-3 tracking-wide">tap anywhere to dismiss</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
