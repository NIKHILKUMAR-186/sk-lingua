import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  useStudentSubscription,
  useStudentSubscriptionHistory,
  useRemainingSlots,
} from "@/hooks/use-subscriptions";
import { StudentWallet } from "@/modules/subscriptions/components/student-wallet";
import { SubscriptionDetail } from "@/modules/subscriptions/components/subscription-detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Zap, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/student/subscriptions")({
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { data: auth } = useAuth();
  const userId = auth?.user?.id;
  const navigate = useNavigate();

  const { data: subscription, isLoading: subLoading } = useStudentSubscription(userId ?? null);
  const { data: history = [], isLoading: historyLoading } = useStudentSubscriptionHistory(
    userId ?? null,
  );

  if (!auth?.user) {
    return (
      <AppShell variant="student">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Loading authentication...
        </div>
      </AppShell>
    );
  }

  const handleBrowsePlans = () => {
    navigate({ to: "/student/pricing" });
  };

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-5xl space-y-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">My Subscription & Wallet</h1>
            <p className="text-muted-foreground">
              View your active session balance, subscription entitlements, and validity.
            </p>
          </div>
          <Button onClick={handleBrowsePlans} variant="outline" className="gap-2 self-start sm:self-auto rounded-xl">
            Browse Plans
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Current Active Subscription Wallet */}
        {subLoading ? (
          <div className="rounded-2xl border border-border p-12 text-center text-muted-foreground">
            Loading session balance...
          </div>
        ) : (
          <div className="space-y-6">
            <StudentWallet subscription={subscription ?? null} onBrowsePlans={handleBrowsePlans} />

            {subscription && (
              <SubscriptionDetail subscription={subscription} />
            )}
          </div>
        )}

        {/* Subscription History */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Subscription History</h2>
          {historyLoading ? (
            <div className="text-center text-muted-foreground">Loading history...</div>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((sub) => {
                const subPrice = sub.price_at_purchase ?? sub.plan?.price ?? 0;
                const subCurrency = sub.currency_at_purchase ?? sub.plan?.currency ?? "INR";
                const currencySymbol = subCurrency === "INR" ? "₹" : "$";

                return (
                  <Card key={sub.id} className="rounded-xl border border-border/80 hover:border-border transition-colors">
                    <CardContent className="flex items-center justify-between p-5">
                      <div className="space-y-1">
                        <div className="font-bold text-foreground">{sub.plan?.name || "Subscription Plan"}</div>
                        <div className="text-xs text-muted-foreground">
                          {sub.total_session_slots} Sessions Purchased • Purchased on{" "}
                          {new Date(sub.purchased_at).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-foreground">
                          {currencySymbol}{subPrice.toFixed(2)}
                        </div>
                        <Badge
                          variant={sub.status === "active" ? "default" : "outline"}
                          className="mt-1 text-xs uppercase"
                        >
                          {sub.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="rounded-xl border border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                No past subscription history found.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Feature Overview Info Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 font-bold">
                <Zap className="h-4 w-4 text-amber-500" />
                Session Entitlement
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Your purchased sessions are available in your Session Wallet until the validity expiry date.
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Plan Snapshotting
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Purchased sessions and prices are snapshotted and protected from future plan template modifications.
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 font-bold">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Flexible Renewal
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Upgrade or renew anytime to keep your learning progress momentum going strong.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
