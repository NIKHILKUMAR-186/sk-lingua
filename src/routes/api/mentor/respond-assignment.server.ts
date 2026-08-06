import { supabase } from "@/integrations/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { request_id, mentor_id, action } = body; // action: 'accept' | 'reject'
    if (!request_id || !mentor_id || !action)
      return new Response("missing params", { status: 400 });

    // Fetch the session request
    const { data: request, error: reqErr } = await (supabase as any)
      .from("session_requests")
      .select("*")
      .eq("id", request_id)
      .maybeSingle();
    if (reqErr) throw reqErr;
    if (!request)
      return new Response(JSON.stringify({ error: "request not found" }), { status: 404 });

    // Verify this mentor is the assigned mentor
    if (request.assigned_mentor !== mentor_id) {
      return new Response(JSON.stringify({ error: "not assigned to this mentor" }), {
        status: 403,
      });
    }

    if (action === "accept") {
      // Update session_requests status to confirmed
      const { error: e1 } = await (supabase as any)
        .from("session_requests")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          mentor_response_at: new Date().toISOString(),
        })
        .eq("id", request_id);
      if (e1) throw e1;

      // Create a session record in the existing sessions table
      const { data: sessionData, error: e2 } = await (supabase as any)
        .from("sessions")
        .insert({
          student_id: request.student_id,
          mentor_id,
          scheduled_time: request.scheduled_time,
          duration_mins: request.duration_mins,
          status: "accepted",
          notes: request.notes || null,
          student_message: request.topic || null,
        })
        .select("*")
        .single();
      if (e2) throw e2;

      // Link the session to the request
      await (supabase as any)
        .from("session_requests")
        .update({ session_id: sessionData.id })
        .eq("id", request_id);

      // Create workspace for the accepted session
      const title = request.topic ? `Session: ${request.topic}` : "Session workspace";
      const { data: wsData, error: e3 } = await (supabase as any)
        .from("workspaces")
        .insert([{ request_id, session_id: sessionData.id, title, created_by: mentor_id }])
        .select("*")
        .single();
      if (e3) throw e3;

      // Add workspace members (mentor + student)
      const { error: e4 } = await (supabase as any).from("workspace_members").insert([
        { workspace_id: wsData.id, user_id: mentor_id, role: "mentor" },
        { workspace_id: wsData.id, user_id: request.student_id, role: "student" },
      ]);
      if (e4) throw e4;

      // Log assignment history
      await (supabase as any)
        .from("assignment_history")
        .insert([{ request_id, mentor_id, status: "accepted", reason: "mentor_accept" }]);

      // Notify the student
      await (supabase as any).from("notifications").insert([
        {
          user_id: request.student_id,
          title: "Session confirmed",
          body: `Your session request for "${request.topic || "language session"}" has been accepted by a mentor.`,
          link: "/student/sessions",
          category: "session",
          kind: "session_confirmed",
          related_id: request_id,
        },
      ]);

      return new Response(JSON.stringify({ ok: true, session: sessionData, workspace: wsData }), {
        status: 200,
      });
    } else if (action === "reject") {
      // Log rejection in assignment history
      const { error } = await (supabase as any)
        .from("assignment_history")
        .insert([{ request_id, mentor_id, status: "rejected", reason: "mentor_reject" }]);
      if (error) throw error;

      // Reset the request back to unassigned for admin to reassign
      await (supabase as any)
        .from("session_requests")
        .update({
          assigned_mentor: null,
          status: "unassigned",
          mentor_response_at: new Date().toISOString(),
        })
        .eq("id", request_id);

      // Notify admin about the rejection
      const { data: admins } = await (supabase as any)
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      for (const admin of admins ?? []) {
        await (supabase as any).from("notifications").insert([
          {
            user_id: admin.user_id,
            title: "Mentor rejected a session request",
            body: `A mentor rejected the session request for "${request.topic || "language session"}". It needs reassignment.`,
            link: "/admin/booking-queue",
            category: "session",
            kind: "session_rejected",
            related_id: request_id,
          },
        ]);
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response("invalid action", { status: 400 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
