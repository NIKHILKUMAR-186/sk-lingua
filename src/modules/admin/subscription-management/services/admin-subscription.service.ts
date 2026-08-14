import { supabase } from "@/integrations/supabase/client";
import type {
  SubscriptionSlotAdjustment,
  SubscriptionUsageLog,
  SubscriptionSummary,
  StudentSubscriptionInfo,
  AdminSlotAdjustmentData,
} from "@/types/subscription-management";

// ============================================================
// Admin Subscription Management Service
// ============================================================

/**
 * Get all students with their subscription information (admin only)
 */
export async function getAllStudentSubscriptions(): Promise<StudentSubscriptionInfo[]> {
  const { data, error } = await supabase.rpc("get_all_student_subscriptions");

  if (error) throw error;
  return data ?? [];
}

/**
 * Get subscription summary for a specific student (admin only)
 */
export async function getStudentSubscriptionSummary(
  userId: string,
): Promise<SubscriptionSummary | null> {
  const { data, error } = await supabase.rpc("get_subscription_summary", {
    p_user_id: userId,
  });

  if (error) throw error;
  return data?.[0] ?? null;
}

/**
 * Adjust student slots (admin only)
 * This is the main function for all manual slot adjustments
 */
export async function adjustStudentSlots(
  data: AdminSlotAdjustmentData,
): Promise<SubscriptionSlotAdjustment> {
  // First, get the current subscription state
  const { data: subscription, error: subError } = await supabase
    .from("student_subscriptions")
    .select("*")
    .eq("id", data.subscription_id)
    .single();

  if (subError || !subscription) {
    throw new Error("Subscription not found");
  }

  const oldRemainingSlots = subscription.current_session_slots;
  const oldBonusSlots = subscription.bonus_slots;
  let newRemainingSlots = oldRemainingSlots;
  let newBonusSlots = oldBonusSlots;

  // Calculate new values based on action
  switch (data.action) {
    case "increase_slots":
      newRemainingSlots = Math.max(0, oldRemainingSlots + data.slots_change);
      break;
    case "decrease_slots":
      newRemainingSlots = Math.max(0, oldRemainingSlots - data.slots_change);
      break;
    case "add_bonus":
      newBonusSlots = Math.max(0, oldBonusSlots + data.bonus_change);
      break;
    case "remove_bonus":
      newBonusSlots = Math.max(0, oldBonusSlots - data.bonus_change);
      break;
    case "expire":
      await supabase
        .from("student_subscriptions")
        .update({
          status: "expired",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: data.reason,
        })
        .eq("id", data.subscription_id);
      break;
    case "suspend":
      await supabase
        .from("student_subscriptions")
        .update({
          status: "suspended",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: data.reason,
        })
        .eq("id", data.subscription_id);
      break;
    case "reactivate":
      await supabase
        .from("student_subscriptions")
        .update({
          status: "active",
          cancelled_at: null,
          cancellation_reason: null,
        })
        .eq("id", data.subscription_id);
      break;
    default:
      throw new Error(`Unknown action: ${data.action}`);
  }

  // Update subscription if it's not expire/suspend/reactivate (those are handled above)
  if (!["expire", "suspend", "reactivate"].includes(data.action)) {
    const { error: updateError } = await supabase
      .from("student_subscriptions")
      .update({
        current_session_slots: newRemainingSlots,
        bonus_slots: newBonusSlots,
      })
      .eq("id", data.subscription_id);

    if (updateError) throw updateError;
  }

  // Create adjustment record using the database function
  const { data: adjustment, error: adjustmentError } = await supabase.rpc(
    "create_slot_adjustment",
    {
      p_student_id: data.student_id,
      p_subscription_id: data.subscription_id,
      p_admin_id: data.admin_id,
      p_action: data.action,
      p_old_remaining_slots: oldRemainingSlots,
      p_new_remaining_slots: newRemainingSlots,
      p_old_bonus_slots: oldBonusSlots,
      p_new_bonus_slots: newBonusSlots,
      p_reason: data.reason,
      p_metadata: data.metadata || {},
    },
  );

  if (adjustmentError) throw adjustmentError;

  return adjustment as SubscriptionSlotAdjustment;
}

/**
 * Get adjustment history for a specific student (admin only)
 */
export async function getStudentAdjustmentHistory(
  studentId: string,
  limit: number = 50,
): Promise<SubscriptionSlotAdjustment[]> {
  const { data, error } = await supabase
    .from("subscription_slot_adjustments")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SubscriptionSlotAdjustment[];
}

/**
 * Get usage logs for a specific student (admin only)
 */
export async function getStudentUsageLogs(
  studentId: string,
  limit: number = 50,
): Promise<SubscriptionUsageLog[]> {
  const { data, error } = await supabase
    .from("subscription_usage_logs")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SubscriptionUsageLog[];
}

/**
 * Get all recent adjustments across all students (admin only)
 */
export async function getAllRecentAdjustments(
  limit: number = 100,
): Promise<SubscriptionSlotAdjustment[]> {
  const { data, error } = await supabase
    .from("subscription_slot_adjustments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SubscriptionSlotAdjustment[];
}

/**
 * Get dashboard statistics (admin only)
 */
export async function getAdminDashboardStats() {
  const [studentsResult, adjustmentsResult] = await Promise.all([
    // Get all active subscriptions
    (supabase.rpc as any)("get_all_student_subscriptions"),
    
    // Get recent adjustments
    (supabase.from("subscription_slot_adjustments" as any) as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (studentsResult.error) throw studentsResult.error;
  if (adjustmentsResult.error) throw adjustmentsResult.error;

  const students = Array.isArray(studentsResult.data) ? studentsResult.data : [];
  const recentAdjustments = Array.isArray(adjustmentsResult.data) ? adjustmentsResult.data : [];

  const stats = {
    totalActiveSubscriptions: students.length,
    totalExpired: 0, // Would need a separate query
    totalSessionsRemaining: students.reduce(
      (sum: number, s: any) => sum + (s.available_slots || 0),
      0,
    ),
    studentsNearExpiry: students.filter((s: any) => s.is_near_expiry).length,
    studentsWithZeroSlots: students.filter((s: any) => s.is_zero_slots).length,
    recentAdjustments,
  };

  return stats;
}

/**
 * Extend subscription expiry (admin only)
 */
export async function extendSubscriptionExpiry(
  subscriptionId: string,
  daysToAdd: number,
  adminId: string,
  reason: string,
): Promise<SubscriptionSlotAdjustment> {
  // Get current subscription
  const { data: subscription, error: subError } = await supabase
    .from("student_subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();

  if (subError || !subscription) {
    throw new Error("Subscription not found");
  }

  const currentExpiry = subscription.expires_at
    ? new Date(subscription.expires_at)
    : new Date();
  const newExpiry = new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  // Update subscription
  const { error: updateError } = await supabase
    .from("student_subscriptions")
    .update({
      expires_at: newExpiry.toISOString(),
    })
    .eq("id", subscriptionId);

  if (updateError) throw updateError;

  // Create adjustment record
  const { data: adjustment, error: adjustmentError } = await (supabase.rpc as any)(
    "create_slot_adjustment",
    {
      p_student_id: subscription.user_id,
      p_subscription_id: subscriptionId,
      p_admin_id: adminId,
      p_action: "extend_expiry",
      p_old_remaining_slots: subscription.current_session_slots,
      p_new_remaining_slots: subscription.current_session_slots,
      p_old_bonus_slots: subscription.bonus_slots,
      p_new_bonus_slots: subscription.bonus_slots,
      p_reason: reason,
      p_metadata: {
        old_expiry: subscription.expires_at,
        new_expiry: newExpiry.toISOString(),
        days_added: daysToAdd,
      },
    },
  );

  if (adjustmentError) throw adjustmentError;

  return adjustment as unknown as SubscriptionSlotAdjustment;
}

/**
 * Replace subscription plan (admin only)
 */
export async function replaceSubscriptionPlan(
  subscriptionId: string,
  newPlanId: string,
  adminId: string,
  reason: string,
): Promise<SubscriptionSlotAdjustment> {
  // Get current subscription
  const { data: subscription, error: subError } = await supabase
    .from("student_subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();

  if (subError || !subscription) {
    throw new Error("Subscription not found");
  }

  // Get new plan details
  const { data: newPlan, error: planError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", newPlanId)
    .single();

  if (planError || !newPlan) {
    throw new Error("New plan not found");
  }

  const oldRemainingSlots = subscription.current_session_slots;
  const newRemainingSlots = newPlan.num_sessions;

  // Update subscription
  const { error: updateError } = await supabase
    .from("student_subscriptions")
    .update({
      plan_id: newPlanId,
      current_session_slots: newRemainingSlots,
      total_session_slots: newPlan.num_sessions,
      used_session_slots: 0,
    })
    .eq("id", subscriptionId);

  if (updateError) throw updateError;

  // Create adjustment record
  const { data: adjustment, error: adjustmentError } = await (supabase.rpc as any)(
    "create_slot_adjustment",
    {
      p_student_id: subscription.user_id,
      p_subscription_id: subscriptionId,
      p_admin_id: adminId,
      p_action: "replace",
      p_old_remaining_slots: oldRemainingSlots,
      p_new_remaining_slots: newRemainingSlots,
      p_old_bonus_slots: subscription.bonus_slots,
      p_new_bonus_slots: subscription.bonus_slots,
      p_reason: reason,
      p_metadata: {
        old_plan_id: subscription.plan_id,
        new_plan_id: newPlanId,
        old_plan_name: (subscription as any).plan?.name || "Unknown",
        new_plan_name: newPlan.name,
      },
    },
  );

  if (adjustmentError) throw adjustmentError;

  return adjustment as unknown as SubscriptionSlotAdjustment;
}