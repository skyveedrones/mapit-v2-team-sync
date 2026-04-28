/**
 * Checkout Redirect Page
 * Auto-launches Stripe Checkout if checkout intent is stored in sessionStorage.
 * Redirects to /dashboard if no intent is found.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutRedirect() {
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(true);
  const createCheckoutSession = trpc.payment.createCheckoutSession.useMutation();

  useEffect(() => {
    const processCheckoutIntent = async () => {
      try {
        // Check for stored checkout intent
        const storedIntent = sessionStorage.getItem("checkoutIntent");
        
        if (!storedIntent) {
          console.log("[CheckoutRedirect] No checkout intent found, redirecting to dashboard");
          navigate("/dashboard");
          return;
        }

        const { priceId, planId, planName, billingPeriod } = JSON.parse(storedIntent);
        console.log("[CheckoutRedirect] Processing checkout intent:", { priceId, planId, planName });

        // Clear the intent immediately to prevent double-processing
        sessionStorage.removeItem("checkoutIntent");

        // Create Stripe Checkout session
        const result = await createCheckoutSession.mutateAsync({
          priceId,
          planId,
          planName,
        });

        if (result.checkoutUrl) {
          console.log("[CheckoutRedirect] Redirecting to Stripe Checkout");
          window.location.href = result.checkoutUrl;
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (error) {
        console.error("[CheckoutRedirect] Error processing checkout:", error);
        toast.error("Failed to start checkout. Please try again.");
        navigate("/pricing");
      } finally {
        setIsProcessing(false);
      }
    };

    processCheckoutIntent();
  }, [navigate, createCheckoutSession]);

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A]">
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-emerald-950/30 blur-[120px]" />
      </div>

      {/* Loading state */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Preparing your checkout...
          </h2>
          <p className="text-white/50 text-sm">
            You'll be redirected to Stripe in a moment
          </p>
        </div>
      </div>
    </div>
  );
}
