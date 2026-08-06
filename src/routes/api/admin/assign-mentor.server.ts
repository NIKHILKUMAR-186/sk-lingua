import { supabase } from "@/integrations/supabase/client";

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

    // Insert assignment_history
    const { error: e1 } = await (supabase as any)
      .from("assignment_history")
      .insert([
        { request_id, mentor_id, assigned_by, status: "assigned", reason: "admin_assignment" },
      ]);
    if (e1) throw e1;

    // Update session_requests to set assigned_mentor and status
    const { error: e2 } = await (supabase as any)
      .from("session_requests")
      .update({
        assigned_mentor: mentor_id,
        status: "pending_mentor_response",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request_id);
    if (e2) throw e2;

    // Notify the mentor
    await (supabase as any).from("notifications").insert([
      {
        user_id: mentor_id,
        title: "New session request assigned",
        body: `A session request for "${request.topic || "language session"}" has been assigned to you. Please respond.`,
        link: "/mentor/requests",
        category: "session",
        kind: "session_assigned",
        related_id: request_id,
      },
    ]);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
