import { supabase } from "@/integrations/supabase/client";

export async function POST(req: Request) {
  try {
    const { report_id, resolved_by, resolution, restore_slot, student_id } = await req.json();
    if (!report_id || !resolved_by) return new Response("missing params", { status: 400 });

    // Update the report
    const { error: reportErr } = await (supabase as any)
      .from("reports")
      .update({ status: "resolved", resolved_by, resolution })
      .eq("id", report_id);
    if (reportErr) throw reportErr;

    // If admin decides to restore a slot, call the restore logic
    if (restore_slot && student_id) {
      const res = await fetch(new URL("/api/session/restore-slot", req.url).toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ student_id, reason: "admin_resolution" }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || "slot restore failed");
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
