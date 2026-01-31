import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const plans = [
  {
    name: "Starter",
    description: "Perfect for individual drone pilots and freelancers",
    monthlyPrice: 49,
    annualPrice: 490,
    features: [
      { text: "Up to 5 active projects", included: true },
      { text: "10 GB storage per project", included: true },
      { text: "Unlimited photo/video uploads", included: true },
      { text: "GPS tagging and flight paths", included: true },
      { text: "Basic PDF reports", included: true },
      { text: "KML & CSV export", included: true },
      { text: "Email support (48h)", included: true },
      { text: "Team collaboration", included: false },
      { text: "White-labeling", included: false },
      { text: "API access", included: false },
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    description: "For professional drone service providers",
    monthlyPrice: 149,
    annualPrice: 1490,
    features: [
      { text: "Unlimited active projects", included: true },
      { text: "50 GB storage per project", included: true },
      { text: "All Starter features", included: true },
      { text: "Advanced map controls", included: true },
      { text: "Marker clustering", included: true },
      { text: "All export formats (KML, CSV, GeoJSON, GPX)", included: true },
      { text: "Up to 5 team members", included: true },
      { text: "White-labeling & custom branding", included: true },
      { text: "Client sharing links", included: true },
      { text: "Priority support (24h)", included: true },
      { text: "API access", included: false },
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Business",
    description: "For growing companies and teams",
    monthlyPrice: 349,
    annualPrice: 3490,
    features: [
      { text: "Unlimited active projects", included: true },
      { text: "200 GB storage per project", included: true },
      { text: "All Professional features", included: true },
      { text: "Priority processing", included: true },
      { text: "Unlimited team members", included: true },
      { text: "Role-based access control", included: true },
      { text: "API access & integrations", included: true },
      { text: "Custom report templates", included: true },
      { text: "Dedicated support (12h)", included: true },
      { text: "Quarterly business reviews", included: true },
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Enterprise",
    description: "For large organizations with custom needs",
    monthlyPrice: null,
    annualPrice: null,
    customPricing: true,
    features: [
      { text: "Unlimited everything", included: true },
      { text: "All Business features", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Custom integrations", included: true },
      { text: "SSO & advanced security", included: true },
      { text: "On-premise deployment options", included: true },
      { text: "Custom SLA", included: true },
      { text: "Priority support (4h)", included: true },
      { text: "Custom training & onboarding", included: true },
      { text: "Early access to beta features", included: true },
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");

  const handleGetStarted = (planName: string) => {
    if (planName === "Enterprise") {
      // TODO: Add contact sales functionality
      alert("Contact sales functionality coming soon!");
    } else {
      // TODO: Add subscription/checkout functionality
      alert(`Starting free trial for ${planName} plan. Checkout integration coming soon!`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-16">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img
              src="/images/mapit-logo-new.png"
              alt="Mapit"
              className="h-8"
            />
          </button>
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            Go to Dashboard
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            Choose the perfect plan for your drone mapping needs. All plans include a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1 bg-slate-800/50 rounded-lg border border-slate-700">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === "monthly"
                  ? "bg-emerald-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === "annual"
                  ? "bg-emerald-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative p-6 bg-slate-900/50 border-slate-800 hover:border-emerald-500/50 transition-all ${
                plan.popular ? "ring-2 ring-emerald-500/50 scale-105" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{plan.description}</p>

                {plan.customPricing ? (
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-white">Custom</span>
                  </div>
                ) : (
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">
                      ${billingPeriod === "monthly" ? plan.monthlyPrice : plan.annualPrice}
                    </span>
                    <span className="text-slate-400 ml-2">
                      {billingPeriod === "monthly" ? "/month" : "/year"}
                    </span>
                  </div>
                )}
              </div>

              <Button
                onClick={() => handleGetStarted(plan.name)}
                className={`w-full mb-6 ${
                  plan.popular
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-white"
                }`}
              >
                {plan.cta}
              </Button>

              <ul className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`text-sm ${
                        feature.included ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container py-16 border-t border-slate-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Can I try Mapit before subscribing?
              </h3>
              <p className="text-slate-400">
                Yes! All plans include a 14-day free trial with full access to features. No credit card required to start.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Can I change or cancel my subscription?
              </h3>
              <p className="text-slate-400">
                You can upgrade, downgrade, or cancel your subscription at any time from your account settings. Changes take effect at the end of your current billing cycle.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-400">
                We accept all major credit cards (Visa, MasterCard, American Express) and wire transfers for annual Enterprise plans.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What happens to my data if I cancel?
              </h3>
              <p className="text-slate-400">
                You can export all your project data (photos, videos, GPS data, reports) before canceling. We retain your data for 30 days after cancellation in case you want to reactivate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to elevate your drone mapping?
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => handleGetStarted("Professional")}
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-lg px-8"
            >
              Start Free Trial
            </Button>
            <Button
              onClick={() => handleGetStarted("Enterprise")}
              size="lg"
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-lg px-8"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="container text-center text-slate-500 text-sm">
          <p>&copy; 2026 Mapit. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
