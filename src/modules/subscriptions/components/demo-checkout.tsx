import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Loader2,
  Video,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface DemoCheckoutProps {
  bookingData: {
    id: string;
    booking_date: string;
    booking_time_start: string;
    booking_time_end: string;
    language: string;
    duration_mins: number;
  };
  price: number;
  onComplete: () => void;
  onBack: () => void;
}

export function DemoCheckout({ bookingData, price, onComplete, onBack }: DemoCheckoutProps) {
  const { data: auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useTestPayment, setUseTestPayment] = useState(true);

  const isDev = import.meta.env.DEV;

  async function handlePay() {
    setLoading(true);
    setError(null);

    try {
      if (useTestPayment) {
        await handleTestPayment();
      } else {
        await handleRealPayment();
      }
    } catch (err: any) {
      console.error("Payment failed:", err);
      setError(err?.message || "Payment couldn't be completed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTestPayment() {
    if (!auth?.user?.id) {
      throw new Error("Please sign in to continue");
    }

    const { supabase } = await import("@/integrations/supabase/client");

    const { error: updateError } = await supabase
      .from("demo_session_bookings")
      .update({
        payment_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingData.id)
      .eq("user_id", auth.user.id);

    if (updateError) {
      throw new Error(updateError.message || "Failed to update booking payment status");
    }

    toast.success("Test payment completed!");
    onComplete();
  }

  async function handleRealPayment() {
    const { supabase } = await import("@/integrations/supabase/client");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Please sign in to continue");
    }

    const res = await fetch("/api/payments/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        order_type: "demo_session",
        related_id: bookingData.id,
        customer_email: auth?.profile?.email || "",
        customer_phone: "",
        billing_address: null,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(
        json?.error || "Payment is temporarily unavailable. Please try again shortly.",
      );
    }

    const order = json.data;

    const completeRes = await fetch("/api/payments/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        orderId: order.id,
        transactionId: `TXN_${Date.now()}`,
        gatewayOrderId: order.gateway_order_id || `RZP_${Date.now()}`,
        gatewayResponse: {
          status: "success",
          method: "card",
          timestamp: new Date().toISOString(),
        },
      }),
    });

    const completeJson = await completeRes.json();
    if (!completeRes.ok || !completeJson.success) {
      throw new Error(completeJson?.error || "Payment confirmation failed. Please try again.");
    }

    toast.success("Payment completed successfully!");
    onComplete();
  }

  const studentName = auth?.profile?.full_name || "Student";
  const studentEmail = auth?.profile?.email || "";

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Demo session request</h3>
              <p className="text-sm text-muted-foreground">Language Assessment Demo</p>
              <p className="text-sm text-muted-foreground">30-minute 1-on-1 introductory session</p>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="text-2xl font-bold">₹{price}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-5 space-y-3">
          <h4 className="text-sm font-semibold">What you'll get</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Personalized language assessment
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              1-on-1 conversation with the Lingua team
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Guidance on your learning path
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <h4 className="text-sm font-semibold">Your details</h4>
          <div className="space-y-1 text-sm">
            <div className="font-medium">{studentName}</div>
            {studentEmail && <div className="text-muted-foreground">{studentEmail}</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h4 className="text-sm font-semibold">Payment</h4>

          {isDev && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Payment method</Label>
              <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
                <input
                  type="radio"
                  id="test-payment"
                  name="payment_method"
                  checked={useTestPayment}
                  onChange={() => setUseTestPayment(true)}
                  className="h-4 w-4"
                />
                <div>
                  <div className="text-sm font-medium">Demo / Test Payment</div>
                  <div className="text-xs text-muted-foreground">
                    For development and testing only
                  </div>
                </div>
              </label>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div>
              <div className="text-sm font-medium">Demo Session</div>
              <div className="text-xs text-muted-foreground">30-minute 1-on-1 session</div>
            </div>
            <div className="text-sm font-semibold">₹{price}</div>
          </div>

          {useTestPayment && (
            <p className="text-xs text-amber-600">Test payment — no real money will be charged.</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Total</span>
          <span>₹{price}</span>
        </div>

        <Button onClick={handlePay} disabled={loading} size="lg" className="w-full gap-2">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {useTestPayment ? `Pay ₹${price} (Test)` : `Pay ₹${price}`}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {useTestPayment
            ? "Test payment — no real money will be charged."
            : "Your demo request will be sent to our team after payment."}
        </p>
      </div>
    </div>
  );
}