import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/demo/send-reminders
// Periodic escalation: sends reminders to mentors awaiting response
// 5-minute reminder, 8-min urgent reminder, expiration, missing meeting link alerts
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;

    const now = new Date();
    let reminders5min = 0;
    let reminders8min = 0;
    const expiredCount = 0;
    let missingLinkAlerts = 0;

    // 1. Find pending_acceptance assignments that need reminders
    const { data: pendingAssignments } = await admin
      .from("demo_session_bookings")
      .select("id, mentor_id, assignment_version, acceptance_deadline")
      .eq("assignment_status", "pending_acceptance")
      .not("acceptance_deadline", "is", null);

    for (const assignment of pendingAssignments ?? []) {
      const deadline = new Date(assignment.acceptance_deadline);
      const timeRemaining = deadline.getTime() - now.getTime();

      if (timeRemaining <= 0) {
        // Expired - handled by expire endpoint, skip here
        continue;
      }

      const within5min = timeRemaining <= 5 * 60 * 1000;
      const within3min = timeRemaining <= 3 * 60 * 1000;

      // Check if we already sent a reminder for this phase
      const { data: recentHistory } = await admin
        .from("demo_assignment_history")
        .select("id")
        .eq("booking_id", assignment.id)
        .in("action", ["reminder_5min", "reminder_8min"])
        .gte("created_at", new Date(now.getTime() - 60 * 1000).toISOString())
        .limit(1);

      if (recentHistory && recentHistory.length > 0) {
        continue; // Already sent recently
      }

      if (within3min) {
        // 8-minute mark (urgent reminder)
        if (assignment.mentor_id) {
          await admin.from("notifications").insert({
            user_id: assignment.mentor_id,
            category: "demo_reminder",
            kind: "reminder_8min",
            title: "Urgent: Demo Response Needed",
            body: "Your demo assignment expires soon. Please respond now.",
            related_id: assignment.id,
            link: "/mentor/calendar",
            metadata: { booking_id: assignment.id, urgency: "urgent" },
            read: false,
          });
        }
        await admin.from("demo_assignment_history").insert({
          booking_id: assignment.id,
          mentor_id: assignment.mentor_id,
          action: "reminder_8min",
          performed_by: authResult.userId,
          metadata: { urgency: "urgent" },
        });
        reminders8min++;
      } else if (within5min && timeRemaining > 3 * 60 * 1000) {
        // 5-minute reminder
        if (assignment.mentor_id) {
          await admin.from("notifications").insert({
            user_id: assignment.mentor_id,
            category: "demo_reminder",
            kind: "reminder_5min",
            title: "Demo Response Needed",
            body: "Your demo assignment expires in 5 minutes. Please accept or decline.",
            related_id: assignment.id,
            link: "/mentor/calendar",
            metadata: { booking_id: assignment.id, urgency: "normal" },
            read: false,
          });
        }
        await admin.from("demo_assignment_history").insert({
          booking_id: assignment.id,
          mentor_id: assignment.mentor_id,
          action: "reminder_5min",
          performed_by: authResult.userId,
          metadata: { urgency: "normal" },
        });
        reminders5min++;
      }
    }

    // 2. Find accepted sessions missing meeting links (within 15 min of start)
    const { data: acceptedSessions } = await admin
      .from("demo_session_bookings")
      .select("id, mentor_id, meeting_link, booking_date, booking_time_start")
      .in("assignment_status", ["accepted", "confirmed"])
      .is("meeting_link", null)
      .eq("booking_status", "confirmed");

    for (const session of acceptedSessions ?? []) {
      if (session.meeting_link) continue;

      const sessionStart = new Date(`${session.booking_date}T${session.booking_time_start}`);
      const timeToStart = sessionStart.getTime() - now.getTime();

      if (timeToStart > 0 && timeToStart < 15 * 60 * 1000) {
        // Alert the mentor
        if (session.mentor_id) {
          await admin.from("notifications").insert({
            user_id: session.mentor_id,
            category: "demo_missing_link",
            kind: "missing_meeting_link",
            title: "Meeting Link Required",
            body: "Please add a meeting link — your demo starts soon.",
            related_id: session.id,
            link: "/mentor/calendar",
            metadata: { booking_id: session.id, type: "missing_link" },
            read: false,
          });
        }
        missingLinkAlerts++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_5min: reminders5min,
        reminders_8min: reminders8min,
        expired_count: expiredCount,
        missing_link_alerts: missingLinkAlerts,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Send reminders error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
