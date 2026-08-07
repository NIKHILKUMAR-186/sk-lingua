import { supabase } from "@/integrations/supabase/client";

export interface MentorAssignmentLog {
  id: string;
  session_id: string;
  mentor_id: string;
  action: "assigned" | "accepted" | "rejected" | "timeout" | "reassigned";
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

// Check mentor availability
export async function checkMentorAvailability(
  mentorId: string,
  scheduledTime: string,
  durationMins: number,
): Promise<boolean> {
  try {
    const sessionEnd = new Date(
      new Date(scheduledTime).getTime() + durationMins * 60000,
    ).toISOString();

    const { data, error } = await (supabase.from("sessions" as any) as any)
      .select("id")
      .eq("mentor_id", mentorId)
      .in("status", ["pending_mentor_response", "confirmed", "in_progress"] as any)
      .lt("scheduled_time", sessionEnd)
      .gt("scheduled_time", scheduledTime)
      .limit(1);

    if (error) {
      console.error("Error checking mentor availability", error);
      return false;
    }

    return !data || data.length === 0;
  } catch (error) {
    console.error("Error checking mentor availability", error);
    return false;
  }
}

// Assign mentor to session (admin action)
export async function assignMentorToSession(
  sessionId: string,
  mentorId: string,
  adminId: string,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get session details
    const { data: session, error: sessionError } = await (supabase.from("sessions" as any) as any)
      .select("scheduled_time, duration_mins, status")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return {
        success: false,
        error: "Session not found",
      };
    }

    // Check mentor availability
    const isAvailable = await checkMentorAvailability(
      mentorId,
      session.scheduled_time,
      session.duration_mins,
    );

    if (!isAvailable) {
      return {
        success: false,
        error: "Mentor is not available at this time (schedule conflict)",
      };
    }

    // Update session with mentor
    const { error: updateError } = await (supabase.from("sessions" as any) as any)
      .update({
        mentor_id: mentorId,
        status: "pending_mentor_response",
        last_assigned_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) {
      return {
        success: false,
        error: "Failed to assign mentor",
      };
    }

    // Log assignment
    await logMentorAssignment(
      sessionId,
      mentorId,
      "assigned",
      notes || "Mentor assigned by admin",
      adminId,
    );

    // Send notification to mentor
    await notifyMentorNewAssignment(sessionId, mentorId);

    // Set up 15-minute timeout (using database function or scheduled job)
    await scheduleMentorTimeout(sessionId, mentorId);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error assigning mentor", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

// Mentor accepts session
export async function mentorAcceptSession(
  sessionId: string,
  mentorId: string,
  videoCallLink?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update session status
    const { error: updateError } = await (supabase.from("sessions" as any) as any)
      .update({
        status: "confirmed",
        mentor_responded_at: new Date().toISOString(),
        video_call_link: videoCallLink || null,
      })
      .eq("id", sessionId)
      .eq("mentor_id", mentorId)
      .eq("status", "pending_mentor_response");

    if (updateError) {
      return {
        success: false,
        error: "Failed to accept session",
      };
    }

    // Log acceptance
    await logMentorAssignment(
      sessionId,
      mentorId,
      "accepted",
      "Mentor accepted the session",
      mentorId,
    );

    // Get student ID
    const { data: session } = await (supabase.from("sessions" as any) as any)
      .select("student_id, scheduled_time")
      .eq("id", sessionId)
      .single();

    if (session) {
      // Send notification to student
      await notifyStudentMentorAssigned(sessionId, session.student_id, mentorId);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error accepting session", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

// Mentor rejects session
export async function mentorRejectSession(
  sessionId: string,
  mentorId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get session details before updating
    const { data: session } = await (supabase.from("sessions" as any) as any)
      .select("student_id")
      .eq("id", sessionId)
      .eq("mentor_id", mentorId)
      .single();

    // Update session - return to pending_admin_assignment
    const { error: updateError } = await (supabase.from("sessions" as any) as any)
      .update({
        status: "pending_admin_assignment",
        mentor_id: null,
        mentor_responded_at: new Date().toISOString(),
      } as any)
      .eq("id", sessionId)
      .eq("mentor_id", mentorId);

    if (updateError) {
      return {
        success: false,
        error: "Failed to reject session",
      };
    }

    // Log rejection
    await logMentorAssignment(
      sessionId,
      mentorId,
      "rejected",
      reason || "Mentor rejected the session",
      mentorId,
    );

    // Notify admin
    await notifyAdminMentorRejected(sessionId, mentorId, reason);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error rejecting session", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

// Handle mentor timeout (15 minutes no response)
export async function handleMentorTimeout(sessionId: string, mentorId: string): Promise<void> {
  try {
    // Check if mentor still assigned
    const { data: session } = await (supabase.from("sessions" as any) as any)
      .select("status, mentor_id")
      .eq("id", sessionId)
      .single();

    if (
      !session ||
      session.mentor_id !== mentorId ||
      session.status !== "pending_mentor_response"
    ) {
      return; // Session already handled
    }

    // Update session - return to admin queue
    // First get current timeout count
    const { data: currentSession } = await (supabase.from("sessions" as any) as any)
      .select("timeout_count")
      .eq("id", sessionId)
      .single();

    const newTimeoutCount = (currentSession?.timeout_count ?? 0) + 1;

    await (supabase.from("sessions" as any) as any)
      .update({
        status: "pending_admin_assignment",
        mentor_id: null,
        timeout_count: newTimeoutCount,
      } as any)
      .eq("id", sessionId);

    // Log timeout
    await logMentorAssignment(
      sessionId,
      mentorId,
      "timeout",
      "Mentor did not respond within 15 minutes",
      undefined,
    );

    // Notify admin
    await notifyAdminMentorTimeout(sessionId, mentorId);

    // TODO: Auto-assign to next available mentor
    // This would be handled by a background job or edge function
  } catch (error) {
    console.error("Error handling mentor timeout", error);
  }
}

// Get assignment history for a session
export async function getAssignmentHistory(sessionId: string): Promise<MentorAssignmentLog[]> {
  const { data, error } = await (supabase.from("mentor_assignment_logs" as any) as any)
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MentorAssignmentLog[];
}

// Log mentor assignment
export async function logMentorAssignment(
  sessionId: string,
  mentorId: string,
  action: "assigned" | "accepted" | "rejected" | "timeout" | "reassigned",
  notes?: string,
  performedBy?: string,
): Promise<void> {
  await (supabase.from("mentor_assignment_logs" as any) as any).insert({
    session_id: sessionId,
    mentor_id: mentorId,
    action,
    notes: notes || undefined,
    performed_by: performedBy || undefined,
  });
}

// Schedule mentor timeout (15 minutes)
async function scheduleMentorTimeout(sessionId: string, mentorId: string): Promise<void> {
  // In production, this would use a scheduled job or edge function
  // For now, we'll use a simple setTimeout (not recommended for production)
  // In production, use Supabase Edge Functions or a job queue

  const timeoutMs = 15 * 60 * 1000; // 15 minutes

  setTimeout(async () => {
    await handleMentorTimeout(sessionId, mentorId);
  }, timeoutMs);
}

// Notification functions
async function notifyMentorNewAssignment(sessionId: string, mentorId: string) {
  // Get session details
  const { data: session } = await (supabase.from("sessions" as any) as any)
    .select("scheduled_time, topic, language")
    .eq("id", sessionId)
    .single();

  if (!session) return;

  await supabase.from("notifications").insert({
    user_id: mentorId,
    title: "New Session Assignment",
    body: `You have been assigned a new session for ${new Date(session.scheduled_time).toLocaleString()}. Please respond within 15 minutes.`,
    kind: "assignment",
    category: "session",
    related_id: sessionId,
    metadata: {
      session_id: sessionId,
      type: "new_assignment",
      scheduled_time: session.scheduled_time,
      topic: session.topic,
      language: session.language,
    },
  });
}

async function notifyStudentMentorAssigned(sessionId: string, studentId: string, mentorId: string) {
  // Get mentor details
  const { data: mentor } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", mentorId)
    .single();

  // Get session details
  const { data: session } = await (supabase.from("sessions" as any) as any)
    .select("scheduled_time, video_call_link")
    .eq("id", sessionId)
    .single();

  if (!session) return;

  await supabase.from("notifications").insert({
    user_id: studentId,
    title: "Mentor Assigned",
    body: `${mentor?.full_name || "A mentor"} has been assigned to your session on ${new Date(session.scheduled_time).toLocaleString()}.`,
    kind: "assignment",
    category: "session",
    related_id: sessionId,
    metadata: {
      session_id: sessionId,
      mentor_id: mentorId,
      mentor_name: mentor?.full_name,
      mentor_avatar: mentor?.avatar_url,
      scheduled_time: session.scheduled_time,
      video_call_link: session.video_call_link,
      type: "mentor_assigned",
    },
  });
}

async function notifyAdminMentorRejected(sessionId: string, mentorId: string, reason?: string) {
  // Get all admin users
  const { data: admins } = await (supabase.from("user_roles" as any) as any)
    .select("user_id")
    .eq("role", "admin");

  if (!admins || admins.length === 0) return;

  // Get mentor name
  const { data: mentor } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", mentorId)
    .single();

  const notifications = admins.map((admin: any) => ({
    user_id: admin.user_id,
    title: "Mentor Rejected Assignment",
    body: `${mentor?.full_name || "A mentor"} rejected a session assignment. ${reason || ""} Please assign another mentor.`,
    kind: "assignment",
    category: "session",
    related_id: sessionId,
    metadata: {
      session_id: sessionId,
      mentor_id: mentorId,
      reason: reason,
      type: "mentor_rejected",
    },
  }));

  await supabase.from("notifications").insert(notifications);
}

async function notifyAdminMentorTimeout(sessionId: string, mentorId: string) {
  // Get all admin users
  const { data: admins } = await (supabase.from("user_roles" as any) as any)
    .select("user_id")
    .eq("role", "admin");

  if (!admins || admins.length === 0) return;

  // Get mentor name
  const { data: mentor } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", mentorId)
    .single();

  const notifications = admins.map((admin: any) => ({
    user_id: admin.user_id,
    title: "Mentor Assignment Timeout",
    body: `${mentor?.full_name || "A mentor"} did not respond within 15 minutes. Please assign another mentor.`,
    kind: "assignment",
    category: "session",
    related_id: sessionId,
    metadata: {
      session_id: sessionId,
      mentor_id: mentorId,
      type: "mentor_timeout",
    },
  }));

  await supabase.from("notifications").insert(notifications);
}
