/**
 * Login Page — Clerk SignIn
 * Wraps Clerk's <SignIn /> in the existing MAPIT dark glassmorphism shell.
 */

import { SignIn } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { Map } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A]">
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-emerald-950/30 blur-[120px]" />
      </div>

      {/* Top-left branding */}
      <div className="absolute top-6 left-8 z-10 flex items-center gap-2">
        <img
          src="/images/mapit-logo.webp"
          alt="MAPIT"
          className="h-8 w-auto"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span
          className="text-white text-xl font-bold tracking-widest"
          style={{ fontFamily: "var(--font-display)" }}
        >
          MAP<span className="text-emerald-400">i</span>T
        </span>
      </div>

      {/* Clerk SignIn card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/signup"
          forceRedirectUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary: "#10b981",
              colorBackground: "rgba(10,10,10,0.95)",
              colorText: "#ffffff",
              colorTextSecondary: "rgba(255,255,255,0.5)",
              colorInputBackground: "rgba(255,255,255,0.06)",
              colorInputText: "#ffffff",
              borderRadius: "0.75rem",
              fontFamily: "Inter, sans-serif",
            },
            elements: {
              card: "bg-transparent shadow-none border-0",
              headerTitle: "text-white font-bold",
              headerSubtitle: "text-white/50",
              formButtonPrimary:
                "bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-semibold",
              formFieldInput:
                "bg-white/5 border border-white/10 text-white placeholder-white/25 focus:border-emerald-500/50 focus:ring-emerald-500/10",
              formFieldLabel: "text-white/60 text-xs uppercase tracking-wider",
              footerActionLink: "text-emerald-400 hover:text-emerald-300",
              identityPreviewText: "text-white",
              identityPreviewEditButton: "text-emerald-400",
              dividerLine: "bg-white/10",
              dividerText: "text-white/30",
              socialButtonsBlockButton:
                "bg-white/5 border border-white/12 text-white/80 hover:bg-white/9 hover:text-white",
              socialButtonsBlockButtonText: "text-white/80",
              alert: "bg-red-900/30 border border-red-500/30 text-red-300",
            },
          }}
        />
      </motion.div>
    </div>
  );
}
