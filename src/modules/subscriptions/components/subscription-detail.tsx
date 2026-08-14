import React from "react";
import { StudentSubscription } from "@/lib/subscriptions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, ShieldCheck, Hash, Calendar } from "lucide-react";

interface SubscriptionDetailProps {
  subscription: StudentSubscription;
}

export function SubscriptionDetail({ subscription }: SubscriptionDetailProps) {
  const price = subscription.price_at_purchase ?? subscription.plan?.price ?? 0;
  const currency = subscription.currency_at_purchase ?? subscription.plan?.currency ?? "INR";
  const currencySymbol = currency === "INR" ? "₹" : "$";
  const validityDays = subscription.validity_days_at_purchase ?? subscription.plan?.validity_days;

  const features = Array.isArray(subscription.plan?.features)
    ? (subscription.plan?.features as string[])
    : [];

  return (
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">{subscription.plan?.name || "Subscription Plan"}</CardTitle>
            <CardDescription className="mt-1">{subscription.plan?.description || "Student learning entitlement"}</CardDescription>
          </div>
          <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
            {currencySymbol}{price.toFixed(2)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Entitlement Specifications */}
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-secondary/30 p-4 sm:grid-cols-4">
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Total Sessions</span>
            <span className="text-base font-bold text-foreground">{subscription.total_session_slots} Sessions</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Validity Period</span>
            <span className="text-base font-bold text-foreground">{validityDays ? `${validityDays} Days` : "No Expiry"}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Status</span>
            <span className="text-base font-bold capitalize text-foreground">{subscription.status}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Payment Reference</span>
            <span className="text-xs font-mono font-semibold text-foreground truncate block max-w-[120px]">
              {subscription.payment_order_id ? subscription.payment_order_id.slice(0, 8) + "..." : "Direct"}
            </span>
          </div>
        </div>

        {/* Plan Features */}
        {features.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Included Plan Features
            </h4>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
