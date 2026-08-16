import { supabase } from "@/integrations/supabase/client";

export interface NotificationPayload {
  user_id: string;
  category:
    | "demo_booking"
    | "demo_confirmation"
    | "demo_reminder"
    | "demo_completed"
    | "demo_cancelled"
    | "demo_no_show"
    | "demo_rescheduled"
    | "subscription";
  kind?: string;
  title: string;
  body: string;
  related_id?: string | null;
  link?: string | null;
  metadata?: any;
}

// Send notification to a user — matches app schema (title/body/category/kind/related_id/link/read)
export async function sendDemoNotification(payload: NotificationPayload) {
  const { error } = await supabase.from("notifications").insert({
    user_id: payload.user_id,
    category: payload.category,
    kind: payload.kind ?? payload.category,
    title: payload.title,
    body: payload.body,
    related_id: payload.related_id ?? null,
    link: payload.link ?? null,
    metadata: payload.metadata || {},
    read: false,
  } as any);

  if (error) console.error("Failed to send notification", error);
}

// ============================================================
// STUDENT NOTIFICATIONS
// ============================================================

// Student: demo booking submitted
export async function notifyStudentDemoBooked(
  userId: string,
  bookingId: string,
  bookingDate: string,
) {
  await sendDemoNotification({
    user_id: userId,
    category: "demo_booking",
    kind: "demo_booking",
    title: "Demo Session Submitted!",
    body: `Your demo session request has been submitted for ${new Date(bookingDate).toDateString()}. Our team will confirm your slot shortly.`,
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "demo_booked" },
  });
}

// Student: demo confirmed (with meeting link)
export async function notifyStudentDemoConfirmed(
  userId: string,
  bookingId: string,
  bookingDate: string,
  meetingLink: string,
) {
  await sendDemoNotification({
    user_id: userId,
    category: "demo_confirmation",
    kind: "demo_confirmation",
    title: "Demo Session Confirmed!",
    body: `Your demo session has been confirmed for ${new Date(bookingDate).toDateString()}. Join here: ${meetingLink || "link will be shared in your dashboard"}.`,
    related_id: bookingId,
    link: meetingLink || null,
    metadata: { booking_id: bookingId, type: "demo_confirmed", meeting_link: meetingLink },
  });
}

// Student: demo rescheduled
export async function notifyStudentDemoRescheduled(
  userId: string,
  bookingId: string,
  bookingDate: string,
  bookingTime: string,
) {
  await sendDemoNotification({
    user_id: userId,
    category: "demo_rescheduled",
    kind: "demo_rescheduled",
    title: "Demo Session Rescheduled",
    body: `Your demo session has been rescheduled to ${new Date(bookingDate).toDateString()} at ${bookingTime}.`,
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "demo_rescheduled" },
  });
}

// Student: demo cancelled
export async function notifyStudentDemoCancelled(userId: string, bookingId: string) {
  await sendDemoNotification({
    user_id: userId,
    category: "demo_cancelled",
    kind: "demo_cancelled",
    title: "Demo Session Cancelled",
    body: "Your demo session has been cancelled. If this was not expected, please contact support.",
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "demo_cancelled" },
  });
}

// Student: demo completed
export async function notifyStudentDemoCompleted(userId: string, bookingId: string) {
  await sendDemoNotification({
    user_id: userId,
    category: "demo_completed",
    kind: "demo_completed",
    title: "Demo Session Completed!",
    body: "Your demo session has been completed. Please provide feedback and choose a subscription plan to continue your learning journey.",
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "demo_completed" },
  });
}

// Student: demo no-show
export async function notifyStudentDemoNoShow(userId: string, bookingId: string) {
  await sendDemoNotification({
    user_id: userId,
    category: "demo_no_show",
    kind: "demo_no_show",
    title: "Demo Session Marked No-Show",
    body: "Your demo session was marked as a no-show. Please reach out to support to reschedule.",
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "demo_no_show" },
  });
}

// Student: demo reminder
export async function sendDemoReminder(userId: string, bookingId: string, bookingTime: string) {
  await sendDemoNotification({
    user_id: userId,
    category: "demo_reminder",
    kind: "demo_reminder",
    title: "Demo Session Reminder",
    body: `Your demo session is coming up at ${bookingTime}. Click here to join.`,
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "demo_reminder" },
  });
}

// Student: subscription availability (upsell after demo)
export async function notifyStudentSubscriptionAvailable(userId: string, bookingId: string) {
  await sendDemoNotification({
    user_id: userId,
    category: "subscription",
    kind: "subscription",
    title: "Choose Your Learning Plan",
    body: "Your demo session is complete! Choose a subscription plan to continue learning with one of our verified mentors.",
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "subscription_available" },
  });
}

// ============================================================
// ADMIN NOTIFICATIONS
// ============================================================

// Admin: new demo booking pending confirmation
export async function notifyAdminNewDemoBooking(
  bookingId: string,
  studentName: string,
  bookingDate: string,
) {
  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");

  if (!admins || admins.length === 0) return;

  const notifications = admins.map((admin) => ({
    user_id: admin.user_id,
    category: "demo_booking",
    kind: "demo_booking",
    title: "New Demo Booking Request",
    body: `Student ${studentName} has requested a demo session for ${new Date(bookingDate).toDateString()}. Review and confirm the slot.`,
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "new_demo_booking", student_name: studentName },
    read: false,
  }));

  const { error } = await supabase.from("notifications").insert(notifications as any);
  if (error) console.error("Failed to send admin notifications", error);
}

// Admin: reminder helpers (called by scheduled jobs / on confirm)
export async function notifyAdminUpcomingDemo(
  bookingId: string,
  studentName: string,
  bookingDate: string,
  bookingTime: string,
) {
  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  if (!admins || admins.length === 0) return;

  const notifications = admins.map((admin) => ({
    user_id: admin.user_id,
    category: "demo_reminder",
    kind: "demo_reminder",
    title: "Upcoming Demo Session",
    body: `Demo session with ${studentName} is scheduled for ${new Date(bookingDate).toDateString()} at ${bookingTime}.`,
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "upcoming_demo", student_name: studentName },
    read: false,
  }));

  const { error } = await supabase.from("notifications").insert(notifications as any);
  if (error) console.error("Failed to send admin reminder", error);
}

export async function notifyAdminTodayDemo(
  bookingId: string,
  studentName: string,
  bookingTime: string,
) {
  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  if (!admins || admins.length === 0) return;

  const notifications = admins.map((admin) => ({
    user_id: admin.user_id,
    category: "demo_reminder",
    kind: "demo_reminder",
    title: "Today's Demo Session",
    body: `You have a demo session today with ${studentName} at ${bookingTime}.`,
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "today_demo", student_name: studentName },
    read: false,
  }));

  const { error } = await supabase.from("notifications").insert(notifications as any);
  if (error) console.error("Failed to send admin today-demo reminder", error);
}

// Mentor: assigned to demo session
export async function notifyMentorDemoAssigned(
  mentorId: string,
  bookingId: string,
  studentName: string,
  bookingDate: string,
  bookingTime: string,
) {
  await sendDemoNotification({
    user_id: mentorId,
    category: "demo_booking",
    kind: "demo_assignment",
    title: "New Demo Session Request",
    body: `You have been assigned a demo session with ${studentName} on ${new Date(bookingDate).toDateString()} at ${bookingTime}. Please accept or reject.`,
    related_id: bookingId,
    link: "/mentor/calendar",
    metadata: { booking_id: bookingId, type: "demo_assigned", student_name: studentName },
  });
}

// Mentor: demo assignment accepted
export async function notifyMentorDemoAccepted(
  mentorId: string,
  bookingId: string,
) {
  await sendDemoNotification({
    user_id: mentorId,
    category: "demo_booking",
    kind: "demo_accepted",
    title: "Demo Session Accepted",
    body: "You have accepted the demo session. Please prepare for the session.",
    related_id: bookingId,
    link: "/mentor/sessions",
    metadata: { booking_id: bookingId, type: "demo_accepted" },
  });
}

// Mentor: demo assignment rejected
export async function notifyMentorDemoRejected(
  mentorId: string,
  bookingId: string,
) {
  await sendDemoNotification({
    user_id: mentorId,
    category: "demo_booking",
    kind: "demo_rejected",
    title: "Demo Session Rejected",
    body: "You have rejected the demo session. No further action is required.",
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "demo_rejected" },
  });
}
