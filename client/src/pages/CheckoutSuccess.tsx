/**
 * Checkout Success Page
 * Shown after Stripe redirects back to /checkout-success.
 * Confirms subscription/trial is active and routes user to dashboard.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [planName, setPlanName] = useState<string | null>(null);

  useEffect(() => {
    // Try to read the plan name from the URL param Stripe appends, or from stored intent
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    if (planParam) {
      setPlanName(decodeURIComponent(planParam));
    } else {
      try {
        const intent = sessionStorage.getItem("checkoutIntent");
        if (intent) {
          const parsed = JSON.parse(intent);
          if (parsed?.planName) setPlanName(parsed.planName);
        }
      } catch {
        // ignore
      }
    }
    // Clear checkout intent after successful payment
    try { sessionStorage.removeItem("checkoutIntent"); } catch { /* ignore */ }
  }, []);

  const handleGoToDashboard = () => setLocation("/dashboard");

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#0A0A0A", fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[700px] rounded-full bg-emerald-950/25 blur-[140px]" />
      </div>

      {/* Top-left branding */}
      <div className="absolute top-6 left-8 z-10">
        <img
          src="/images/mapit-logo.webp"
          alt="MAPIT"
          className="h-8 w-auto"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg"
      >
        {/* Check icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4"
        >
          You're in.
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-white/60 text-lg leading-relaxed mb-3"
        >
          {planName
            ? <>Your <span className="text-white font-semibold">{planName}</span> plan is now active.</>
            : "Your plan is now active."}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.48 }}
          className="text-white/40 text-sm mb-10"
        >
          Your 14-day trial has started. No charge until your trial ends.
        </motion.p>

        {/* Pill details */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.55 }}
          className="flex flex-wrap gap-3 justify-center mb-10"
        >
          {[
            "Full platform access",
            "14-day free trial",
            "Cancel anytime",
          ].map((item) => (
            <span
              key={item}
              className="px-3 py-1 rounded-full text-xs font-medium text-emerald-400 border border-emerald-500/20 bg-emerald-500/10"
            >
              {item}
            </span>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.62 }}
          onClick={handleGoToDashboard}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-black bg-white hover:bg-zinc-100 transition-colors duration-200 shadow-lg disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Enter Your Dashboard
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>

        {/* User greeting */}
        {!loading && user && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-white/30 text-sm"
          >
            Signed in as {user.email}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
