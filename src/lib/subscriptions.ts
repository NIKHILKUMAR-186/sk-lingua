import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_cycle: string;
  num_sessions: number;
  validity_days: number | null;
  features: Json;
  recommended: boolean;
  is_active: boolean;
}

export interface StudentSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_session_slots: number;
  total_session_slots: number;
  used_session_slots: number;
  purchased_at: string;
  activated_at: string | null;
  expires_at: string | null;
  renewed_at: string | null;
  cancelled_at: string | null;
  plan?: SubscriptionPlan;
}

// Get all active subscription plans
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return data ?? [];
}

// Get single plan
export async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

// Get demo plan
export async function getDemoPlan(): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("name", "Demo Session")
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

// Get current subscription for student
export async function getStudentSubscription(userId: string): Promise<StudentSubscription | null> {
  const { data, error } = await (supabase.from("student_subscriptions" as any) as any)
    .select("*, plan:subscription_plans(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

// Get all subscriptions for student
export async function getStudentSubscriptionHistory(
  userId: string,
): Promise<StudentSubscription[]> {
  const { data, error } = await (supabase.from("student_subscriptions" as any) as any)
    .select("*, plan:subscription_plans(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Purchase subscription
export async function purchaseSubscription(
  userId: string,
  planId: string,
  paymentOrderId: string,
): Promise<StudentSubscription> {
  const plan = await getSubscriptionPlan(planId);
  if (!plan) throw new Error("Plan not found");

  const now = new Date();
  const expiresAt = plan.validity_days
    ? new Date(now.getTime() + plan.validity_days * 24 * 60 * 60 * 1000)
    : null;

  const { data, error } = await (supabase.from("student_subscriptions" as any) as any)
    .insert({
      user_id: userId,
      plan_id: planId,
      status: "active",
      current_session_slots: plan.num_sessions,
      total_session_slots: plan.num_sessions,
      used_session_slots: 0,
      activated_at: now.toISOString(),
      expires_at: expiresAt?.toISOString() ?? null,
      metadata: { payment_order_id: paymentOrderId },
    })
    .select()
    .single();

  if (error) throw error;

  // Record in subscription history
  await recordSubscriptionEvent(userId, data.id, planId, "purchased");

  return data;
}

// Renew subscription (for when slots expire)
export async function renewSubscription(
  userId: string,
  planId: string,
  paymentOrderId: string,
): Promise<StudentSubscription> {
  const plan = await getSubscriptionPlan(planId);
  if (!plan) throw new Error("Plan not found");

  // Get current subscription
  const currentSub = await getStudentSubscription(userId);

  const now = new Date();
  const expiresAt = plan.validity_days
    ? new Date(now.getTime() + plan.validity_days * 24 * 60 * 60 * 1000)
    : null;

  const { data, error } = await supabase
    .from("student_subscriptions")
    .update({
      status: "active",
      current_session_slots: plan.num_sessions,
      total_session_slots: plan.num_sessions,
      used_session_slots: 0,
      renewed_at: now.toISOString(),
      expires_at: expiresAt?.toISOString() ?? null,
      metadata: { payment_order_id: paymentOrderId },
    })
    .eq("user_id", userId)
    .eq("id", currentSub?.id ?? "")
    .select()
    .single();

  if (error) throw error;

  // Record in subscription history
  await recordSubscriptionEvent(userId, data.id, planId, "renewed");

  return data;
}

// Record subscription event
async function recordSubscriptionEvent(
  userId: string,
  subscriptionId: string,
  planId: string,
  eventType: "purchased" | "renewed" | "upgraded" | "downgraded" | "cancelled" | "expired",
) {
  const { error } = await (supabase.from("subscription_history" as any) as any).insert({
    user_id: userId,
    subscription_id: subscriptionId,
    plan_id: planId,
    event_type: eventType,
  });

  if (error) console.error("Failed to record subscription event", error);
}

// Deduct slots (called when session is completed)
export async function deductSubscriptionSlot(userId: string, slots: number = 1): Promise<boolean> {
  const sub = await getStudentSubscription(userId);
  if (!sub || sub.current_session_slots < slots) {
    return false; // Not enough slots
  }

  const { error } = await supabase
    .from("student_subscriptions")
    .update({
      current_session_slots: sub.current_session_slots - slots,
      used_session_slots: (sub.used_session_slots ?? 0) + slots,
    })
    .eq("id", sub.id);

  if (error) {
    console.error("Failed to deduct slots", error);
    return false;
  }

  return true;
}

// Cancel subscription
export async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
): Promise<StudentSubscription> {
  const now = new Date();

  const { data, error } = await (supabase.from("student_subscriptions" as any) as any)
    .update({
      status: "cancelled",
      cancelled_at: now.toISOString(),
      cancellation_reason: reason,
    })
    .eq("id", subscriptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get remaining slots count
export async function getRemainingSlots(userId: string): Promise<number> {
  const sub = await getStudentSubscription(userId);
  return sub?.current_session_slots ?? 0;
}

// Check if subscription is active and has slots
export async function canBookSession(userId: string): Promise<{
  canBook: boolean;
  reason?: string;
  slotsRemaining?: number;
}> {
  const sub = await getStudentSubscription(userId);

  if (!sub) {
    return { canBook: false, reason: "No active subscription" };
  }

  if (sub.status !== "active") {
    return { canBook: false, reason: "Subscription is not active" };
  }

  if (sub.current_session_slots <= 0) {
    return { canBook: false, reason: "No slots remaining" };
  }

  if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
    return { canBook: false, reason: "Subscription expired" };
  }

  return { canBook: true, slotsRemaining: sub.current_session_slots };
}
