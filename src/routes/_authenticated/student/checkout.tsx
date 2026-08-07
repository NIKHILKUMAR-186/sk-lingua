import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useSubscriptionPlans } from "@/hooks/use-subscriptions";
import { useCreatePaymentOrder, useCompletePayment } from "@/hooks/use-payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { PaymentForm } from "@/modules/subscriptions/components/payment-form";
import { PaymentSummary } from "@/modules/subscriptions/components/payment-summary";
import { calculatePaymentSummary } from "@/lib/payments";

interface CheckoutSearch {
  planId: string;
}

export const Route = createFileRoute("/_authenticated/student/checkout")({
  validateSearch: (search: Record<string, any>): CheckoutSearch => ({
    planId: search.planId as string,
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: Route.id });
  const { data: plans = [] } = useSubscriptionPlans();
  const createPayment = useCreatePaymentOrder();
  const completePayment = useCompletePayment();

  const [step, setStep] = useState<"checkout" | "confirmation">("checkout");
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!auth?.user) {
    return (
      <StudentLayout>
        <div className="flex min-h-screen items-center justify-center">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Please log in to proceed.</p>
              <Button asChild className="mt-4">
                <Link to="/auth">Go to Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  const userId = auth.user.id;
  const plan = plans.find((p) => p.id === search.planId);

  if (!plan) {
    return (
      <StudentLayout>
        <div className="flex min-h-screen items-center justify-center">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Plan not found.</p>
              <Button asChild className="mt-4">
                <Link to="/student/pricing">Back to Pricing</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  const { taxAmount, finalAmount } = calculatePaymentSummary(plan.price);

  async function handlePaymentSubmit(data: any) {
    setLoading(true);
    setError(null);

    try {
      // Create payment order
      const paymentOrder = await createPayment.mutateAsync({
        userId,
        order_type: "subscription",
        amount: plan!.price,
        tax_amount: taxAmount,
        final_amount: finalAmount,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        billing_address: data.billing_address,
      });

      setPaymentData({
        orderId: paymentOrder.id,
        ...data,
      });

      // Simulate payment processing
      // In production, this would integrate with Razorpay, Stripe, etc.
      await simulatePaymentProcessing(paymentOrder.id);
    } catch (error) {
      console.error("Checkout failed:", error);
      setError(error instanceof Error ? error.message : "Payment processing failed");
    } finally {
      setLoading(false);
    }
  }

  async function simulatePaymentProcessing(orderId: string) {
    // Simulate payment gateway response
    const transactionId = `TXN_${Date.now()}`;
    const gatewayOrderId = `RZP_${Date.now()}`;

    try {
      await completePayment.mutateAsync({
        orderId,
        userId,
        transactionId,
        gatewayOrderId,
        gatewayResponse: {
          status: "success",
          method: "card",
          timestamp: new Date().toISOString(),
        },
      });

      setStep("confirmation");
    } catch (error) {
      console.error("Payment completion failed:", error);
      setError("Payment verification failed. Please contact support.");
    }
  }

  function handleRetry() {
    setStep("checkout");
    setPaymentData(null);
    setError(null);
  }

  return (
    <StudentLayout>
      <div className="mx-auto max-w-3xl space-y-6 py-6">
        {/* Header */}
        {step === "checkout" && (
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/student/pricing" })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Plans
          </Button>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            {step === "checkout" && (
              <div>
                <h1 className="mb-2 text-3xl font-display">Complete Your Purchase</h1>
                <p className="mb-6 text-muted-foreground">
                  You're about to unlock {plan.num_sessions} sessions with the{" "}
                  <strong>{plan.name}</strong> plan.
                </p>

                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <PaymentForm
                  onSubmit={handlePaymentSubmit}
                  loading={loading || createPayment.isPending}
                  error={createPayment.error ? createPayment.error.message : undefined}
                  defaultEmail={auth.profile?.email || ""}
                />
              </div>
            )}

            {step === "confirmation" && (
              <div className="space-y-6">
                <div className="rounded-3xl border-2 border-green-200 bg-green-50 p-8 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                  <h1 className="mt-4 text-2xl font-bold text-green-900">Payment Successful!</h1>
                  <p className="mt-2 text-green-700">
                    Your subscription is now active. Happy learning!
                  </p>
                </div>

                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="mt-1 text-lg font-semibold">{plan.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sessions Included</p>
                      <p className="mt-1 text-lg font-semibold">{plan.num_sessions} sessions</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Order ID</p>
                      <p className="mt-1 font-mono text-sm">{paymentData?.orderId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount Paid</p>
                      <p className="mt-1 text-lg font-semibold">₹{finalAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Confirmation Sent To</p>
                      <p className="mt-1 font-medium">{paymentData?.customer_email}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">What's Next?</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        1
                      </span>
                      <span>Check your email for the receipt and account confirmation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        2
                      </span>
                      <span>Go to the booking page to schedule your first session</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        3
                      </span>
                      <span>You can track your sessions and remaining slots in your dashboard</span>
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button asChild className="flex-1">
                    <Link to="/student/dashboard">Go to Dashboard</Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/student/subscriptions">View Subscription</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Summary */}
          {step === "checkout" && (
            <div>
              <div className="sticky top-6">
                <PaymentSummary
                  baseAmount={plan.price}
                  taxAmount={taxAmount}
                  finalAmount={finalAmount}
                  description={`${plan.num_sessions} sessions included`}
                  items={[{ label: plan.name, value: `₹${plan.price.toFixed(2)}` }]}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
