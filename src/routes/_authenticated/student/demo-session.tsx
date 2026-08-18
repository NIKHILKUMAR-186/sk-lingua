import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Sparkles, Clock, Video, ArrowRight } from "lucide-react";
import { DemoInfoPage } from "@/modules/subscriptions/components/demo-info-page";
import { DemoBookingForm } from "@/modules/subscriptions/components/demo-booking-form";
import { DemoCheckout } from "@/modules/subscriptions/components/demo-checkout";
import { PaymentSummary } from "@/modules/subscriptions/components/payment-summary";
import { useBookDemoSession, useUpcomingDemoBooking } from "@/hooks/use-payments";
import { useDemoPlan } from "@/hooks/use-subscriptions";
import { calculatePaymentSummary } from "@/lib/payments";
import { motion, AnimatePresence } from "framer-motion";

type Step = "info" | "booking" | "payment" | "confirmation";

const STEPS = [
  { id: "info", label: "About Demo", icon: Sparkles },
  { id: "booking", label: "Choose Time", icon: Clock },
  { id: "payment", label: "Payment", icon: Video },
  { id: "confirmation", label: "Request Received", icon: CheckCircle2 },
];

export const Route = createFileRoute("/_authenticated/student/demo-session")({
  component: DemoSessionPage,
});

function DemoSessionPage() {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("info");
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const bookDemo = useBookDemoSession();
  const { data: demoPlan } = useDemoPlan();
  const { data: existingDemo } = useUpcomingDemoBooking(auth?.user?.id ?? null);

  const demoPrice = demoPlan?.price ?? 9.0;
  const { taxAmount, finalAmount } = calculatePaymentSummary(demoPrice);

  if (!auth?.user) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-2xl space-y-6 py-12">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
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

  if (existingDemo) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-2xl space-y-6 py-12">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <h2 className="text-2xl font-display">Demo request already submitted</h2>
              <p className="text-muted-foreground">
                You already have a demo request in progress. Check your sessions page for the current
                status.
              </p>
              <Button asChild className="w-full">
                <Link to="/student/sessions">View My Sessions</Link>
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

  function handlePaymentComplete() {
    setStep("confirmation");
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <StudentLayout>
      <div className="mx-auto max-w-3xl space-y-8 py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl font-display tracking-tight">Book a Demo Session</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Tell us when you&apos;d like to learn. We&apos;ll match you with an available mentor and
            confirm the details.
          </p>
        </motion.div>

        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isCompleted = index < currentStepIndex;

            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="hidden md:block">
                    <div
                      className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {s.label}
                    </div>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-px w-6 md:w-10 ${isCompleted ? "bg-primary" : "bg-border"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {step === "info" && (
              <DemoInfoPage
                onGetStarted={() => setStep("booking")}
                loading={loading}
                price={demoPrice}
              />
            )}

            {step === "booking" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-display tracking-tight">Choose your time slot</h2>
                      <p className="text-sm text-muted-foreground">
                        This is a demo request. After you submit, our team will review and confirm the
                        mentor and session details.
                      </p>
                    </div>
                    <DemoBookingForm
                      onSubmit={handleBookingSubmit}
                      loading={loading}
                      error={bookDemo.error ? bookDemo.error.message : undefined}
                      price={demoPrice}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {step === "payment" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-display tracking-tight">Complete demo payment</h2>
                      <p className="text-sm text-muted-foreground">
                        Your payment secures your demo request. Our team will then confirm the mentor
                        and session details.
                      </p>
                    </div>
                    <DemoCheckout
                      bookingData={bookingData}
                      price={demoPrice}
                      onComplete={handlePaymentComplete}
                      onBack={() => setStep("booking")}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {step === "confirmation" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6 md:p-8 space-y-6">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center space-y-4"
                    >
                      <div className="flex justify-center">
                        <div className="rounded-full bg-primary/10 p-4">
                          <CheckCircle2 className="h-12 w-12 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-display">Demo request received</h2>
                        <p className="text-muted-foreground mt-2">
                          Your payment was successful and your request is now with our team.
                        </p>
                      </div>
                    </motion.div>

                    <Card className="bg-muted/30">
                      <CardContent className="pt-6 space-y-4">
                        <h3 className="font-semibold">What happens next</h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                              1
                            </span>
                            <span>Our team reviews your request and selects a suitable mentor.</span>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                              2
                            </span>
                            <span>
                              You&apos;ll receive a notification here and by email once the session is
                              confirmed.
                            </span>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                              3
                            </span>
                            <span>Join the session from your dashboard when it&apos;s confirmed.</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                      <CardContent className="pt-6 space-y-3">
                        <h3 className="font-semibold">Request details</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Date & Time</p>
                              <p className="font-medium">
                                {new Date(bookingData?.booking_date).toDateString()} at{" "}
                                {bookingData?.booking_time_start}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Language</p>
                              <p className="font-medium capitalize">{bookingData?.language}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Status</p>
                              <p className="font-medium">Awaiting admin confirmation</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button asChild className="flex-1">
                        <Link to="/student/sessions">View My Sessions</Link>
                      </Button>
                      <Button asChild variant="outline" className="flex-1">
                        <Link to="/student/dashboard">Go to Dashboard</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </StudentLayout>
  );
}