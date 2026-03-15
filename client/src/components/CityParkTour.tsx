/**
 * CityParkTour — Guided 4-step demo overlay for the City Park Redevelopment project.
 *
 * Appears as a floating card pinned to the bottom-center of the screen.
 * Step 4 fires an onLaunchFlyby callback so the parent can trigger FlybyController.
 * The tour is dismissed by clicking "Exit Tour" on step 4 or the ✕ button at any time.
 * State is NOT persisted to localStorage so every demo session starts fresh.
 */

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";

// ── Tour step data ─────────────────────────────────────────────────────────────

const TOUR_STEPS = [
  {
    id: 1,
    title: "Step 01: High-Res Vision",
    content:
      "This is the raw output. 2D stitching from 142 drone images. Zoom in to see the texture of the grass — that's MAPIT precision.",
    action: "Next: View Overlays",
  },
  {
    id: 2,
    title: "Step 02: Engineering Overlays",
    content:
      "We've pre-loaded a Utility PDF and a CAD file. Toggle the 'Layers' icon to see how the underground pipes align perfectly with the terrain.",
    action: "Next: Check Measurements",
  },
  {
    id: 3,
    title: "Step 03: Project Annotations",
    content:
      "Look at the Playground zone. We've calculated the 4,500 sq ft area. Any stakeholder can now verify the footprint remotely.",
    action: "Final Step: Launch Flyby",
  },
  {
    id: 4,
    title: "The Victory Lap: Cinematic Flyby",
    content:
      "This is the 'Wow' moment for the City Manager. Click the button below to start the automated 3D orbit.",
    action: "Exit Tour",
  },
] as const;

// ── Props ──────────────────────────────────────────────────────────────────────

export interface CityParkTourProps {
  /** Called when the user reaches step 4 and clicks the action button */
  onLaunchFlyby?: () => void;
  /** Called when the tour is dismissed (✕ or "Exit Tour") */
  onClose?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CityParkTour({ onLaunchFlyby, onClose }: CityParkTourProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [visible, setVisible] = useState(true);

  const step = TOUR_STEPS[currentStep - 1];

  const handleAction = () => {
    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
    } else {
      // Step 4 — trigger flyby then close
      onLaunchFlyby?.();
      closeTour();
    }
  };

  const closeTour = () => {
    setVisible(false);
    // Give the exit animation time to finish before calling onClose
    setTimeout(() => onClose?.(), 350);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="city-park-tour"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[450px] max-w-[calc(100vw-2rem)] bg-slate-900 border-2 border-[#10b981] rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[100] backdrop-blur-xl"
        >
          {/* Header row */}
          <div className="flex justify-between items-start mb-4">
            <span className="text-[#10b981] font-mono font-bold tracking-widest text-xs uppercase">
              Demo Mode: Step 0{currentStep}
            </span>
            <button
              onClick={closeTour}
              className="text-slate-500 hover:text-white transition-colors leading-none"
              aria-label="Close tour"
            >
              <X size={16} />
            </button>
          </div>

          {/* Step content — animate between steps */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                {step.content}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Footer: progress dots + action button */}
          <div className="flex items-center justify-between">
            {/* Progress dots */}
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1 w-8 rounded-full transition-colors duration-300 ${
                    s <= currentStep ? "bg-[#10b981]" : "bg-slate-800"
                  }`}
                />
              ))}
            </div>

            {/* Action button */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAction}
              className={`px-6 py-2 font-bold rounded-lg transition-all text-sm ${
                currentStep === 4
                  ? "bg-[#10b981] text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-[#0da673]"
                  : "bg-[#10b981] text-slate-950 hover:bg-[#0da673]"
              }`}
            >
              {step.action}
            </motion.button>
          </div>

          {/* Subtle glow ring at the bottom of the card */}
          <div className="absolute -bottom-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#10b981]/60 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
