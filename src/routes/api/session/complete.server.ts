import { supabase } from "@/integrations/supabase/client";
import { deductSubscriptionSlot } from "@/lib/subscriptions";

export async function POST(req: Request) {
  try {
    const { session_id, student_id } = await req.json();
    if (!session_id || !student_id) return new Response("missing params", { status: 400 });

    // Mark session completed
    const { error: sessionErr } = await (supabase as any)
      .from("sessions")
      .update({ status: "completed" })
      .eq("id", session_id);
    if (sessionErr) throw sessionErr;

    // Deduct subscription slot
    const ok = await deductSubscriptionSlot(student_id, 1);

    // Create a timeline entry for the completion
    await (supabase as any).from("session_timeline").insert([
      {
        session_id,
        event_type: "session_completed",
        title: "Session completed",
        detail: "The session has been marked as completed.",
        created_by: student_id,
      },
    ]);

    return new Response(JSON.stringify({ ok, slotDeducted: ok }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
