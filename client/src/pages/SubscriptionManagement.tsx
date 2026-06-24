import { useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  BarChart3,
  Users,
  FolderOpen,
  Image,
} from "lucide-react";
import { PLAN_LIMITS } from "@shared/planLimits";

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  starter: "Experience",
  professional: "Precision",
  business: "Scale",
  civic: "Civic",
};

const PLAN_PRICES: Record<string, string> = {
  free: "$0/mo",
  starter: "$49/mo",
  professional: "$149/mo",
  business: "$349/mo",
  civic: "Custom",
};

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Active", variant: "default" },
    trialing: { label: "Trial", variant: "secondary" },
    past_due: { label: "Past Due", variant: "destructive" },
    canceled: { label: "Canceled", variant: "destructive" },
    unpaid: { label: "Unpaid", variant: "destructive" },
    incomplete: { label: "Incomplete", variant: "outline" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function UsageBar({ label, used, max, icon: Icon }: { label: string; used: number; max: number; icon: any }) {
  const pct = max === -1 ? 0 : Math.min(100, Math.round((used / max) * 100));
  const unlimited = max === -1;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="font-medium">
          {used} / {unlimited ? "∞" : max}
        </span>
      </div>
      {!unlimited && (
        <Progress
          value={pct}
          className={`h-1.5 ${pct >= 90 ? "[&>div]:bg-destructive" : pct >= 70 ? "[&>div]:bg-amber-500" : ""}`}
        />
      )}
    </div>
  );
}

export default function SubscriptionManagement() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const { data: subData, isLoading: subLoading, refetch: refetchSub } =
    trpc.payment.getSubscriptionStatus.useQuery();

  const { data: historyData, isLoading: historyLoading } =
    trpc.payment.getBillingHistory.useQuery();

  const { data: usageData } = trpc.account.getUsageStats.useQuery();

  const cancelMutation = trpc.payment.cancelSubscription.useMutation();
  const reactivateMutation = trpc.payment.reactivateSubscription.useMutation();
  const portalMutation = trpc.payment.createPortalSession.useMutation();

  const tier = (subData?.subscriptionTier ?? user?.subscriptionTier ?? "free") as string;
  const limits = PLAN_LIMITS[tier as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
  const isFree = tier === "free";
  const isCanceling_ = subData?.cancelAtPeriodEnd === "yes";
  const periodEnd = subData?.currentPeriodEnd ? new Date(subData.currentPeriodEnd) : null;
  const trialEnd = subData?.trialEndsAt ? new Date(subData.trialEndsAt) : null;

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      await cancelMutation.mutateAsync({ immediately: false });
      await refetchSub();
      toast.success("Subscription will cancel at the end of the billing period.");
    } catch {
      toast.error("Failed to cancel subscription. Please try again.");
    } finally {
      setIsCanceling(false);
      setCancelDialogOpen(false);
    }
  };

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      await reactivateMutation.mutateAsync();
      await refetchSub();
      toast.success("Subscription reactivated! You will continue to be billed normally.");
    } catch {
      toast.error("Failed to reactivate subscription. Please try again.");
    } finally {
      setIsReactivating(false);
    }
  };

  const handleOpenPortal = async () => {
    setIsPortalLoading(true);
    try {
      const result = await portalMutation.mutateAsync();
      if (result.portalUrl) window.open(result.portalUrl, "_blank");
    } catch {
      toast.error("Failed to open billing portal. Please try again.");
    } finally {
      setIsPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Subscription</h1>
            <p className="text-sm text-muted-foreground">Manage your plan, billing, and usage</p>
          </div>
        </div>

        {/* Current Plan Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {PLAN_NAMES[tier] ?? tier} Plan
                </CardTitle>
                <CardDescription className="mt-1">
                  {PLAN_PRICES[tier] ?? "—"}
                  {subData?.billingPeriod === "annual" && " (billed annually)"}
                </CardDescription>
              </div>
              <StatusBadge status={subData?.subscriptionStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Trial notice */}
            {subData?.subscriptionStatus === "trialing" && trialEnd && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Your free trial ends on <strong>{format(trialEnd, "MMMM d, yyyy")}</strong>. Add a payment method to continue after the trial.
                </p>
              </div>
            )}

            {/* Cancel-at-period-end notice */}
            {isCanceling_ && periodEnd && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-destructive">Cancellation scheduled</p>
                  <p className="text-muted-foreground">
                    Your plan will downgrade to Free on <strong>{format(periodEnd, "MMMM d, yyyy")}</strong>.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReactivate}
                  disabled={isReactivating}
                  className="shrink-0"
                >
                  {isReactivating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Keep Plan"}
                </Button>
              </div>
            )}

            {/* Billing period */}
            {!isFree && periodEnd && !isCanceling_ && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Next billing date: <span className="font-medium text-foreground">{format(periodEnd, "MMMM d, yyyy")}</span>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {!isFree && !isCanceling_ && (
                <Button variant="outline" onClick={handleOpenPortal} disabled={isPortalLoading}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isPortalLoading ? "Opening..." : "Manage Payment Method"}
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate("/pricing")}>
                <Zap className="h-4 w-4 mr-2" />
                {isFree ? "Upgrade Plan" : "Change Plan"}
              </Button>
              {!isFree && !isCanceling_ && (
                <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      Cancel Subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your plan will remain active until{" "}
                        <strong>{periodEnd ? format(periodEnd, "MMMM d, yyyy") : "the end of the billing period"}</strong>.
                        After that, your account will downgrade to the Free tier and you may lose access to features and data above the Free plan limits.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep My Plan</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancel}
                        disabled={isCanceling}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isCanceling ? "Canceling..." : "Yes, Cancel"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Current Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageData ? (
              <>
                <UsageBar
                  label="Projects"
                  used={usageData.projectCount}
                  max={limits.maxProjects}
                  icon={FolderOpen}
                />
                <UsageBar
                  label="Media Files"
                  used={usageData.totalMedia}
                  max={limits.maxMediaFiles}
                  icon={Image}
                />
                <UsageBar
                  label="Team Members"
                  used={usageData.teamMemberCount}
                  max={limits.maxTeamMembers}
                  icon={Users}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading usage data...</p>
            )}
          </CardContent>
        </Card>

        {/* Billing History Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Billing History
            </CardTitle>
            <CardDescription>Your last 24 invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">Loading invoices...</p>
            ) : !historyData?.invoices?.length ? (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isFree ? "No billing history for the Free plan." : "No invoices found yet."}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {historyData.invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {inv.status === "paid" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : inv.status === "open" ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {inv.number ?? inv.id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(inv.created), "MMM d, yyyy")}
                          {inv.periodStart && inv.periodEnd
                            ? ` · ${format(new Date(inv.periodStart), "MMM d")}–${format(new Date(inv.periodEnd), "MMM d, yyyy")}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium">
                        {inv.status === "paid"
                          ? `$${(inv.amountPaid / 100).toFixed(2)}`
                          : `$${(inv.amountDue / 100).toFixed(2)}`}
                        {" "}
                        <span className="text-xs text-muted-foreground uppercase">{inv.currency}</span>
                      </span>
                      <Badge
                        variant={inv.status === "paid" ? "default" : inv.status === "open" ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {inv.status}
                      </Badge>
                      {(inv.invoicePdf || inv.hostedInvoiceUrl) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                        >
                          <a
                            href={inv.invoicePdf ?? inv.hostedInvoiceUrl ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isFree && (
              <div className="pt-3 border-t mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={handleOpenPortal}
                  disabled={isPortalLoading}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  {isPortalLoading ? "Opening..." : "View full history in Stripe portal"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help */}
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-1">
            <p>
              Questions about your bill?{" "}
              <a href="mailto:clay@skyveedrones.com" className="text-primary hover:underline">
                Contact support
              </a>
              .
            </p>
            <p>
              Cancellations take effect at the end of the current billing period. No partial refunds are issued.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
