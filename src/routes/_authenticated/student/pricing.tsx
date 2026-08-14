import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useSubscriptionPlans } from "@/hooks/use-subscriptions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Zap, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { CardSkeleton } from "@/components/skeleton-loader";

export const Route = createFileRoute("/_authenticated/student/pricing")({
  component: PricingPage,
});

function PricingPage() {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const { data: plans = [], isLoading, isError, refetch } = useSubscriptionPlans();

  if (!auth?.user) {
    return (
      <StudentLayout>
        <div className="text-center">
          <p>Please log in to view pricing.</p>
        </div>
      </StudentLayout>
    );
  }

  // Filter out demo plan from list
  const subscriptionPlans = plans.filter((p) => p.name !== "Demo Session");

  const comparisonFeatures = [
    "Personalized 1-on-1 sessions",
    "Flexible scheduling",
    "Interactive practice",
    "Session recording access",
    "Mentor feedback",
    "Progress tracking",
    "Resource library access",
    "Certificate of completion",
  ];

  return (
    <StudentLayout>
      <div className="mx-auto max-w-7xl space-y-12 py-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-display md:text-5xl">Simple, Transparent Pricing</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose the plan that fits your learning pace. All plans include full access to our
            platform.
          </p>
        </div>

        {/* Demo CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 text-center md:p-12"
        >
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Try Before You Buy</h2>
          </div>
          <p className="mt-2 text-muted-foreground">
            Book your first 30-minute demo session for just ₹9. No commitment required.
          </p>
          <Button asChild className="mt-6">
            <Link to="/student/demo-session">Book Demo Session</Link>
          </Button>
        </motion.div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} rows={5} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed p-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="font-medium">Could not load plans.</p>
            <p className="text-sm text-muted-foreground">
              Please try again. If this persists, check your connection.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : subscriptionPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed p-12 text-center">
            <div className="text-4xl">📅</div>
            <p className="font-medium">No plans are currently available.</p>
            <p className="text-sm text-muted-foreground">Please check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-5">
            {subscriptionPlans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card
                  className={`relative flex flex-col ${
                    plan.recommended
                      ? "border-2 border-primary shadow-lg ring-1 ring-primary/20"
                      : ""
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">Most Popular</Badge>
                    </div>
                  )}

                  <CardHeader className={plan.recommended ? "pb-4 pt-8" : ""}>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-6">
                    {/* Price */}
                    <div>
                      <div className="text-4xl font-bold">₹{plan.price}</div>
                      <p className="text-sm text-muted-foreground">
                        {plan.validity_days
                          ? `Valid for ${plan.validity_days} days`
                          : "One-time purchase"}
                      </p>
                    </div>

                    {/* Sessions */}
                    <div className="rounded-lg bg-primary/5 p-3">
                      <div className="text-2xl font-bold text-primary">{plan.num_sessions}</div>
                      <div className="text-xs text-muted-foreground">sessions included</div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2">
                      {(plan.features as string[]).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button
                      onClick={() =>
                        navigate({
                          to: "/student/checkout",
                          search: { planId: plan.id },
                        })
                      }
                      className="w-full"
                      variant={plan.recommended ? "default" : "outline"}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Comparison Table */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">What's Included in All Plans</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {comparisonFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Pricing FAQ</h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I upgrade my plan?",
                a: "Yes! You can upgrade to a higher plan anytime. We'll pro-rate your cost.",
              },
              {
                q: "What if I don't use all my sessions?",
                a: "Sessions don't expire during your plan period. They carry over month-to-month.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes, cancel anytime with no penalties or hidden fees. You'll keep your remaining sessions.",
              },
              {
                q: "Do you offer discounts for annual plans?",
                a: "Absolutely! The yearly plan gives you 33% savings compared to monthly billing.",
              },
              {
                q: "Are there any hidden fees?",
                a: "No hidden fees. The price you see is what you pay, including all taxes.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit/debit cards, UPI, and netbanking. More options coming soon.",
              },
            ].map((item, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{item.q}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{item.a}</CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-8 text-center md:p-12">
          <h2 className="text-2xl font-semibold">Ready to Start Learning?</h2>
          <p className="mt-2 text-muted-foreground">
            Pick a plan and unlock your learning potential today.
          </p>
          <div className="mt-6 flex gap-4 justify-center">
            <Button asChild variant="outline">
              <Link to="/student/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild>
              <Link to="/student/demo-session">Book Demo (₹9)</Link>
            </Button>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
