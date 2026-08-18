import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { applicationId, note, actorId } = body;
    if (!applicationId || !note || !actorId)
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });

    // append admin note to mentor_applications.admin_notes (simple append with timestamp)
    const noteEntry = { actor_id: actorId, note, created_at: new Date().toISOString() };
    const admin = supabaseAdmin as any;
    const { data: appNotes } = await admin
      .from("mentor_applications")
      .select("admin_notes")
      .eq("id", applicationId)
      .maybeSingle();
    const current = appNotes?.admin_notes ?? "";
    const updated = current
      ? `${current}\n[${noteEntry.created_at}] ${note}`
      : `[${noteEntry.created_at}] ${note}`;
    const { error: updErr } = await admin
      .from("mentor_applications")
      .update({ admin_notes: updated })
      .eq("id", applicationId);
    if (updErr) throw updErr;
    await admin.from("audit_logs").insert([
      {
        actor_id: actorId,
        scope: "mentor_applications",
        action: "admin_note",
        details: { application_id: applicationId, note },
      },
    ]);

    // notify applicant
    const { data: app } = await admin
      .from("mentor_applications")
      .select("user_id,email")
      .eq("id", applicationId)
      .maybeSingle();
    const userId = app?.user_id ?? null;
    if (userId) {
      await admin
        .from("notifications")
        .insert([
          { user_id: userId, type: "admin_note", payload: { application_id: applicationId, note } },
        ]);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
}
