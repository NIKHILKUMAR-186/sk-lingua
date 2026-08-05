import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  useStudentSubscription,
  useStudentSubscriptionHistory,
  useRemainingSlots,
} from "@/hooks/use-subscriptions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Calendar, Zap, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/student/subscriptions")({
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { data: auth } = useAuth();
  const userId = auth?.user?.id;
  const { data: subscription, isLoading: subLoading } = useStudentSubscription(userId ?? null);
  const { data: history = [], isLoading: historyLoading } = useStudentSubscriptionHistory(
    userId ?? null
  );
  const { data: remainingSlots = 0 } = useRemainingSlots(userId ?? null);

  if (!auth?.user) {
    return <AppShell variant="student"><div>Loading...</div></AppShell>;
  }

  const statusColors: Record<string, { bg: string; text: string; badge: string }> = {
    active: { bg: "bg-green-50", text: "text-green-700", badge: "bg-green-200 text-green-800" },
    expired: { bg: "bg-gray-50", text: "text-gray-700", badge: "bg-gray-200 text-gray-800" },
    cancelled: {
      bg: "bg-red-50",
      text: "text-red-700",
      badge: "bg-red-200 text-red-800",
    },
    pending: { bg: "bg-yellow-50", text: "text-yellow-700", badge: "bg-yellow-200 text-yellow-800" },
  };

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-5xl space-y-8 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display">Subscriptions</h1>
          <p className="text-muted-foreground">Manage your learning plans and sessions.</p>
        </div>

        {/* Current Subscription */}
        {subLoading ? (
          <div className="text-center text-muted-foreground">Loading subscription...</div>
        ) : subscription ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className={`rounded-2xl border border-border p-8 ${statusColors[subscription.status].bg}`}>
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold">{subscription.plan?.name}</h2>
                      <Badge className={statusColors[subscription.status].badge}>
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {subscription.plan?.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      ₹{subscription.plan?.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {subscription.plan?.billing_cycle}
                    </div>
                  </div>
                </div>

                {/* Slots Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Session Slots</span>
                    </div>
                    <div className="text-sm font-semibold">
                      {subscription.current_session_slots} / {subscription.total_session_slots}
                    </div>
                  </div>
                  <Progress
                    value={
                      ((subscription.total_session_slots - subscription.current_session_slots) /
                        subscription.total_session_slots) *
                      100
                    }
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground">
                    {subscription.current_session_slots} slots remaining •{" "}
                    {subscription.used_session_slots} used
                  </p>
                </div>

                {/* Dates */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Started
                    </p>
                    <p className="mt-1 text-sm">
                      {new Date(subscription.activated_at || subscription.purchased_at).toLocaleDateString()}
                    </p>
                  </div>
                  {subscription.expires_at && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Expires
                      </p>
                      <p className="mt-1 text-sm">
                        {new Date(subscription.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {subscription.renewed_at && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Last Renewed
                      </p>
                      <p className="mt-1 text-sm">
                        {new Date(subscription.renewed_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="outline">
                    <Link to="/student/pricing">View All Plans</Link>
                  </Button>
                  {subscription.status === "active" && subscription.expires_at && (
                    new Date(subscription.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? (
                      <Button asChild>
                        <Link to="/student/pricing">Renew Plan</Link>
                      </Button>
                    ) : null
                  )}
                </div>
              </div>
            </div>

            {/* Warning if expiring soon */}
            {subscription.expires_at &&
              new Date(subscription.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your subscription expires on{" "}
                    {new Date(subscription.expires_at).toLocaleDateString()}. Consider renewing
                    to keep learning.
                  </AlertDescription>
                </Alert>
              )}
          </motion.div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>You don't have an active subscription yet.</span>
                <Button asChild size="sm" variant="outline">
                  <Link to="/student/pricing">Browse Plans</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Subscription History */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Subscription History</h2>
          {historyLoading ? (
            <div className="text-center text-muted-foreground">Loading history...</div>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((sub) => (
                <Card key={sub.id}>
                  <CardContent className="flex items-center justify-between pt-6">
                    <div className="space-y-1">
                      <div className="font-semibold">{sub.plan?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {sub.total_session_slots} sessions •{" "}
                        {new Date(sub.purchased_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">₹{sub.plan?.price.toFixed(2)}</div>
                      <Badge variant="outline" className="mt-1">
                        {sub.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No subscription history yet.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Boost
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Need more sessions? You can always upgrade to a higher plan.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                No Commitment
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Cancel anytime. No penalties or hidden fees.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Flexible Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Choose weekly, monthly, quarterly, or yearly plans.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
