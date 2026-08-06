import { supabase } from "@/integrations/supabase/client";

export async function POST() {
  try {
    const fifteenAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    // find requests pending_mentor_response older than 15 minutes
    const { data: stale = [] } = await (supabase as any)
      .from("session_requests")
      .select("*")
      .eq("status", "pending_mentor_response")
      .lt("updated_at", fifteenAgo)
      .limit(50);

    let processed = 0;

    for (const req of stale) {
      // Log timeout
      await (supabase as any).from("assignment_history").insert([
        {
          request_id: req.id,
          mentor_id: req.assigned_mentor,
          status: "timeout",
          reason: "mentor_no_response",
        },
      ]);

      // Find active mentors who are not the previous one and are active
      const { data: mentors } = await (supabase as any)
        .from("mentor_profiles")
        .select("user_id")
        .eq("is_active", true)
        .neq("user_id", req.assigned_mentor)
        .limit(1);

      const nextMentor = mentors?.[0]?.user_id;

      if (!nextMentor) {
        // Mark unassigned back to admin queue
        await (supabase as any)
          .from("session_requests")
          .update({ assigned_mentor: null, status: "unassigned" })
          .eq("id", req.id);
        continue;
      }

      // Assign to next mentor
      await (supabase as any).from("assignment_history").insert([
        {
          request_id: req.id,
          mentor_id: nextMentor,
          status: "assigned",
          reason: "auto_reassign",
        },
      ]);
      await (supabase as any)
        .from("session_requests")
        .update({
          assigned_mentor: nextMentor,
          status: "pending_mentor_response",
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.id);

      // Notify the new mentor
      await (supabase as any).from("notifications").insert([
        {
          user_id: nextMentor,
          title: "New session request assigned",
          body: `A session request for "${req.topic || "language session"}" has been auto-assigned to you. Please respond.`,
          link: "/mentor/requests",
          category: "session",
          kind: "session_assigned",
          related_id: req.id,
        },
      ]);

      processed++;
    }

    return new Response(JSON.stringify({ processed }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
