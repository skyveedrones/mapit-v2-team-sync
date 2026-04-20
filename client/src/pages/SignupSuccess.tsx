/**
 * SignupSuccess — Jobsian confirmation screen shown immediately after sign-up.
 * Auto-redirects to /dashboard after 3 seconds.
 */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function SignupSuccess() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setLocation("/dashboard");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [setLocation]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "#0A0A0A", fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
    >
      {/* Ambient emerald glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="rounded-full"
          style={{
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Checkmark */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative z-10 mb-10"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(16,185,129,0.12)",
            border: "1.5px solid rgba(16,185,129,0.35)",
            boxShadow: "0 0 40px rgba(16,185,129,0.18)",
          }}
        >
          <motion.svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          >
            <motion.path
              d="M8 18l7 7 13-13"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
            />
          </motion.svg>
        </div>
      </motion.div>

      {/* Headline */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.55, ease: "easeOut" }}
        className="relative z-10 font-bold bg-clip-text text-transparent text-center mb-4"
        style={{
          fontSize: "clamp(2rem,5vw,3rem)",
          letterSpacing: "-0.04em",
          backgroundImage: "linear-gradient(160deg, #ffffff 0%, #d1d5db 50%, #6b7280 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1.08,
        }}
      >
        Welcome to MAPIT.
      </motion.p>

      {/* Sub-copy */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
        className="relative z-10 text-center mb-10"
        style={{ fontSize: "1rem", color: "rgba(255,255,255,0.45)", maxWidth: "360px", lineHeight: 1.6 }}
      >
        Your account is ready. Taking you to your dashboard now.
      </motion.p>

      {/* Countdown pill */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75, duration: 0.4 }}
        className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: "13px",
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.02em",
        }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: "#10b981", boxShadow: "0 0 6px rgba(16,185,129,0.6)" }}
        />
        Redirecting in {countdown}s
      </motion.div>

      {/* Skip link */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
        onClick={() => setLocation("/dashboard")}
        className="relative z-10 mt-6 transition-colors"
        style={{ fontSize: "13px", color: "rgba(255,255,255,0.22)" }}
        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.5)")}
        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.22)")}
      >
        Go now →
      </motion.button>
    </div>
  );
}
