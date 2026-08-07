import { supabase } from "@/integrations/supabase/client";
import { notifyMentorOfAssignment, notifyStudentOfMentorAssignment } from "@/lib/session-request-notifications";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { request_id, mentor_id, assigned_by } = body;
    if (!request_id || !mentor_id || !assigned_by)
      return new Response("missing params", { status: 400 });

    // Verify the request exists and is in a pending state
    const { data: request, error: reqErr } = await (supabase as any)
      .from("session_requests")
      .select("*")
      .eq("id", request_id)
      .maybeSingle();
    if (reqErr) throw reqErr;
    if (!request)
      return new Response(JSON.stringify({ error: "request not found" }), { status: 404 });

    // Verify the mentor exists and is active
    const { data: mentorProfile, error: mentorErr } = await (supabase as any)
      .from("mentor_profiles")
      .select("user_id, is_active")
      .eq("user_id", mentor_id)
      .maybeSingle();
    if (mentorErr) throw mentorErr;
    if (!mentorProfile || !mentorProfile.is_active) {
      return new Response(JSON.stringify({ error: "mentor not found or inactive" }), {
        status: 400,
      });
    }

    // Get mentor and student names for notifications
    const { data: mentorProfileData } = await (supabase as any)
      .from("profiles")
      .select("full_name")
      .eq("id", mentor_id)
      .maybeSingle();

    const { data: studentProfile } = await (supabase as any)
      .from("profiles")
      .select("full_name")
      .eq("id", request.student_id)
      .maybeSingle();

    const mentorName = mentorProfileData?.full_name || "A mentor";
    const studentName = studentProfile?.full_name || "Student";

    // Insert assignment_history
    const { error: e1 } = await (supabase as any)
      .from("assignment_history")
      .insert([
        { request_id, mentor_id, assigned_by, status: "assigned", reason: "admin_assignment" },
      ]);
    if (e1) throw e1;

    // Update session_requests to set assigned_mentor and status with SLA timer
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 min SLA
    const { error: e2 } = await (supabase as any)
      .from("session_requests")
      .update({
        assigned_mentor: mentor_id,
        status: "pending_mentor_response",
        sla_assigned_at: now.toISOString(),
        sla_deadline: slaDeadline,
        updated_at: now.toISOString(),
      })
      .eq("id", request_id);
    if (e2) throw e2;

    // Send notifications using the notification service
    await notifyMentorOfAssignment({
      requestId: request_id,
      mentorId: mentor_id,
      studentName: studentName,
      topic: request.topic || "General",
      scheduledTime: request.scheduled_time,
      slaDeadline: slaDeadline,
    });

    await notifyStudentOfMentorAssignment({
      requestId: request_id,
      studentId: request.student_id,
      mentorName: mentorName,
      topic: request.topic || "General",
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
