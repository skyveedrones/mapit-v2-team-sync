/**
 * Account Page — User subscriber info, plan details, activation date
 * Uses DashboardLayout for consistent navigation
 */

import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Crown,
  Mail,
  Shield,
  User as UserIcon,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

/** Map tier to display name */
const TIER_DISPLAY: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  free: { label: "Free Trial", color: "bg-slate-600", icon: Clock },
  starter: { label: "Starter", color: "bg-blue-600", icon: CheckCircle2 },
  professional: { label: "Professional", color: "bg-emerald-600", icon: Crown },
  business: { label: "Business", color: "bg-amber-600", icon: Crown },
  enterprise: { label: "Enterprise", color: "bg-purple-600", icon: Shield },
};

/** Map subscription status to badge variant */
function getStatusBadge(status: string | null | undefined) {
  switch (status) {
    case "active":
      return { label: "Active", variant: "default" as const, icon: CheckCircle2, className: "bg-emerald-600 hover:bg-emerald-700" };
    case "trialing":
      return { label: "Trial", variant: "default" as const, icon: Clock, className: "bg-blue-600 hover:bg-blue-700" };
    case "past_due":
      return { label: "Past Due", variant: "destructive" as const, icon: AlertTriangle, className: "" };
    case "canceled":
      return { label: "Canceled", variant: "destructive" as const, icon: XCircle, className: "" };
    case "incomplete":
      return { label: "Incomplete", variant: "secondary" as const, icon: AlertTriangle, className: "" };
    default:
      return { label: "Free", variant: "secondary" as const, icon: Clock, className: "" };
  }
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Account() {
  const { user } = useAuth();

  if (!user) return null;

  const tier = (user as any).subscriptionTier || "free";
  const tierInfo = TIER_DISPLAY[tier] || TIER_DISPLAY.free;
  const TierIcon = tierInfo.icon;
  const statusInfo = getStatusBadge((user as any).subscriptionStatus);
  const StatusIcon = statusInfo.icon;

  const billingPeriod = (user as any).billingPeriod;
  const periodStart = (user as any).currentPeriodStart;
  const periodEnd = (user as any).currentPeriodEnd;
  const cancelAtEnd = (user as any).cancelAtPeriodEnd === "yes";
  const createdAt = (user as any).createdAt;
  const lastSignedIn = (user as any).lastSignedIn;
  const organization = (user as any).organization;
  const stripeCustomerId = (user as any).stripeCustomerId;

  return (
    <DashboardLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Back to Dashboard */}
        <motion.div variants={fadeInUp}>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </motion.div>

        {/* Page Header */}
        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-bold mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              My Account
            </h1>
            <p className="text-muted-foreground text-sm">
              View your account information, subscription details, and billing status.
            </p>
          </div>
          <Link href="/pricing">
            <Button variant="outline" className="gap-2">
              <Crown className="h-4 w-4" />
              {tier === "free" ? "Upgrade Plan" : "Change Plan"}
            </Button>
          </Link>
        </motion.div>

        {/* Plan Overview Card */}
        <motion.div variants={fadeInUp}>
          <Card className="border-primary/20 overflow-hidden">
            <div className={`h-1.5 ${tierInfo.color}`} />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TierIcon className="h-5 w-5 text-primary" />
                  Subscription Plan
                </CardTitle>
                <Badge className={statusInfo.className} variant={statusInfo.variant}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-xl ${tierInfo.color} flex items-center justify-center`}>
                  <TierIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    {tierInfo.label}
                  </h3>
                  {billingPeriod && (
                    <p className="text-sm text-muted-foreground capitalize">
                      {billingPeriod} billing
                    </p>
                  )}
                </div>
              </div>

              {cancelAtEnd && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-destructive">
                    Your subscription will cancel at the end of the current billing period.
                  </p>
                </div>
              )}

              {(periodStart || periodEnd) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Period Start</p>
                      <p className="text-sm font-medium">{formatShortDate(periodStart)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Period End</p>
                      <p className="text-sm font-medium">{formatShortDate(periodEnd)}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Information */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Full Name</p>
                  <p className="text-sm font-medium">{user.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email Address</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">{user.email || "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Organization</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">{organization || "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Account Role</p>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <Badge variant="outline" className="capitalize text-xs">
                      {user.role || "user"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity & Dates */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Account Created</p>
                  <p className="text-sm font-medium">{formatDate(createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Sign In</p>
                  <p className="text-sm font-medium">{formatDate(lastSignedIn)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Billing */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Customer ID</p>
                  <p className="text-sm font-mono text-muted-foreground">
                    {stripeCustomerId || "Not connected"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Billing Period</p>
                  <p className="text-sm font-medium capitalize">{billingPeriod || "—"}</p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/pricing">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Crown className="h-3.5 w-3.5" />
                    {tier === "free" ? "Upgrade Plan" : "Manage Plan"}
                  </Button>
                </Link>
                <Link href="/billing">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Payment History
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Help text */}
        <motion.div variants={fadeInUp}>
          <p className="text-xs text-muted-foreground text-center pb-6">
            Need help with your account? Contact support at{" "}
            <a href="mailto:support@skyveedrones.com" className="text-primary hover:underline">
              support@skyveedrones.com
            </a>
          </p>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
