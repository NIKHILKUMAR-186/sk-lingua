import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { userId, action } = body; // action: activate | suspend | reactivate
    if (!userId || !action)
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });

    const update: any = {};
    if (action === "activate" || action === "reactivate") update.is_active = true;
    if (action === "suspend") update.is_active = false;

    const admin = supabaseAdmin as any;
    const { error } = await admin.from("mentor_profiles").update(update).eq("user_id", userId);
    if (error) throw error;

    await admin
      .from("audit_logs")
      .insert([{ actor_id: null, scope: "mentor_profiles", action, details: { user_id: userId } }]);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
}
