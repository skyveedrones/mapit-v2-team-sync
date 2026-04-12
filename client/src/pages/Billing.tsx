import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowLeft, Calendar, CreditCard, Download, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

const PLAN_FEATURES = {
  free: {
    name: "Free",
    price: "$0",
    features: [
      "Up to 5 projects",
      "Up to 100 media files",
      "Basic GPS export (KML, CSV)",
      "Community support",
    ],
  },
  starter: {
    name: "Experience",
    price: "$49",
    period: "/month",
    features: [
      "100 GB Storage",
      "10 Projects",
      "CAD Overlay Basics",
      "Email Support",
      "14-Day Free Trial",
    ],
  },
  professional: {
    name: "Precision",
    price: "$149",
    period: "/month",
    features: [
      "500 GB Storage",
      "Unlimited Projects",
      "5 Stakeholder Seats",
      "Sub-Surface Verification Docs",
      "Priority Email Support",
    ],
  },
  business: {
    name: "Scale",
    price: "$349",
    period: "/month",
    features: [
      "1.5 TB Storage",
      "Unlimited Stakeholder Viewing",
      "API Access",
      "Priority Processing",
      "Dedicated Account Manager",
    ],
  },
};

export default function Billing() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const createPortalSession = trpc.payment.createPortalSession.useMutation();

  const handleManageBilling = async () => {
    setIsPortalLoading(true);
    try {
      const result = await createPortalSession.mutateAsync();
      if (result.portalUrl) {
        window.open(result.portalUrl, "_blank");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Failed to open billing portal. Please try again.");
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin">
          <Zap className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  const currentPlan = user.subscriptionTier || "free";
  const currentPlanData = PLAN_FEATURES[currentPlan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.free;
  const billingPeriod = user.billingPeriod || "month";
  const nextBillingDate = user.currentPeriodEnd ? new Date(user.currentPeriodEnd) : null;

  const createCheckoutMutation = trpc.payment.createCheckoutSession.useMutation();

  const handleUpgrade = async (plan: string) => {
    setIsUpgrading(true);
    try {
      const period = billingPeriod === "annual" ? "annual" : "monthly";
      const priceId = getPriceId(plan, period);

      if (!priceId) {
        toast.error("Plan not available");
        return;
      }

      const result = await createCheckoutMutation.mutateAsync({
        priceId,
        planId: plan,
      });

      if (result.checkoutUrl) {
        window.open(result.checkoutUrl, "_blank");
        toast.success("Redirecting to checkout...");
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const getPriceId = (plan: string, period: string): string | null => {
    const priceMap: Record<string, Record<string, string>> = {
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
    return priceMap[plan]?.[period] || null;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container py-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and billing information
          </p>
        </div>
      </div>

      <div className="container py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Current Plan Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold">{currentPlanData.name}</h3>
                    {currentPlan !== "free" && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan === "free"
                      ? "Free tier"
                      : `${currentPlanData.price}${(currentPlanData as any).period || ""}`}
                  </p>
                </div>

                {currentPlan !== "free" && nextBillingDate && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Next billing date:</span>
                    </div>
                    <p className="font-medium">
                      {format(nextBillingDate, "MMMM d, yyyy")}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Included features:</h4>
                  <ul className="space-y-2">
                    {currentPlanData.features.map((feature, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {currentPlan !== "free" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleManageBilling}
                    disabled={isPortalLoading}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isPortalLoading ? "Opening portal..." : "Manage Payment Method"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Plans Grid */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Upgrade Your Plan</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(PLAN_FEATURES)
                  .filter(([key]) => key !== "free")
                  .map(([key, plan]) => (
                    <Card
                      key={key}
                      className={`relative ${
                        currentPlan === key ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      {currentPlan === key && (
                        <div className="absolute top-4 right-4">
                          <Badge>Current Plan</Badge>
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>
                          <span className="text-2xl font-bold text-foreground">
                            {plan.price}
                          </span>
                          <span className="text-muted-foreground">{(plan as any).period || ""}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ul className="space-y-2">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full"
                          disabled={currentPlan === key || isUpgrading}
                          onClick={() => handleUpgrade(key)}
                        >
                          {currentPlan === key ? "Current Plan" : "Start Your Trial"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}

                {/* Civic / Custom tier */}
                <Card className="relative md:col-span-2">
                  <CardHeader>
                    <CardTitle>Civic</CardTitle>
                    <CardDescription>
                      <span className="text-2xl font-bold text-foreground">Custom</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="grid grid-cols-2 gap-2">
                      {[
                        "White-Label City Portals",
                        "On-Site Training",
                        "SLA Guarantee",
                        "Dedicated Success Manager",
                        "Custom Integrations",
                      ].map((feature, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        window.location.href = "mailto:clay@skyveedrones.com?subject=MAPIT%20Civic%20Inquiry";
                      }}
                    >
                      Contact Sales
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Billing History */}
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>
                  Your recent invoices and payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentPlan === "free" ? (
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No billing history for free tier
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                      <Download className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Latest Invoice</p>
                        <p className="text-xs text-muted-foreground">
                          {nextBillingDate && format(nextBillingDate, "MMMM d, yyyy")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleManageBilling}
                        disabled={isPortalLoading}
                      >
                        {isPortalLoading ? "Opening..." : "View in Portal"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Manage Billing footer link */}
            {currentPlan !== "free" && (
              <div className="text-center pt-2">
                <button
                  onClick={handleManageBilling}
                  disabled={isPortalLoading}
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                >
                  {isPortalLoading ? "Opening Stripe portal..." : "Manage Billing & Payment History →"}
                </button>
              </div>
            )}

            {/* Help Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Have questions about your subscription?{" "}
                  <a href="mailto:clay@skyveedrones.com" className="text-primary hover:underline">
                    Contact support
                  </a>.
                </p>
                <p>
                  You can cancel your subscription anytime from the Stripe billing portal. No questions asked.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
