import { supabase } from "@/integrations/supabase/client";

// ============================================================
// Session Request Notification Service
// ============================================================

/**
 * Send notification to all admins when a student creates a session request
 */
export async function notifyAdminsOfNewSessionRequest(data: {
  requestId: string;
  studentId: string;
  studentName: string;
  topic: string;
  language: string;
  scheduledTime: string;
}): Promise<void> {
  try {
    // Get all admin users
    const { data: admins, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError || !admins || admins.length === 0) {
      console.error("Error fetching admins or no admins found:", adminError);
      return;
    }

    // Create notifications for all admins
    const notifications = admins.map((admin) => ({
      user_id: admin.user_id,
      title: "New Session Request",
      body: `${data.studentName} has requested a session: ${data.topic || "General"} (${data.language})`,
      kind: "booking",
      category: "session_request",
      related_id: data.requestId,
      metadata: {
        request_id: data.requestId,
        student_id: data.studentId,
        student_name: data.studentName,
        topic: data.topic,
        language: data.language,
        scheduled_time: data.scheduledTime,
      },
    }));

    const { error: notifError } = await supabase.from("notifications").insert(notifications);

    if (notifError) {
      console.error("Failed to send admin notifications:", notifError);
    } else {
      console.log(`Sent ${notifications.length} admin notifications for session request ${data.requestId}`);
    }
  } catch (error) {
    console.error("Error in notifyAdminsOfNewSessionRequest:", error);
  }
}

/**
 * Send notification to mentor when assigned to a session request
 */
export async function notifyMentorOfAssignment(data: {
  requestId: string;
  mentorId: string;
  studentName: string;
  topic: string;
  scheduledTime: string;
  slaDeadline: string;
}): Promise<void> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: data.mentorId,
      title: "New Session Assignment",
      body: `You have been assigned to a session with ${data.studentName}: ${data.topic}. Please respond within 15 minutes.`,
      kind: "booking",
      category: "session_assignment",
      related_id: data.requestId,
      metadata: {
        request_id: data.requestId,
        student_name: data.studentName,
        topic: data.topic,
        scheduled_time: data.scheduledTime,
        sla_deadline: data.slaDeadline,
      },
    });

    if (error) {
      console.error("Failed to send mentor notification:", error);
    } else {
      console.log(`Sent mentor notification to ${data.mentorId} for request ${data.requestId}`);
    }
  } catch (error) {
    console.error("Error in notifyMentorOfAssignment:", error);
  }
}

/**
 * Send notification to student when mentor is assigned
 */
export async function notifyStudentOfMentorAssignment(data: {
  requestId: string;
  studentId: string;
  mentorName: string;
  topic: string;
}): Promise<void> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: data.studentId,
      title: "Mentor Assigned",
      body: `A mentor has been assigned for your session: ${data.mentorName} (${data.topic}). Waiting for confirmation.`,
      kind: "booking",
      category: "session_update",
      related_id: data.requestId,
      metadata: {
        request_id: data.requestId,
        mentor_name: data.mentorName,
        topic: data.topic,
      },
    });

    if (error) {
      console.error("Failed to send student notification:", error);
    } else {
      console.log(`Sent student notification to ${data.studentId} for request ${data.requestId}`);
    }
  } catch (error) {
    console.error("Error in notifyStudentOfMentorAssignment:", error);
  }
}

/**
 * Send notification to student when session is confirmed
 */
export async function notifyStudentOfConfirmation(data: {
  requestId: string;
  studentId: string;
  mentorName: string;
  topic: string;
  sessionId: string;
}): Promise<void> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: data.studentId,
      title: "Session Confirmed",
      body: `Your session with ${data.mentorName} (${data.topic}) has been confirmed!`,
      kind: "booking",
      category: "session_confirmed",
      related_id: data.sessionId,
      metadata: {
        request_id: data.requestId,
        session_id: data.sessionId,
        mentor_name: data.mentorName,
        topic: data.topic,
      },
    });

    if (error) {
      console.error("Failed to send confirmation notification:", error);
    } else {
      console.log(`Sent confirmation notification to student ${data.studentId}`);
    }
  } catch (error) {
    console.error("Error in notifyStudentOfConfirmation:", error);
  }
}

/**
 * Send notification to student when session is rejected
 */
export async function notifyStudentOfRejection(data: {
  requestId: string;
  studentId: string;
  mentorName: string;
  topic: string;
  reason?: string;
}): Promise<void> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: data.studentId,
      title: "Session Request Declined",
      body: `${data.mentorName} declined the session request for ${data.topic}.${data.reason ? ` Reason: ${data.reason}` : ""} Please request another mentor.`,
      kind: "booking",
      category: "session_rejected",
      related_id: data.requestId,
      metadata: {
        request_id: data.requestId,
        mentor_name: data.mentorName,
        topic: data.topic,
        reason: data.reason,
      },
    });

    if (error) {
      console.error("Failed to send rejection notification:", error);
    } else {
      console.log(`Sent rejection notification to student ${data.studentId}`);
    }
  } catch (error) {
    console.error("Error in notifyStudentOfRejection:", error);
  }
}

/**
 * Send notification to admin when mentor responds
 */
export async function notifyAdminOfMentorResponse(data: {
  requestId: string;
  mentorName: string;
  action: "accepted" | "rejected";
  topic: string;
}): Promise<void> {
  try {
    // Get all admin users
    const { data: admins, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError || !admins || admins.length === 0) {
      return;
    }

    const actionText = data.action === "accepted" ? "accepted" : "declined";
    const notifications = admins.map((admin) => ({
      user_id: admin.user_id,
      title: `Mentor ${actionText} Session`,
      body: `${data.mentorName} has ${actionText} the session request for ${data.topic}.`,
      kind: "booking",
      category: "mentor_response",
      related_id: data.requestId,
      metadata: {
        request_id: data.requestId,
        mentor_name: data.mentorName,
        action: data.action,
        topic: data.topic,
      },
    }));

    const { error: notifError } = await supabase.from("notifications").insert(notifications);

    if (notifError) {
      console.error("Failed to send admin notifications:", notifError);
    }
  } catch (error) {
    console.error("Error in notifyAdminOfMentorResponse:", error);
  }
}