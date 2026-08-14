import React from "react";
import { StudentSubscription } from "@/lib/subscriptions";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar, Clock, AlertTriangle, Sparkles, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface StudentWalletProps {
  subscription: StudentSubscription | null;
  onBrowsePlans?: () => void;
}

export function StudentWallet({ subscription, onBrowsePlans }: StudentWalletProps) {
  if (!subscription) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-dashed border-border bg-card p-8 text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
          <Sparkles className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-bold">No Active Subscription</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          You do not have an active session balance. Choose a plan to unlock live 1-on-1 language practice sessions.
        </p>
        {onBrowsePlans && (
          <button
            onClick={onBrowsePlans}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            Explore Subscription Plans
          </button>
        )}
      </motion.div>
    );
  }

  // Calculate session balance metrics
  const totalSessions = subscription.total_session_slots || 0;
  const remainingSessions = subscription.current_session_slots || 0;
  const bonusSlots = subscription.bonus_slots || 0;
  const totalUsableRemaining = remainingSessions + bonusSlots;
  const usedSessions = subscription.used_session_slots || 0;
  const usedPercentage = totalSessions > 0 ? Math.min(100, Math.max(0, (usedSessions / totalSessions) * 100)) : 0;

  // Snapshotted price or fallback to plan price
  const price = subscription.price_at_purchase ?? subscription.plan?.price ?? 0;
  const currency = subscription.currency_at_purchase ?? subscription.plan?.currency ?? "INR";
  const currencySymbol = currency === "INR" ? "₹" : "$";

  // Check statuses
  const isExpired = subscription.status === "expired" || (subscription.expires_at && new Date(subscription.expires_at) < new Date());
  const isLowBalance = !isExpired && totalUsableRemaining > 0 && totalUsableRemaining <= 2;
  const statusKey = isExpired ? "expired" : subscription.status;

  const statusBadges: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "ACTIVE", variant: "default" },
    expired: { label: "EXPIRED", variant: "destructive" },
    cancelled: { label: "CANCELLED", variant: "secondary" },
  };

  const currentBadge = statusBadges[statusKey] || { label: statusKey.toUpperCase(), variant: "outline" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Session Wallet Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-secondary/20 p-6 md:p-8 shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Left Title & Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session Wallet</span>
              <Badge variant={currentBadge.variant} className="px-3 py-1 text-xs font-bold tracking-wide">
                {currentBadge.label}
              </Badge>
            </div>
            <h2 className="text-2xl font-black md:text-3xl">
              {subscription.plan?.name || "Student Subscription"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Purchased for <span className="font-semibold text-foreground">{currencySymbol}{price.toFixed(2)}</span>
            </p>
          </div>

          {/* Right Main Session Balance Box */}
          <div className="flex flex-col items-start md:items-end justify-center rounded-2xl bg-background/80 backdrop-blur border border-border p-5 shadow-sm min-w-[200px]">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remaining Sessions</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-extrabold text-primary">{totalUsableRemaining}</span>
              <span className="text-sm font-medium text-muted-foreground">/ {totalSessions} total</span>
            </div>
            {bonusSlots > 0 && (
              <span className="mt-1 text-xs text-green-600 font-medium">+ {bonusSlots} bonus sessions included</span>
            )}
          </div>
        </div>

        {/* Balance Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-xs font-medium text-muted-foreground">
            <span>Progress ({usedSessions} used)</span>
            <span>{totalUsableRemaining} available</span>
          </div>
          <Progress value={usedPercentage} className="h-3 rounded-full" />
        </div>

        {/* Footer Meta Details */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/60 pt-6 sm:grid-cols-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Calendar className="h-3.5 w-3.5" />
              <span>Valid Until</span>
            </div>
            <p className="text-sm font-semibold">
              {subscription.expires_at
                ? new Date(subscription.expires_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Lifetime"}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>Activated On</span>
            </div>
            <p className="text-sm font-semibold">
              {subscription.activated_at || subscription.purchased_at
                ? new Date(subscription.activated_at || subscription.purchased_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "N/A"}
            </p>
          </div>

          <div className="space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Plan Type</span>
            </div>
            <p className="text-sm font-semibold capitalize">
              {subscription.plan?.billing_cycle || "Standard Plan"}
            </p>
          </div>
        </div>
      </div>

      {/* Low Balance Alert */}
      {isLowBalance && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 rounded-2xl">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="font-bold">Low Session Balance Warning</AlertTitle>
          <AlertDescription className="text-sm">
            You only have <span className="font-bold">{totalUsableRemaining} session(s)</span> remaining in your current wallet. Consider renewing your plan when convenient.
          </AlertDescription>
        </Alert>
      )}

      {/* Expired State Alert */}
      {isExpired && (
        <Alert variant="destructive" className="rounded-2xl">
          <XCircle className="h-5 w-5" />
          <AlertTitle className="font-bold">Subscription Expired</AlertTitle>
          <AlertDescription className="text-sm">
            Your subscription expired on{" "}
            <span className="font-semibold">
              {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : "N/A"}
            </span>.
            Purchase a new plan to resume booking practice sessions.
          </AlertDescription>
        </Alert>
      )}
    </motion.div>
  );
}
