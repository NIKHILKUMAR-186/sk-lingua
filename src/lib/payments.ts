import { supabase } from "@/integrations/supabase/client";
import {
  bookDemoSession as createDemoBooking,
  hasUsedDemoSession,
} from "@/lib/demo-bookings";

export interface DemoSessionBooking {
  id: string;
  user_id: string;
  booking_date: string;
  booking_time_start: string;
  booking_time_end: string;
  language: string;
  duration_mins: number;
  payment_status: string;
  booking_status: string;
  price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentOrder {
  id: string;
  user_id: string;
  order_type: string;
  related_id: string | null;
  amount: number;
  tax_amount: number;
  discount_amount: number;
  final_amount: number;
  currency: string;
  payment_method: string | null;
  payment_status: string;
  transaction_id: string | null;
  gateway: string | null;
  gateway_order_id: string | null;
  gateway_response: any;
  billing_address: any;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// Book demo session (delegates to the unified demo-bookings logic,
// which enforces the one-lifetime-demo rule and correct status)
export async function bookDemoSession(
  userId: string,
  data: {
    booking_date: string;
    booking_time_start: string;
    booking_time_end: string;
    language: string;
    duration_mins?: number;
    notes?: string;
    price?: number;
  },
): Promise<DemoSessionBooking> {
  return (await createDemoBooking(userId, data)) as DemoSessionBooking;
}

// Get demo booking by ID
export async function getDemoBooking(id: string): Promise<DemoSessionBooking | null> {
  const { data, error } = await supabase
    .from("demo_session_bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Get demo bookings for user
export async function getUserDemoBookings(userId: string): Promise<DemoSessionBooking[]> {
  const { data, error } = await supabase
    .from("demo_session_bookings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Get upcoming demo booking
export async function getUpcomingDemoBooking(userId: string): Promise<DemoSessionBooking | null> {
  const { data, error } = await supabase
    .from("demo_session_bookings")
    .select("*")
    .eq("user_id", userId)
    .in("booking_status", ["pending_admin_confirmation", "confirmed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Update demo booking status
export async function updateDemoBooking(
  id: string,
  updates: Partial<DemoSessionBooking>,
): Promise<DemoSessionBooking> {
  const { data, error } = await supabase
    .from("demo_session_bookings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Cancel demo booking
export async function cancelDemoBooking(id: string): Promise<DemoSessionBooking> {
  const now = new Date().toISOString();

  return updateDemoBooking(id, {
    booking_status: "cancelled",
    payment_status: "cancelled",
    cancelled_at: now,
    updated_at: now,
  } as any);
}

// Create payment order
export async function createPaymentOrder(
  userId: string,
  data: {
    order_type: "demo_session" | "subscription" | "renewal";
    related_id?: string;
    amount: number;
    tax_amount?: number;
    discount_amount?: number;
    final_amount: number;
    customer_email?: string;
    customer_phone?: string;
    billing_address?: any;
  },
): Promise<PaymentOrder> {
  const { data: order, error } = await supabase
    .from("payment_orders")
    .insert({
      user_id: userId,
      order_type: data.order_type,
      related_id: data.related_id,
      amount: data.amount,
      tax_amount: data.tax_amount ?? 0,
      discount_amount: data.discount_amount ?? 0,
      final_amount: data.final_amount,
      currency: "INR",
      payment_status: "pending",
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      billing_address: data.billing_address,
    })
    .select()
    .single();

  if (error) throw error;
  return order;
}

// Get payment order
export async function getPaymentOrder(id: string): Promise<PaymentOrder | null> {
  const { data, error } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Update payment order
export async function updatePaymentOrder(
  id: string,
  updates: Partial<PaymentOrder>,
): Promise<PaymentOrder> {
  const { data, error } = await supabase
    .from("payment_orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Record in payment history if completed
  if (updates.payment_status === "completed") {
    const order = await getPaymentOrder(id);
    if (order?.user_id) {
      await recordPaymentHistory(
        order.user_id,
        id,
        "purchase",
        updates.final_amount ?? 0,
        "completed",
      );
    }
  }

  return data;
}

// Mark payment as completed
export async function completePayment(
  orderId: string,
  transactionId: string,
  gatewayOrderId?: string,
  gatewayResponse?: any,
): Promise<PaymentOrder> {
  const now = new Date().toISOString();

  return updatePaymentOrder(orderId, {
    payment_status: "completed",
    transaction_id: transactionId,
    gateway_order_id: gatewayOrderId,
    gateway_response: gatewayResponse,
    completed_at: now,
  });
}

// Mark payment as failed
export async function failPayment(orderId: string, reason?: string): Promise<PaymentOrder> {
  return updatePaymentOrder(orderId, {
    payment_status: "failed",
    notes: reason,
  });
}

// Get payment history for user
export async function getUserPaymentHistory(userId: string): Promise<PaymentOrder[]> {
  const { data, error } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Record payment in history
async function recordPaymentHistory(
  userId: string,
  paymentOrderId: string,
  transactionType: "purchase" | "renewal" | "refund",
  amount: number,
  status: string,
) {
  const { error } = await supabase.from("payment_history").insert({
    user_id: userId,
    payment_order_id: paymentOrderId,
    transaction_type: transactionType,
    amount,
    status,
  });

  if (error) console.error("Failed to record payment history", error);
}

// Calculate payment summary
export function calculatePaymentSummary(baseAmount: number, taxRate: number = 0.18) {
  const taxAmount = baseAmount * taxRate;
  const finalAmount = baseAmount + taxAmount;

  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    finalAmount: Math.round(finalAmount * 100) / 100,
  };
}

// Validate payment details
export function validatePaymentDetails(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.customer_email || !data.customer_email.includes("@")) {
    errors.push("Valid email is required");
  }

  if (!data.customer_phone || data.customer_phone.length < 10) {
    errors.push("Valid phone number is required");
  }

  if (!data.billing_address || !data.billing_address.street) {
    errors.push("Billing address is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
