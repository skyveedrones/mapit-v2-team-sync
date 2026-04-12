import { Card } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { getLoginUrl } from "@/const";
import { GlobalHamburgerHeader } from "@/components/GlobalHamburgerHeader";
import { ContactSalesModal } from "@/components/ContactSalesModal";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Plan {
  hook: string;
  name: string;
  price: string;
  period: string;
  desc: string;
  buttonText: string;
  features: string[];
  isFeatured: boolean;
  isCustom?: boolean;
  isFree?: boolean;
  tierId?: "starter" | "professional" | "business";
}

const PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  starter: {
    monthly: "price_1T6Xu3GEMT6mikKwPibBZGCg",
    annual: "price_1T6Xu4GEMT6mikKwqmc0MCVL",
  },
  professional: {
    monthly: "price_1T6Xu4GEMT6mikKwINYKHcuI",
    annual: "price_1T6Xu4GEMT6mikKwqgE63wB7",
  },
  business: {
    monthly: "price_1T6Xu5GEMT6mikKwaxgTw2dy",
    annual: "price_1T6Xu5GEMT6mikKwCUBCrmlB",
  },
};

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);

  const referralId =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("ref") ??
          localStorage.getItem("mapit_ref_code") ??
          undefined)
      : undefined;

  const createCheckout = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      setLoadingPlan(null);
      toast.info("Redirecting to checkout...");
      window.open(data.checkoutUrl, "_blank");
    },
    onError: (err) => {
      setLoadingPlan(null);
      if (err.message.includes("login") || err.data?.code === "UNAUTHORIZED") {
        window.location.href = getLoginUrl();
      } else {
        toast.error("Failed to start checkout. Please try again.");
      }
    },
  });

  const plans: Plan[] = [
    {
      hook: "Experience",
      name: "PILOT",
      price: isAnnual ? "41.65" : "49",
      period: "/month",
      desc: "Built for individual operators who move fast.",
      buttonText: "Get Started",
      features: [
        "100 GB Storage",
        "10 Projects",
        "CAD Overlay Basics",
        "GPS Export (KML, CSV, GPX)",
        "Email Support",
      ],
      isFeatured: false,
      tierId: "starter",
    },
    {
      hook: "Precision",
      name: "MUNICIPAL",
      price: isAnnual ? "126.65" : "149",
      period: "/month",
      desc: "Precision mapping for town & city departments.",
      buttonText: "Start Free Trial",
      features: [
        "500 GB Storage",
        "Unlimited Projects",
        "Up to 5 Stakeholder Seats",
        "Sub-Surface Verification Docs",
        "PDF Report Generation",
        "Priority Support",
      ],
      isFeatured: true,
      tierId: "professional",
    },
    {
      hook: "Dominance",
      name: "AGENCY",
      price: isAnnual ? "296.65" : "349",
      period: "/month",
      desc: "Engineered for high-volume engineering firms.",
      buttonText: "Start Free Trial",
      features: [
        "1.5 TB Storage",
        "Unlimited Stakeholder Viewing",
        "API Access",
        "Priority Processing",
        "White-label Reports",
        "Dedicated Account Manager",
      ],
      isFeatured: false,
      tierId: "business",
    },
    {
      hook: "Command",
      name: "METROPOLITAN",
      price: "Custom",
      period: "",
      desc: "Solutions for large-scale urban infrastructure.",
      buttonText: "Contact Sales",
      features: [
        "White-label City Portals",
        "On-site Training",
        "SLA Guarantee",
        "Dedicated Success Manager",
      ],
      isFeatured: false,
      isCustom: true,
    },
  ];

  const handleGetStarted = (plan: Plan) => {
    if (plan.isCustom) {
      setShowContactSalesModal(true);
      return;
    }
    if (plan.isFree) {
      window.location.href = getLoginUrl();
      return;
    }
    if (!plan.tierId) return;

    const priceId = isAnnual
      ? PRICE_IDS[plan.tierId].annual
      : PRICE_IDS[plan.tierId].monthly;

    setLoadingPlan(plan.name);
    createCheckout.mutate({
      priceId,
      planId: plan.tierId,
      planName: plan.name,
      referralId,
      trialDays: 14,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <GlobalHamburgerHeader />

      {/* ── Hero ── */}
      <section className="container pt-36 pb-16 md:pt-44 md:pb-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          {/* Free trial callout */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            14-day free trial — no credit card required
          </div>

          <h1
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
              Choose your
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 bg-clip-text text-transparent">
              level of control
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-10">
            From solo pilot to full agency — every plan ships with a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-slate-800/60 rounded-full border border-slate-700/60">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
                !isAnnual
                  ? "bg-white text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-all flex items-center gap-2 ${
                isAnnual
                  ? "bg-white text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Annual
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                Save 15%
              </span>
            </button>
          </div>
        </div>

        {/* ── Free Trial Banner ── */}
        <div className="max-w-6xl mx-auto mb-8">
          <div
            className="relative overflow-hidden rounded-2xl border border-emerald-500/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.02) 100%)",
            }}
          >
            <div>
              <p className="text-xs font-bold tracking-widest text-emerald-400 uppercase mb-1">
                Complimentary
              </p>
              <h3
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                14-Day Free Trial
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                Upload your first project. See your job site from above. No card needed.
              </p>
            </div>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-slate-500 text-xs">for 14 days</span>
            </div>
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-full px-8 py-3 text-base flex-shrink-0 hover:drop-shadow-[0_0_16px_rgba(16,185,129,0.5)] transition-all"
            >
              Start Free Trial
            </Button>
          </div>
        </div>

        {/* ── Pricing Cards ── */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-start">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative p-6 border transition-all flex flex-col ${
                plan.isFeatured
                  ? "bg-slate-900 border-emerald-500/60 ring-2 ring-emerald-500/30 scale-105 shadow-[0_0_40px_rgba(16,185,129,0.12)]"
                  : "bg-slate-900/50 border-slate-800 hover:border-emerald-500/30"
              }`}
            >
              {plan.isFeatured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap tracking-wide">
                  Most Popular
                </div>
              )}

              {/* Hook word */}
              <p className="text-xs font-bold tracking-widest text-emerald-500/70 uppercase mb-1">
                {plan.hook}
              </p>

              {/* Plan Name */}
              <h3
                className={`text-xl font-bold mb-1 tracking-wide ${
                  plan.isFeatured ? "text-emerald-400" : "text-white"
                }`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {plan.name}
              </h3>

              {/* Description */}
              <p className="text-slate-400 text-sm mb-4 leading-snug">{plan.desc}</p>

              {/* Price */}
              <div className="mb-5">
                {plan.isCustom ? (
                  <span className="text-3xl font-bold text-white">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    <span className="text-slate-400 ml-1 text-sm">{plan.period}</span>
                    {isAnnual && !plan.isCustom && (
                      <p className="text-xs text-emerald-400 mt-1">
                        Billed ${(parseFloat(plan.price) * 12).toFixed(2)}/yr · 15% off
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handleGetStarted(plan)}
                disabled={loadingPlan === plan.name}
                className={`w-full mb-6 rounded-full font-semibold transition-all ${
                  plan.isFeatured
                    ? "bg-[#10b981] hover:bg-[#0da673] text-slate-950 hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    : plan.isCustom
                    ? "bg-slate-700 hover:bg-slate-600 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-white"
                }`}
              >
                {loadingPlan === plan.name ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Processing...
                  </>
                ) : (
                  plan.buttonText
                )}
              </Button>

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="container py-16 border-t border-slate-800">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-3xl font-bold text-white text-center mb-12"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "Can I try MAPIT before subscribing?",
                a: "Yes — every plan includes a complimentary 14-day free trial. No credit card required. Upload your first project and experience the platform at full resolution.",
              },
              {
                q: "Can I change or cancel my subscription?",
                a: "You can upgrade, downgrade, or cancel at any time from your account settings. Changes take effect at the end of your current billing cycle.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards (Visa, MasterCard, American Express) and wire transfers for annual METROPOLITAN plans.",
              },
              {
                q: "What happens to my data if I cancel?",
                a: "You can export all project data (photos, videos, GPS data, reports) before canceling. We retain your data for 30 days after cancellation.",
              },
              {
                q: "How much storage do I get?",
                a: "Storage scales with your plan: PILOT 100 GB, MUNICIPAL 500 GB, AGENCY 1.5 TB, METROPOLITAN unlimited.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 className="text-lg font-semibold text-white mb-2">{q}</h3>
                <p className="text-slate-400">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="container py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your job site.
            <br />
            <span className="text-emerald-400">From above.</span>
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Start free. Scale when you're ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              size="lg"
              className="bg-[#10b981] hover:bg-[#0da673] text-slate-950 font-bold text-lg px-10 rounded-full hover:drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              Start Free Trial
            </Button>
            <Button
              onClick={() => setShowContactSalesModal(true)}
              size="lg"
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-lg px-10 rounded-full"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      <ContactSalesModal
        open={showContactSalesModal}
        onOpenChange={setShowContactSalesModal}
      />
    </div>
  );
}
