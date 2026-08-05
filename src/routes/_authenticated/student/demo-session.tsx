import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { DemoInfoPage } from "@/modules/subscriptions/components/demo-info-page";
import { DemoBookingForm } from "@/modules/subscriptions/components/demo-booking-form";
import { PaymentForm } from "@/modules/subscriptions/components/payment-form";
import { PaymentSummary } from "@/modules/subscriptions/components/payment-summary";
import { useBookDemoSession } from "@/hooks/use-payments";
import { useCreatePaymentOrder } from "@/hooks/use-payments";
import { calculatePaymentSummary } from "@/lib/payments";

type Step = "info" | "booking" | "payment" | "confirmation";

export const Route = createFileRoute("/_authenticated/student/demo-session")({
  component: DemoSessionPage,
});

function DemoSessionPage() {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("info");
  const [bookingData, setBookingData] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const bookDemo = useBookDemoSession();
  const createPayment = useCreatePaymentOrder();

  if (!auth?.user) {
    return (
      <AppShell variant="student">
        <div className="flex min-h-screen items-center justify-center">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Please log in to book a demo session.</p>
              <Button asChild className="mt-4">
                <Link to="/auth">Go to Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  async function handleBookingSubmit(data: any) {
    setLoading(true);
    try {
      await bookDemo.mutateAsync({
        userId: auth.user.id,
        ...data,
      });
      setBookingData(data);
      setStep("payment");
    } catch (error) {
      console.error("Booking failed", error);
      toast.error("Failed to create booking");
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentSubmit(data: any) {
    setLoading(true);
    try {
      const basePrce = 9.0; // ₹9 demo price
      const { taxAmount, finalAmount } = calculatePaymentSummary(basePrce);

      const paymentOrder = await createPayment.mutateAsync({
        userId: auth.user.id,
        order_type: "demo_session",
        amount: basePrce,
        tax_amount: taxAmount,
        final_amount: finalAmount,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        billing_address: data.billing_address,
      });

      setPaymentData({
        ...data,
        orderId: paymentOrder.id,
        basePrce,
        taxAmount,
        finalAmount,
      });
      setStep("confirmation");
    } catch (error) {
      console.error("Payment creation failed", error);
      toast.error("Failed to process payment details");
    } finally {
      setLoading(false);
    }
  }

  const demoPrice = 9.0;
  const { taxAmount, finalAmount } = calculatePaymentSummary(demoPrice);

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-3xl space-y-6 py-6">
        {/* Header */}
        {step !== "info" && (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (step === "payment") setStep("booking");
                else if (step === "confirmation") setStep("info");
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-2">
              {["booking", "payment", "confirmation"].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-12 rounded-full ${
                    ["booking", "payment", "confirmation"].indexOf(s) <
                    ["booking", "payment", "confirmation"].indexOf(step)
                      ? "bg-primary"
                      : s === step
                        ? "bg-primary"
                        : "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            {step === "info" && (
              <DemoInfoPage
                onGetStarted={() => setStep("booking")}
                loading={loading}
              />
            )}

            {step === "booking" && (
              <div>
                <h1 className="mb-6 text-3xl font-display">Pick Your Slot</h1>
                <DemoBookingForm
                  onSubmit={handleBookingSubmit}
                  loading={loading}
                  error={bookDemo.error ? bookDemo.error.message : undefined}
                />
              </div>
            )}

            {step === "payment" && (
              <div>
                <h1 className="mb-6 text-3xl font-display">Billing Details</h1>
                <PaymentForm
                  onSubmit={handlePaymentSubmit}
                  loading={loading}
                  error={createPayment.error ? createPayment.error.message : undefined}
                  defaultEmail={auth.profile?.email || ""}
                />
              </div>
            )}

            {step === "confirmation" && (
              <div className="space-y-6">
                <div className="rounded-3xl border-2 border-green-200 bg-green-50 p-8 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                  <h1 className="mt-4 text-2xl font-bold text-green-900">
                    Demo Session Booked!
                  </h1>
                  <p className="mt-2 text-green-700">
                    Your payment is being processed. We'll send a confirmation email shortly.
                  </p>
                </div>

                <Card>
                  <CardContent className="space-y-3 pt-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Booking Details</p>
                      <p className="mt-1 font-medium">
                        {new Date(bookingData?.booking_date).toDateString()} at{" "}
                        {bookingData?.booking_time_start}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Language</p>
                      <p className="mt-1 font-medium capitalize">{bookingData?.language}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Confirmation Sent To</p>
                      <p className="mt-1 font-medium">{paymentData?.customer_email}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Next steps:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        1
                      </span>
                      <span>Check your email for the booking confirmation and meeting link</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        2
                      </span>
                      <span>Join 5 minutes early to test your audio and video</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        3
                      </span>
                      <span>Enjoy your personalized 30-minute session!</span>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={() => navigate({ to: "/student/dashboard" })}
                  size="lg"
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar - Payment Summary */}
          {(step === "payment" || step === "confirmation") && (
            <div>
              <div className="sticky top-6">
                <PaymentSummary
                  baseAmount={demoPrice}
                  taxAmount={taxAmount}
                  finalAmount={finalAmount}
                  description="Your 30-minute demo session"
                  items={[
                    { label: "Demo Session (30 min)", value: `₹${demoPrice}` },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
