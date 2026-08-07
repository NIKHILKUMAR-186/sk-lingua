import { supabase } from "@/integrations/supabase/client";

// ============================================================
// Subscription Notification Service
// ============================================================

export interface SubscriptionNotificationPayload {
  student_id: string;
  type: 'activated' | 'consumed' | 'low_slots' | 'expired' | 'bonus_added';
  slots_remaining?: number;
  threshold?: number;
  bonus_slots?: number;
  metadata?: Record<string, any>;
}

/**
 * Send subscription-related notifications to students
 */
export async function sendSubscriptionNotification(
  payload: SubscriptionNotificationPayload,
): Promise<void> {
  const { student_id, type, slots_remaining, threshold, bonus_slots, metadata } = payload;

  let title = "";
  let body = "";
  let kind = "subscription";

  switch (type) {
    case "activated":
      title = "Subscription Activated";
      body = `Your subscription has been activated. You now have ${slots_remaining} sessions available.`;
      break;
    case "consumed":
      title = "Session Consumed";
      body = `A session has been used. You have ${slots_remaining} sessions remaining.`;
      kind = "session";
      break;
    case "low_slots":
      title = "Low Session Count";
      body = `You only have ${slots_remaining} sessions remaining. Consider renewing your subscription.`;
      break;
    case "expired":
      title = "Subscription Expired";
      body = "Your subscription has expired. Please renew to continue booking sessions.";
      break;
    case "bonus_added":
      title = "Bonus Sessions Added";
      body = `${bonus_slots} bonus sessions have been added to your account. You now have ${slots_remaining} total sessions available.`;
      break;
  }

  try {
    await supabase.from("notifications").insert({
      user_id: student_id,
      title,
      body,
      kind,
      category: "subscription",
      metadata: {
        type,
        slots_remaining,
        threshold,
        bonus_slots,
        ...metadata,
      },
    });
  } catch (error) {
    console.error("Failed to send subscription notification:", error);
  }
}

/**
 * Send notification to admin about subscription events
 */
export async function sendAdminSubscriptionNotification(
  adminId: string,
  type: 'purchased' | 'expired' | 'last_session_used' | 'manual_adjustment',
  studentName: string,
  metadata?: Record<string, any>,
): Promise<void> {
  let title = "";
  let body = "";

  switch (type) {
    case "purchased":
      title = "New Subscription Purchase";
      body = `${studentName} has purchased a new subscription.`;
      break;
    case "expired":
      title = "Subscription Expired";
      body = `${studentName}'s subscription has expired.`;
      break;
    case "last_session_used":
      title = "Student Used Last Session";
      body = `${studentName} has used their last available session.`;
      break;
    case "manual_adjustment":
      title = "Manual Slot Adjustment";
      body = `A manual slot adjustment was performed for ${studentName}.`;
      break;
  }

  try {
    await supabase.from("notifications").insert({
      user_id: adminId,
      title,
      body,
      kind: "subscription",
      category: "admin",
      metadata: {
        type,
        student_name: studentName,
        ...metadata,
      },
    });
  } catch (error) {
    console.error("Failed to send admin notification:", error);
  }
}

/**
 * Check if student should receive low slots notification
 * Returns true if slots are at or below threshold and notification hasn't been sent recently
 */
export async function shouldSendLowSlotsNotification(
  userId: string,
  threshold: number = 5,
): Promise<boolean> {
  // Get the most recent low_slots notification for this user
  const { data: recentNotification, error } = await supabase
    .from("notifications")
    .select("created_at")
    .eq("user_id", userId)
    .eq("metadata->>type", "low_slots")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error checking notification history:", error);
    return true; // Default to sending if we can't check
  }

  // If no recent notification, send one
  if (!recentNotification) {
    return true;
  }

  // Check if notification was sent more than 24 hours ago
  const lastNotificationTime = new Date(recentNotification.created_at);
  const now = new Date();
  const hoursSinceLastNotification = (now.getTime() - lastNotificationTime.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastNotification >= 24;
}

/**
 * Send low slots notification if threshold is met
 */
export async function checkAndSendLowSlotsNotification(
  userId: string,
  slotsRemaining: number,
  threshold: number = 5,
): Promise<void> {
  if (slotsRemaining > threshold) {
    return; // No need to notify
  }

  const shouldSend = await shouldSendLowSlotsNotification(userId, threshold);
  if (shouldSend) {
    await sendSubscriptionNotification({
      student_id: userId,
      type: "low_slots",
      slots_remaining: slotsRemaining,
      threshold,
    });
  }
}

/**
 * Notify all admins about a subscription event
 */
export async function notifyAllAdmins(
  type: 'purchased' | 'expired' | 'last_session_used' | 'manual_adjustment',
  studentName: string,
  metadata?: Record<string, any>,
): Promise<void> {
  try {
    // Get all admin users
    const { data: admins, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError || !admins) {
      console.error("Error fetching admins:", adminError);
      return;
    }

    // Send notification to each admin
    const notifications = admins.map((admin) => ({
      user_id: admin.user_id,
      title: "",
      body: "",
      kind: "subscription",
      category: "admin",
      metadata: {
        type,
        student_name: studentName,
        ...metadata,
      },
    }));

    // Set title and body based on type
    let title = "";
    let body = "";
    
    switch (type) {
      case "purchased":
        title = "New Subscription Purchase";
        body = `${studentName} has purchased a new subscription.`;
        break;
      case "expired":
        title = "Subscription Expired";
        body = `${studentName}'s subscription has expired.`;
        break;
      case "last_session_used":
        title = "Student Used Last Session";
        body = `${studentName} has used their last available session.`;
        break;
      case "manual_adjustment":
        title = "Manual Slot Adjustment";
        body = `A manual slot adjustment was performed for ${studentName}.`;
        break;
    }

    const notificationsWithContent = notifications.map(n => ({
      ...n,
      title,
      body,
    }));

    await supabase.from("notifications").insert(notificationsWithContent);
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
}