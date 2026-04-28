/**
 * Login Page — Clerk SignIn
 * Wraps Clerk's <SignIn /> in the existing MAPIT dark glassmorphism shell.
 * If a checkoutIntent is stored in sessionStorage, redirects to /checkout-redirect
 * after successful login instead of /dashboard.
 */

import { SignIn } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { motion } from "framer-motion";

function getPostLoginRedirect(): string {
  try {
    const intent = sessionStorage.getItem("checkoutIntent");
    if (intent) {
      const parsed = JSON.parse(intent);
      if (parsed?.priceId) return "/checkout-redirect";
    }
  } catch {
    // ignore
  }
  return "/dashboard";
}

export default function Login() {
  const redirectUrl = getPostLoginRedirect();

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
      </div>

      {/* Checkout intent context pill */}
      {redirectUrl === "/checkout-redirect" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 mb-6 px-4 py-2 rounded-full text-sm font-medium text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-md"
        >
          Sign in to continue to your selected plan
        </motion.div>
      )}

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
          forceRedirectUrl={redirectUrl}
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: "#FFFFFF",
              colorBackground: "#111111",
              colorText: "#FFFFFF",
              colorTextSecondary: "rgba(255,255,255,0.5)",
              colorInputBackground: "rgba(255,255,255,0.06)",
              colorInputText: "#ffffff",
              borderRadius: "0.75rem",
              fontFamily: "Inter, sans-serif",
            },
            elements: {
              card: "border border-white/10 shadow-2xl backdrop-blur-md",
              headerTitle: "text-white font-bold",
              headerSubtitle: "text-white/50",
              formButtonPrimary: "text-black font-bold hover:bg-zinc-200",
              formFieldInput:
                "bg-white/5 border border-white/10 text-white placeholder-white/25 focus:border-white/30 focus:ring-white/10",
              formFieldLabel: "text-white/60 text-xs uppercase tracking-wider",
              footerActionLink: "text-white/70 hover:text-white",
              identityPreviewText: "text-white",
              identityPreviewEditButton: "text-white/70",
              dividerLine: "bg-white/10",
              dividerText: "text-white/30",
              socialButtonsIconButton: "border-white/10 hover:bg-white/5",
              socialButtonsBlockButton:
                "bg-white/5 border border-white/10 text-white hover:bg-white/10",
              socialButtonsBlockButtonText: "text-white font-medium",
              socialButtonsBlockButtonArrow: "text-white",
              socialButtonsProviderIcon: "brightness-0 invert",
              alert: "bg-red-900/30 border border-red-500/30 text-red-300",
              footer: "hidden",
            },
          }}
        />
      </motion.div>
    </div>
  );
}
