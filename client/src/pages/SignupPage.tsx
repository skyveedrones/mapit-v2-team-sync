/**
 * Signup Page — Clerk SignUp
 * Wraps Clerk's <SignUp /> in the MAPIT dark glassmorphism shell.
 * Preserves checkout intent: if a priceId is stored in sessionStorage,
 * redirects to /checkout-redirect after signup instead of /dashboard.
 */

import { SignUp } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function SignupPage() {
  const [redirectUrl, setRedirectUrl] = useState("/dashboard");

  useEffect(() => {
    // Check if there's a checkout intent stored before the auth flow
    const checkoutIntent = sessionStorage.getItem("checkoutIntent");
    if (checkoutIntent) {
      setRedirectUrl("/checkout-redirect");
    }
  }, []);

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A]">
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-emerald-950/30 blur-[120px]" />
      </div>

      {/* Top-left branding — removed per UI spec */}

      {/* Plan context pill — removed per UI spec */}

      {/* Clerk SignUp card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          forceRedirectUrl={redirectUrl}
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
              cardBox: "[&_img]:h-16 [&_img]:w-auto",
              headerSubtitle: "text-white/50",
              formButtonPrimary:
                "bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-semibold",
              formFieldInput:
                "bg-white/5 border border-white/10 text-white placeholder-white/25 focus:border-emerald-500/50 focus:ring-emerald-500/10",
              formFieldLabel: "text-white/60 text-xs uppercase tracking-wider",
              logoImage: "h-16 w-auto",
              footerActionLink: "text-emerald-400 hover:text-emerald-300",
              dividerLine: "bg-white/10",
              cardHeader: "[&_img]:h-16 [&_img]:w-auto",
              imageElement: "h-16 w-auto",
              dividerText: "text-white/30",
              headerImage: "h-16 w-auto",
              organizationSwitcherTrigger: "[&_img]:h-16 [&_img]:w-auto",
              socialButtonsBlockButton:
                "bg-white/5 border border-white/12 text-white/60 hover:bg-white/9 hover:text-white/80",
              socialButtonsBlockButtonText: "text-white/60 text-xs uppercase tracking-wider font-semibold",
              alert: "bg-red-900/30 border border-red-500/30 text-red-300",
              internal: {
                formButtonPrimary__loader: "text-emerald-400",
                cards__cardBox: "[&_img]:h-16 [&_img]:w-auto",
              },
            },
          }}
        />
      </motion.div>
    </div>
  );
}
