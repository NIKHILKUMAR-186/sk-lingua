import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Sparkles, Clock, Video, Star, Shield } from "lucide-react";
import { DemoInfoPage } from "@/modules/subscriptions/components/demo-info-page";
import { DemoBookingForm } from "@/modules/subscriptions/components/demo-booking-form";
import { PaymentForm } from "@/modules/subscriptions/components/payment-form";
import { PaymentSummary } from "@/modules/subscriptions/components/payment-summary";
import {
  useBookDemoSession,
  useCreatePaymentOrder,
  useCompletePayment,
} from "@/hooks/use-payments";
import { useDemoPlan } from "@/hooks/use-subscriptions";
import { calculatePaymentSummary } from "@/lib/payments";
import { motion, AnimatePresence } from "framer-motion";

type Step = "info" | "booking" | "payment" | "confirmation";

const STEPS = [
  { id: "info", label: "Learn More", icon: Sparkles },
  { id: "booking", label: "Book Slot", icon: Clock },
  { id: "payment", label: "Payment", icon: Shield },
  { id: "confirmation", label: "Confirmed", icon: CheckCircle2 },
];

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
  const completePayment = useCompletePayment();
  const { data: demoPlan } = useDemoPlan();

  const demoPrice = demoPlan?.price ?? 9.0;
  const { taxAmount, finalAmount } = calculatePaymentSummary(demoPrice);

  if (!auth?.user) {
    return (
      <StudentLayout>
        <div className="flex min-h-screen items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <Sparkles className="h-12 w-12 text-primary mx-auto" />
              <h2 className="text-2xl font-display">Welcome to Your Demo Session</h2>
              <p className="text-muted-foreground">Please log in to book your demo session.</p>
              <Button asChild className="w-full">
                <Link to="/auth">Get Started</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  const userId = auth.user.id;

  async function handleBookingSubmit(data: any) {
    setLoading(true);
    try {
      const booking = await bookDemo.mutateAsync({
        userId,
        ...data,
        price: demoPrice,
      });
      setBookingData(booking);
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
      const { taxAmount, finalAmount } = calculatePaymentSummary(demoPrice);

      const paymentOrder = await createPayment.mutateAsync({
        userId,
        order_type: "demo_session",
        related_id: bookingData?.id,
        amount: demoPrice,
        tax_amount: taxAmount,
        final_amount: finalAmount,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        billing_address: data.billing_address,
      });

      await completePayment.mutateAsync({
        orderId: paymentOrder.id,
        userId,
        transactionId: `TXN_${Date.now()}`,
        gatewayOrderId: `RZP_${Date.now()}`,
        gatewayResponse: {
          status: "success",
          method: "card",
          timestamp: new Date().toISOString(),
        },
      });

      setPaymentData({
        ...data,
        orderId: paymentOrder.id,
        basePrice: demoPrice,
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

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <StudentLayout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-mentor/5">
        <div className="mx-auto max-w-5xl space-y-8 py-8 px-4">
          {/* Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Free Demo Session</span>
            </div>
<h1 className="text-4xl font-display">Start Your Language Journey</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get a personalized 1-on-1 language assessment with our expert team
            </p>
          </motion.div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, index) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isCompleted = index < currentStepIndex;

              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <motion.div
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isActive
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "bg-muted text-muted-foreground"
                      }`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>
                    <div className="hidden md:block">
                      <div className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </div>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-0.5 w-8 md:w-16 ${isCompleted ? "bg-green-500" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Main Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {/* <div className="flex justify item-centers-center lg:col-span-2 p-7"> */}
<div className="min-h-screen bg-slate-50 w-full flex justify-center px-6 py-8">
                <Card className="w-full rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                  <CardContent className=" p-8 md:p-12 lg:p-16">
                    {step === "info" && (
                      <DemoInfoPage
                        onGetStarted={() => setStep("booking")}
                        loading={loading}
                        price={demoPrice}
                      />
                    )}

                    {step === "booking" && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-3xl font-display mb-2">Pick Your Time Slot</h2>
                          <p className="text-muted-foreground">
                            Choose a convenient time for your 30-minute demo session
                          </p>
                        </div>
                        <DemoBookingForm
                          onSubmit={handleBookingSubmit}
                          loading={loading}
                          error={bookDemo.error ? bookDemo.error.message : undefined}
                          price={demoPrice}
                        />
                      </div>
                    )}

                    {step === "payment" && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-3xl font-display mb-2">Complete Payment</h2>
                          <p className="text-muted-foreground">
                            Secure payment for your demo session
                          </p>
                        </div>
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
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-center space-y-4"
                        >
                          <div className="flex justify-center">
                            <div className="rounded-full bg-green-100 p-4">
                              <CheckCircle2 className="h-16 w-16 text-green-600" />
                            </div>
                          </div>
                          <div>
<h2 className="text-3xl font-display text-green-900">Demo Session Booked!</h2>
                            <p className="text-lg text-green-700 mt-2">
                              Your payment is being processed. Our team will confirm your slot and
                              share the meeting link shortly.
                            </p>
                          </div>
                        </motion.div>

                        <Card className="bg-gradient-to-br from-green-50 to-background border-2 border-green-200">
                          <CardContent className="pt-6 space-y-4">
                            <h3 className="font-semibold text-lg">Booking Details</h3>
                            <div className="grid gap-3">
                              <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Date & Time</p>
                                  <p className="font-medium">
                                    {new Date(bookingData?.booking_date).toDateString()} at{" "}
                                    {bookingData?.booking_time_start}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Video className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Language</p>
                                  <p className="font-medium capitalize">{bookingData?.language}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Star className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Confirmation Sent To</p>
                                  <p className="font-medium">{paymentData?.customer_email}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-blue-50 border-2 border-blue-200">
                          <CardContent className="pt-6 space-y-3">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-blue-600" />
                              What's Next?
                            </h3>
                            <ul className="space-y-3">
                              {[
                                "Check your email for the booking confirmation and meeting link",
                                "Join 5 minutes early to test your audio and video",
                                "Enjoy your personalized 30-minute session!",
                              ].map((text, i) => (
                                <li key={i} className="flex items-start gap-3">
                                  <span className="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                                    {i + 1}
                                  </span>
                                  <span className="text-sm">{text}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>

                        <Button
                          onClick={() => navigate({ to: "/student/dashboard" })}
                          size="lg"
                          className="w-full"
                        >
                          Go to Dashboard
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {(step === "payment" || step === "confirmation") && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sticky top-6"
                  >
                    <PaymentSummary
                      baseAmount={demoPrice}
                      taxAmount={taxAmount}
                      finalAmount={finalAmount}
                      description="Your 30-minute demo session"
                      items={[
                        { label: "Demo Session (30 min)", value: `₹${demoPrice}` },
                        { label: "Tax (18% GST)", value: `₹${taxAmount.toFixed(2)}` },
                      ]}
                    />
                  </motion.div>
                )}

                {/* {step === "info" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <Card className="bg-gradient-to-br from-primary/10 to-background border-2 border-primary/20">
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">100% Satisfaction Guarantee</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          If you're not satisfied with your demo session, we offer a full money-back guarantee.
                        </p>
                      </CardContent>
                    </Card>

<Card className="bg-gradient-to-br from-mentor/10 to-background border-2 border-mentor/20">
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-mentor" />
                          <h3 className="font-semibold">Expert Assessment</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Get a personalized language assessment from our experienced team to
                          chart your learning path.
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )} */}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </StudentLayout>
  );
}