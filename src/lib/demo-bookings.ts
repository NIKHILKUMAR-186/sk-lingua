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
  acceptance_deadline: string | null;
  assignment_version: number;
  assignment_accepted_at: string | null;
  assignment_expired_at: string | null;
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

// Assignment statuses — tracks the mentor/admin assignment lifecycle
export const DEMO_ASSIGNMENT_STATUSES = {
  UNASSIGNED: "unassigned",
  PENDING_ACCEPTANCE: "pending_acceptance",
  ACCEPTED: "accepted",
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
  NEEDS_REASSIGNMENT: "needs_reassignment",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
} as const;

// Valid state transitions for assignment_status
export const DEMO_ASSIGNMENT_TRANSITIONS: Record<string, string[]> = {
  unassigned: ["pending_acceptance", "confirmed"],
  pending_acceptance: ["accepted", "rejected", "expired", "needs_reassignment"],
  accepted: ["confirmed", "needs_reassignment"],
  confirmed: ["cancelled"],
  rejected: ["needs_reassignment"],
  expired: ["pending_acceptance", "confirmed"],
  needs_reassignment: ["pending_acceptance", "confirmed"],
  cancelled: [],
};

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

// ============================================================
// NEW LIFECYCLE FUNCTIONS
// ============================================================

// Validate a meeting link URL
export function validateMeetingLink(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    // Must have a hostname (valid URL structure)
    if (!parsed.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

// Check if a demo assignment has expired
export function isAssignmentExpired(booking: DemoBooking): boolean {
  if (booking.assignment_status !== "pending_acceptance") return false;
  if (!booking.acceptance_deadline) return false;
  return new Date(booking.acceptance_deadline) <= new Date();
}

// Calculate remaining time (seconds) before acceptance deadline
export function getAcceptanceTimeRemaining(booking: DemoBooking): number | null {
  if (booking.assignment_status !== "pending_acceptance") return null;
  if (!booking.acceptance_deadline) return null;
  const diff = new Date(booking.acceptance_deadline).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 1000));
}

// Check if assignment is in "attention required" state
export function isAttentionRequired(booking: DemoBooking): boolean {
  // Expired assignment
  if (booking.assignment_status === "expired") return true;
  // Rejected assignment
  if (booking.assignment_status === "rejected") return true;
  // Needs reassignment
  if (booking.assignment_status === "needs_reassignment") return true;
  // Assignment pending but booking confirmed without meeting link
  if (
    (booking.assignment_status === "accepted" || booking.assignment_status === "confirmed") &&
    !booking.meeting_link &&
    booking.booking_status === "confirmed"
  ) {
    // Check if session is starting soon (within 15 min)
    const sessionStart = new Date(`${booking.booking_date}T${booking.booking_time_start}`);
    const now = new Date();
    const diffMs = sessionStart.getTime() - now.getTime();
    if (diffMs > 0 && diffMs < 15 * 60 * 1000) {
      return true;
    }
  }
  return false;
}

// Get the next actionable step for a demo booking
export function getDemoNextAction(
  booking: DemoBooking,
  userRole: "admin" | "mentor" | "student",
): string | null {
  const status = booking.assignment_status || "unassigned";
  const bookingStatus = booking.booking_status;

  if (userRole === "admin") {
    switch (status) {
      case "unassigned":
      case "needs_reassignment":
      case "expired":
      case "rejected":
        return "Assign Mentor";
      case "pending_acceptance":
        return "Waiting for Mentor";
      case "accepted":
        return "Waiting for Meeting Link";
      case "confirmed":
        if (!booking.meeting_link) return "Add Meeting Link";
        if (bookingStatus === "confirmed") return "Ready";
        if (bookingStatus === "pending_admin_confirmation") return "Make Ready";
        return null;
      default:
        return null;
    }
  }

  if (userRole === "mentor") {
    switch (status) {
      case "pending_acceptance":
        return "Accept or Reject Assignment";
      case "accepted":
        return "Add Meeting Link";
      case "confirmed":
        if (!booking.meeting_link) return "Awaiting Meeting Link";
        return "Ready";
      default:
        return null;
    }
  }

  if (userRole === "student") {
    if (
      bookingStatus === "cancelled" ||
      bookingStatus === "completed" ||
      bookingStatus === "no_show"
    ) {
      return null;
    }
    if (bookingStatus === "pending_admin_confirmation") {
      return "Awaiting Admin Confirmation";
    }
    if (status === "pending_acceptance") {
      return "Finding the right mentor";
    }
    if (!booking.meeting_link) {
      if (status === "accepted" || status === "confirmed") {
        return "Preparing meeting link";
      }
      return "Preparing your session";
    }
    return "Join Demo";
  }

  return null;
}

// Filter bookings for admin queue display
export function getAdminDemoQueueFilter(bookings: DemoBooking[], filter: string): DemoBooking[] {
  switch (filter) {
    case "needs_assignment":
      return bookings.filter(
        (b) =>
          b.booking_status === "pending_admin_confirmation" &&
          ["unassigned", "needs_reassignment", "expired", "rejected"].includes(
            b.assignment_status || "unassigned",
          ),
      );
    case "awaiting_mentor":
      return bookings.filter((b) => b.assignment_status === "pending_acceptance");
    case "expired":
      return bookings.filter((b) => b.assignment_status === "expired");
    case "waiting_for_link":
      return bookings.filter(
        (b) =>
          (b.assignment_status === "accepted" || b.assignment_status === "confirmed") &&
          !b.meeting_link &&
          b.booking_status === "confirmed",
      );
    case "ready":
      return bookings.filter((b) => b.booking_status === "confirmed" && !!b.meeting_link);
    case "attention":
      return bookings.filter((b) => isAttentionRequired(b));
    case "all_pre_session":
      return bookings.filter(
        (b) =>
          b.booking_status !== "completed" &&
          b.booking_status !== "cancelled" &&
          b.booking_status !== "no_show",
      );
    default:
      return bookings;
  }
}

// Sort bookings for admin queue
export function sortDemoBookings(
  bookings: DemoBooking[],
  sortBy: "starting_soon" | "oldest_waiting" | "recently_assigned" | "recently_updated",
): DemoBooking[] {
  const now = Date.now();

  return [...bookings].sort((a, b) => {
    switch (sortBy) {
      case "starting_soon": {
        const aTime = new Date(`${a.booking_date}T${a.booking_time_start}`).getTime();
        const bTime = new Date(`${b.booking_date}T${b.booking_time_start}`).getTime();
        return aTime - bTime;
      }
      case "oldest_waiting": {
        const aTime = a.assigned_at
          ? new Date(a.assigned_at).getTime()
          : new Date(a.created_at).getTime();
        const bTime = b.assigned_at
          ? new Date(b.assigned_at).getTime()
          : new Date(b.created_at).getTime();
        return aTime - bTime;
      }
      case "recently_assigned": {
        const aTime = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
        const bTime = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
        return bTime - aTime;
      }
      case "recently_updated":
      default: {
        const aTime = new Date(a.updated_at).getTime();
        const bTime = new Date(b.updated_at).getTime();
        return bTime - aTime;
      }
    }
  });
}

// Extended DemoBooking interface with new fields
export interface DemoBookingExtended extends DemoBooking {
  acceptance_deadline: string | null;
  assignment_version: number;
  assignment_accepted_at: string | null;
  assignment_expired_at: string | null;
}

// Add meeting link to a demo booking (via API)
export async function addDemoMeetingLink(
  bookingId: string,
  meetingLink: string,
  userId: string,
  isMentor: boolean,
): Promise<{ success: boolean; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch("/api/demo/add-meeting-link", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: JSON.stringify({
      bookingId,
      meetingLink,
      userId,
      isMentor,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error || "Failed to add meeting link");
  }
  return json;
}

// Expire assignments (admin action or scheduled)
export async function expireDemoAssignments(): Promise<{ expired_count: number }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch("/api/admin/demo/expire-assignments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: JSON.stringify({}),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error || "Failed to expire assignments");
  }
  return json;
}

// Update the assign mentor function to use the new API with version support
export async function assignMentorToDemo(
  bookingId: string,
  mentorId: string,
  clientVersion?: number,
): Promise<{ success: boolean; assignment_version: number; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch("/api/admin/demo/assign-mentor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: JSON.stringify({
      bookingId,
      mentorId,
      clientVersion,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error || "Failed to assign mentor");
  }
  return json;
}

// Update the admin take session function
export async function adminTakeDemoSession(
  bookingId: string,
  clientVersion?: number,
): Promise<{ success: boolean; assignment_version: number; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch("/api/admin/demo/take-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: JSON.stringify({
      bookingId,
      clientVersion,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error || "Failed to take session");
  }
  return json;
}
