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
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Input shape for creating a new subscription plan (admin only).
 * billing_cycle defaults to "monthly" when omitted so the NOT NULL
 * database column is always satisfied.
 */
export interface SubscriptionPlanInput {
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
  billing_cycle?: string;
  num_sessions: number;
  validity_days?: number | null;
  recommended?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export interface StudentSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_session_slots: number;
  total_session_slots: number;
  used_session_slots: number;
  bonus_slots: number;
  price_at_purchase: number | null;
  currency_at_purchase: string | null;
  validity_days_at_purchase: number | null;
  payment_order_id: string | null;
  purchased_at: string;
  activated_at: string | null;
  expires_at: string | null;
  renewed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason?: string | null;
  plan?: SubscriptionPlan;
}

// Get all active subscription plans
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ------------------------------------------------------------------
// ADMIN plan management (write access is enforced by Supabase RLS:
// only users with the 'admin' role in user_roles can INSERT/UPDATE).
// ------------------------------------------------------------------

// List ALL plans for the admin UI (active + inactive), deterministic order.
export async function listAllPlansForAdmin(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// Create a new subscription plan (admin only).
export async function createSubscriptionPlan(
  input: SubscriptionPlanInput,
): Promise<SubscriptionPlan> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .insert({
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      currency: input.currency ?? "INR",
      billing_cycle: input.billing_cycle ?? "monthly",
      num_sessions: input.num_sessions,
      validity_days: input.validity_days ?? null,
      is_active: input.is_active ?? true,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update an existing subscription plan (admin only).
export async function updateSubscriptionPlan(
  planId: string,
  input: Partial<SubscriptionPlanInput>,
): Promise<SubscriptionPlan> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .update({
      name: input.name,
      description: input.description,
      price: input.price,
      currency: input.currency,
      billing_cycle: input.billing_cycle,
      num_sessions: input.num_sessions,
      validity_days: input.validity_days,
      is_active: input.is_active,
      sort_order: input.sort_order,
    })
    .eq("id", planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Toggle a plan between active / inactive (admin only).
// Deactivated plans remain in the database for historical references.
export async function setPlanActive(planId: string, isActive: boolean): Promise<SubscriptionPlan> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .update({ is_active: isActive })
    .eq("id", planId)
    .select()
    .single();

  if (error) throw error;
  return data;
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

// Get current active subscription for student (authoritative, checks status & expiration)
export async function getCurrentStudentSubscription(userId: string): Promise<StudentSubscription | null> {
  const { data, error } = await (supabase.from("student_subscriptions" as any) as any)
    .select("*, plan:subscription_plans(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Check client-side / runtime timestamp expiration derived check
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // Subscription timestamp has expired
    return {
      ...data,
      status: "expired",
    };
  }

  return data;
}

// Alias for getStudentSubscription
export const getStudentSubscription = getCurrentStudentSubscription;

// Get current subscription for student (including expired/cancelled)
export async function getStudentSubscriptionAnyStatus(
  userId: string,
): Promise<StudentSubscription | null> {
  const { data, error } = await (supabase.from("student_subscriptions" as any) as any)
    .select("*, plan:subscription_plans(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
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

// Purchase subscription (Idempotent + Plan Snapshotting)
export async function purchaseSubscription(
  userId: string,
  planId: string,
  paymentOrderId: string,
): Promise<StudentSubscription> {
  // 1. Idempotency Check: if a subscription for this payment order already exists, return it
  if (paymentOrderId) {
    const { data: existing } = await (supabase.from("student_subscriptions" as any) as any)
      .select("*, plan:subscription_plans(*)")
      .eq("payment_order_id", paymentOrderId)
      .maybeSingle();

    if (existing) {
      return existing;
    }
  }

  // 2. Fetch plan template
  const plan = await getSubscriptionPlan(planId);
  if (!plan) throw new Error("Plan not found");

  if (!plan.is_active) {
    throw new Error("This subscription plan is not active");
  }

  const now = new Date();
  const expiresAt = plan.validity_days
    ? new Date(now.getTime() + plan.validity_days * 24 * 60 * 60 * 1000)
    : null;

  // 3. Insert new subscription with snapshotted values
  const { data, error } = await (supabase.from("student_subscriptions" as any) as any)
    .insert({
      user_id: userId,
      plan_id: planId,
      status: "active",
      current_session_slots: plan.num_sessions,
      total_session_slots: plan.num_sessions,
      used_session_slots: 0,
      bonus_slots: 0,
      price_at_purchase: plan.price,
      currency_at_purchase: plan.currency || "INR",
      validity_days_at_purchase: plan.validity_days,
      payment_order_id: paymentOrderId,
      purchased_at: now.toISOString(),
      activated_at: now.toISOString(),
      expires_at: expiresAt?.toISOString() ?? null,
      metadata: { payment_order_id: paymentOrderId },
    })
    .select("*, plan:subscription_plans(*)")
    .single();

  if (error) {
    // If concurrent insert occurred with same payment_order_id, fetch existing
    if (error.code === "23505" && paymentOrderId) {
      const { data: existing } = await (supabase.from("student_subscriptions" as any) as any)
        .select("*, plan:subscription_plans(*)")
        .eq("payment_order_id", paymentOrderId)
        .single();
      if (existing) return existing;
    }
    throw error;
  }

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

// Check if subscription is active and has slots (enhanced with bonus slots)
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

  if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
    return { canBook: false, reason: "Subscription expired" };
  }

  // Check total available slots (regular + bonus)
  const totalAvailable = sub.current_session_slots + sub.bonus_slots;
  if (totalAvailable <= 0) {
    return { canBook: false, reason: "No slots remaining" };
  }

  return { canBook: true, slotsRemaining: totalAvailable };
}

// Add bonus slots to subscription (admin function)
export async function addBonusSlots(
  userId: string,
  bonusSlots: number,
  reason: string,
): Promise<StudentSubscription> {
  const sub = await getStudentSubscription(userId);
  if (!sub) throw new Error("No active subscription found");

  const { data, error } = await (supabase.from("student_subscriptions" as any) as any)
    .update({
      bonus_slots: (sub.bonus_slots || 0) + bonusSlots,
    })
    .eq("id", sub.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Remove bonus slots from subscription (admin function)
export async function removeBonusSlots(
  userId: string,
  bonusSlotsToRemove: number,
  reason: string,
): Promise<StudentSubscription> {
  const sub = await getStudentSubscription(userId);
  if (!sub) throw new Error("No active subscription found");

  const newBonusSlots = Math.max(0, (sub.bonus_slots || 0) - bonusSlotsToRemove);

  const { data, error } = await (supabase.from("student_subscriptions" as any) as any)
    .update({
      bonus_slots: newBonusSlots,
    })
    .eq("id", sub.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
