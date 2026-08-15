import { supabase } from "@/integrations/supabase/client";
import {
  notifyStudentDemoBooked,
  notifyAdminNewDemoBooking,
  notifyStudentDemoConfirmed,
  notifyStudentDemoCancelled,
  notifyStudentDemoCompleted,
  notifyStudentDemoNoShow,
  notifyStudentDemoRescheduled,
} from "@/lib/demo-notifications";

export interface DemoBooking {
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
  learning_goal: string | null;
  mentor_id: string | null;
  admin_id: string | null;
  assignment_status: string | null;
  assigned_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  no_show_at: string | null;
  rescheduled_at: string | null;
  meeting_link: string | null;
  admin_notes: string | null;
  feedback_provided: boolean;
  converted_to_subscription: boolean;
  subscription_id: string | null;
  demo_workspace_id: string | null;
  created_at: string;
  updated_at: string;
}

// Demo booking statuses (admin-conducted workflow only)
export const DEMO_BOOKING_STATUSES = {
  PENDING_CONFIRMATION: "pending_admin_confirmation",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;

// Statuses that consume the student's one-lifetime demo
export const CONSUMED_DEMO_STATUSES = [
  "pending_admin_confirmation",
  "confirmed",
  "completed",
  "no_show",
];

// Book a new demo session (one-lifetime demo enforced)
export async function bookDemoSession(
  userId: string,
  data: {
    booking_date: string;
    booking_time_start: string;
    booking_time_end: string;
    language: string;
    duration_mins?: number;
    notes?: string;
    learning_goal?: string;
    price?: number;
  },
): Promise<DemoBooking> {
  // Frontend-side one-lifetime demo check (defense in depth; DB trigger is the source of truth)
  const alreadyUsed = await hasUsedDemoSession(userId);
  if (alreadyUsed.used) {
    throw new Error(
      alreadyUsed.booking_id
        ? "You have already used your demo session."
        : "You have already used your demo session.",
    );
  }

  const { data: booking, error } = await supabase
    .from("demo_session_bookings")
    .insert({
      user_id: userId,
      booking_date: data.booking_date,
      booking_time_start: data.booking_time_start,
      booking_time_end: data.booking_time_end,
      language: data.language,
      duration_mins: data.duration_mins ?? 30,
      notes: data.notes,
      learning_goal: data.learning_goal || null,
      payment_status: "pending",
      booking_status: DEMO_BOOKING_STATUSES.PENDING_CONFIRMATION,
      price: data.price ?? 9.0,
    } as any)
    .select()
    .single();

  if (error) {
    // Surface the DB-level one-lifetime demo error verbatim
    const msg = String(error.message || "");
    if (/already used your demo session/i.test(msg)) {
      throw new Error("You have already used your demo session.");
    }
    throw error;
  }

  // Notify student + admins (non-blocking)
  try {
    await notifyStudentDemoBooked(userId, booking.id, booking.booking_date);
    const { data: student } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    await notifyAdminNewDemoBooking(
      booking.id,
      student?.full_name || "a student",
      booking.booking_date,
    );
  } catch (notifyErr) {
    console.error("Failed to send demo booking notifications", notifyErr);
  }

  return booking as DemoBooking;
}

// Check whether a student has already used their one-lifetime demo
export async function hasUsedDemoSession(userId: string): Promise<{
  used: boolean;
  booking_id?: string;
  status?: string;
}> {
  const { data, error } = await supabase
    .from("demo_session_bookings")
    .select("id, booking_status")
    .eq("user_id", userId)
    .in("booking_status", CONSUMED_DEMO_STATUSES)
    .maybeSingle();

  if (error) {
    console.error("Failed to check demo usage", error);
    return { used: false };
  }

  if (data) {
    return { used: true, booking_id: data.id, status: data.booking_status };
  }

  return { used: false };
}

// Get demo booking by ID
export async function getDemoBooking(id: string): Promise<DemoBooking | null> {
  const { data, error } = await supabase
    .from("demo_session_bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as DemoBooking | null;
}

// Get demo bookings for a user (student)
export async function getUserDemoBookings(userId: string): Promise<DemoBooking[]> {
  const { data, error } = await supabase
    .from("demo_session_bookings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DemoBooking[];
}

// Get ALL demo bookings for admin (newest first)
export async function getAdminDemoBookings(): Promise<DemoBooking[]> {
  const { data, error } = await supabase
    .from("demo_session_bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DemoBooking[];
}

// Get demo bookings pending admin confirmation or confirmed (for admin queue)
export async function getAdminPendingDemoBookings(): Promise<DemoBooking[]> {
  const { data, error } = await supabase
    .from("demo_session_bookings")
    .select("*")
    .in("booking_status", ["pending_admin_confirmation", "confirmed"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DemoBooking[];
}

// Get upcoming / active demo booking for a student (dashboard)
export async function getUpcomingDemoBooking(userId: string): Promise<DemoBooking | null> {
  const { data, error } = await supabase
    .from("demo_session_bookings")
    .select("*")
    .eq("user_id", userId)
    .in("booking_status", ["pending_admin_confirmation", "confirmed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as DemoBooking | null;
}

// Update demo booking (admin)
export async function updateDemoBooking(
  id: string,
  updates: Partial<DemoBooking>,
): Promise<DemoBooking> {
  const { data, error } = await supabase
    .from("demo_session_bookings")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DemoBooking;
}

// Admin confirms a demo booking (sets date/time/meeting link + notes)
export async function confirmDemoBooking(
  bookingId: string,
  adminId: string,
  data: {
    booking_date?: string;
    booking_time_start?: string;
    booking_time_end?: string;
    meeting_link: string;
    admin_notes?: string;
  },
): Promise<DemoBooking> {
  const now = new Date().toISOString();

  const updated = await updateDemoBooking(bookingId, {
    admin_id: adminId,
    booking_date: data.booking_date!,
    booking_time_start: data.booking_time_start!,
    booking_time_end: data.booking_time_end!,
    meeting_link: data.meeting_link,
    admin_notes: data.admin_notes || null,
    booking_status: DEMO_BOOKING_STATUSES.CONFIRMED,
    confirmed_at: now,
  });

  // Notify student of confirmation
  try {
    await notifyStudentDemoConfirmed(
      bookingId,
      updated.user_id,
      updated.booking_date,
      updated.meeting_link || "",
    );
  } catch (e) {
    console.error("Failed to notify student (confirmed)", e);
  }

  return updated;
}

// Admin reschedules a demo booking
export async function rescheduleDemoBooking(
  bookingId: string,
  adminId: string,
  data: {
    booking_date: string;
    booking_time_start: string;
    booking_time_end: string;
  },
): Promise<DemoBooking> {
  const now = new Date().toISOString();

  const updated = await updateDemoBooking(bookingId, {
    admin_id: adminId,
    booking_date: data.booking_date,
    booking_time_start: data.booking_time_start,
    booking_time_end: data.booking_time_end,
    booking_status: DEMO_BOOKING_STATUSES.CONFIRMED,
    rescheduled_at: now,
  });

  try {
    await notifyStudentDemoRescheduled(
      bookingId,
      updated.user_id,
      updated.booking_date,
      updated.booking_time_start,
    );
  } catch (e) {
    console.error("Failed to notify student (rescheduled)", e);
  }

  return updated;
}

// Admin cancels a demo booking
export async function cancelDemoBooking(bookingId: string, adminId?: string): Promise<DemoBooking> {
  const now = new Date().toISOString();

  const updated = await updateDemoBooking(bookingId, {
    admin_id: adminId ?? null,
    booking_status: DEMO_BOOKING_STATUSES.CANCELLED,
    cancelled_at: now,
    payment_status: "cancelled",
  });

  try {
    await notifyStudentDemoCancelled(bookingId, updated.user_id);
  } catch (e) {
    console.error("Failed to notify student (cancelled)", e);
  }

  return updated;
}

// Admin marks a demo session as completed
export async function completeDemoSession(
  bookingId: string,
  adminId: string,
  adminNotes?: string,
): Promise<DemoBooking> {
  const now = new Date().toISOString();

  const updated = await updateDemoBooking(bookingId, {
    admin_id: adminId,
    booking_status: DEMO_BOOKING_STATUSES.COMPLETED,
    completed_at: now,
    ...(adminNotes ? { admin_notes: adminNotes } : {}),
  });

  try {
    await notifyStudentDemoCompleted(bookingId, updated.user_id);
  } catch (e) {
    console.error("Failed to notify student (completed)", e);
  }

  return updated;
}

// Admin marks a demo session as no-show
export async function markDemoNoShow(
  bookingId: string,
  adminId: string,
  adminNotes?: string,
): Promise<DemoBooking> {
  const now = new Date().toISOString();

  const updated = await updateDemoBooking(bookingId, {
    admin_id: adminId,
    booking_status: DEMO_BOOKING_STATUSES.NO_SHOW,
    no_show_at: now,
    ...(adminNotes ? { admin_notes: adminNotes } : {}),
  });

  try {
    await notifyStudentDemoNoShow(bookingId, updated.user_id);
  } catch (e) {
    console.error("Failed to notify student (no-show)", e);
  }

  return updated;
}

// Create demo workspace (after confirmation)
export async function createDemoWorkspace(
  bookingId: string,
  adminId: string,
  studentId: string,
): Promise<DemoWorkspace> {
  const { data: workspace, error } = await supabase
    .from("demo_session_workspaces" as any)
    .insert({
      booking_id: bookingId,
      mentor_id: adminId,
      student_id: studentId,
      status: "active",
    } as any)
    .select()
    .single();

  if (error) throw error;

  // Update booking with workspace ID
  await updateDemoBooking(bookingId, {
    demo_workspace_id: (workspace as any).id,
  });

  return workspace as unknown as DemoWorkspace;
}

// Get demo workspace by booking ID
export async function getDemoWorkspaceByBooking(bookingId: string): Promise<DemoWorkspace | null> {
  const { data, error } = await supabase
    .from("demo_session_workspaces" as any)
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) throw error;
  return data as DemoWorkspace | null;
}

// Submit demo feedback
export async function submitDemoFeedback(
  bookingId: string,
  studentId: string,
  data: {
    rating: number;
    feedback_text?: string;
    would_recommend?: boolean;
  },
): Promise<DemoFeedback> {
  const { data: feedback, error } = await supabase
    .from("demo_feedback" as any)
    .insert({
      booking_id: bookingId,
      student_id: studentId,
      rating: data.rating,
      feedback_text: data.feedback_text || null,
      would_recommend: data.would_recommend || null,
    } as any)
    .select()
    .single();

  if (error) throw error;

  // Mark booking as feedback provided
  await updateDemoBooking(bookingId, {
    feedback_provided: true,
  });

  return feedback as unknown as DemoFeedback;
}

// Get assignment history for booking (kept generic for audit)
export async function getDemoAssignmentHistory(
  bookingId: string,
): Promise<DemoAssignmentHistory[]> {
  const { data, error } = await supabase
    .from("demo_assignment_history" as any)
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as DemoAssignmentHistory[];
}

export interface DemoAssignmentHistory {
  id: string;
  booking_id: string;
  mentor_id: string;
  action: string;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface DemoWorkspace {
  id: string;
  booking_id: string;
  mentor_id: string;
  student_id: string;
  video_call_url: string | null;
  chat_enabled: boolean;
  screen_share_enabled: boolean;
  session_notes: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface DemoFeedback {
  id: string;
  booking_id: string;
  student_id: string;
  rating: number;
  feedback_text: string | null;
  would_recommend: boolean | null;
  created_at: string;
}
