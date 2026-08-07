import { supabase } from "@/integrations/supabase/client";
import {
  bookSessionWithSlotDeduction,
  cancelSessionWithSlotRelease,
} from "@/lib/booking-validation";

export interface SessionBooking {
  id: string;
  student_id: string;
  mentor_id: string | null;
  scheduled_time: string;
  duration_mins: number;
  status: string;
  language: string;
  topic: string | null;
  student_message: string | null;
  video_call_link: string | null;
  notes: string | null;
  assignment_history: any[];
  timeout_count: number;
  last_assigned_at: string | null;
  mentor_responded_at: string | null;
  session_started_at: string | null;
  session_ended_at: string | null;
  extension_requested_at: string | null;
  extension_approved_at: string | null;
  extension_mins: number;
  created_at: string;
  updated_at: string;
}

// Book a new session
export async function bookSession(
  userId: string,
  bookingData: {
    mentor_id: string;
    scheduled_time: string;
    duration_mins: number;
    language: string;
    topic?: string;
    student_message?: string;
  },
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    // Use the booking validation system which handles slot deduction
    const result = await bookSessionWithSlotDeduction(userId, bookingData);

    if (result.success && result.bookingId) {
      // Update status to pending_admin_assignment
      const { error: updateError } = await (supabase.from("sessions" as any) as any)
        .update({ status: "pending_admin_assignment" })
        .eq("id", result.bookingId);

      if (updateError) {
        console.error("Failed to update session status", updateError);
      }

      // Log initial assignment
      await logMentorAssignment(
        result.bookingId,
        bookingData.mentor_id,
        "assigned",
        "Session booked, pending admin assignment",
        userId,
      );

      // Send notification to admin
      await notifyAdminNewBooking(result.bookingId, userId, bookingData.scheduled_time);
    }

    return result;
  } catch (error) {
    console.error("Error booking session", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

// Cancel session
export async function cancelSession(
  bookingId: string,
  userId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await cancelSessionWithSlotRelease(bookingId, userId, reason);

    if (result.success) {
      // Log cancellation
      await logMentorAssignment(
        bookingId,
        "",
        "cancelled",
        reason || "Session cancelled by student",
        userId,
      );

      // Send notification to mentor if assigned
      const { data: session } = await (supabase.from("sessions" as any) as any)
        .select("mentor_id")
        .eq("id", bookingId)
        .single();

      if (session?.mentor_id) {
        await notifyMentorSessionCancelled(bookingId, session.mentor_id, reason);
      }
    }

    return result;
  } catch (error) {
    console.error("Error cancelling session", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

// Get session by ID
export async function getSession(sessionId: string): Promise<SessionBooking | null> {
  const { data, error } = await (supabase.from("sessions" as any) as any)
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) throw error;
  return data as SessionBooking | null;
}

// Get sessions for student
export async function getStudentSessions(studentId: string): Promise<SessionBooking[]> {
  const { data, error } = await (supabase.from("sessions" as any) as any)
    .select("*")
    .eq("student_id", studentId)
    .order("scheduled_time", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SessionBooking[];
}

// Get sessions for mentor
export async function getMentorSessions(mentorId: string): Promise<SessionBooking[]> {
  const { data, error } = await (supabase.from("sessions" as any) as any)
    .select("*")
    .eq("mentor_id", mentorId)
    .order("scheduled_time", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SessionBooking[];
}

// Get upcoming sessions
export async function getUpcomingSessions(
  userId: string,
  role: "student" | "mentor",
): Promise<SessionBooking[]> {
  const now = new Date().toISOString();
  const field = role === "student" ? "student_id" : "mentor_id";

  const { data, error } = await (supabase.from("sessions" as any) as any)
    .select("*")
    .eq(field, userId)
    .in("status", [
      "pending_admin_assignment",
      "pending_mentor_response",
      "confirmed",
      "in_progress",
    ] as any)
    .gte("scheduled_time", now)
    .order("scheduled_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SessionBooking[];
}

// Complete session
export async function completeSession(
  sessionId: string,
  mentorId: string,
  sessionNotes?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get session details
    const { data: session, error: fetchError } = await (supabase.from("sessions" as any) as any)
      .select("student_id, scheduled_time, duration_mins")
      .eq("id", sessionId)
      .eq("mentor_id", mentorId)
      .single();

    if (fetchError || !session) {
      return {
        success: false,
        error: "Session not found",
      };
    }

    // Update session status
    const { error: updateError } = await (supabase.from("sessions" as any) as any)
      .update({
        status: "completed",
        session_ended_at: new Date().toISOString(),
        notes: sessionNotes,
      } as any)
      .eq("id", sessionId);

    if (updateError) {
      return {
        success: false,
        error: "Failed to complete session",
      };
    }

    // Deduct slot from student subscription
    const { completeSessionWithSlotDeduction } = await import("@/lib/booking-validation");
    const slotResult = await completeSessionWithSlotDeduction(session.student_id, sessionId);

    if (!slotResult.success) {
      console.error("Failed to deduct slot", slotResult.error);
    }

    // Log completion
    await logMentorAssignment(
      sessionId,
      mentorId,
      "completed",
      sessionNotes || "Session completed",
      mentorId,
    );

    // Send notification to student
    await notifyStudentSessionCompleted(sessionId, session.student_id);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error completing session", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

// Log mentor assignment
export async function logMentorAssignment(
  sessionId: string,
  mentorId: string,
  action: string,
  notes?: string,
  performedBy?: string,
): Promise<void> {
  await (supabase.from("mentor_assignment_logs" as any) as any).insert({
    session_id: sessionId,
    mentor_id: mentorId,
    action,
    notes: notes || null,
    performed_by: performedBy || null,
  });
}

// Notification functions
async function notifyAdminNewBooking(bookingId: string, studentId: string, scheduledTime: string) {
  // Get all admin users
  const { data: admins } = await (supabase.from("user_roles" as any) as any)
    .select("user_id")
    .eq("role", "admin");

  if (!admins || admins.length === 0) return;

  const notifications = admins.map((admin: any) => ({
    user_id: admin.user_id,
    title: "New Session Booking",
    body: `A student has booked a session for ${new Date(scheduledTime).toLocaleString()}. Please assign a mentor.`,
    kind: "booking",
    category: "session",
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "new_booking" },
  }));

  await supabase.from("notifications").insert(notifications);
}

async function notifyMentorSessionCancelled(bookingId: string, mentorId: string, reason?: string) {
  await supabase.from("notifications").insert({
    user_id: mentorId,
    title: "Session Cancelled",
    body: `A session has been cancelled. ${reason || ""}`,
    kind: "booking",
    category: "session",
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "cancelled" },
  });
}

async function notifyStudentSessionCompleted(bookingId: string, studentId: string) {
  await supabase.from("notifications").insert({
    user_id: studentId,
    title: "Session Completed",
    body: "Your session has been completed. Please rate your experience.",
    kind: "booking",
    category: "session",
    related_id: bookingId,
    metadata: { booking_id: bookingId, type: "completed" },
  });
}
