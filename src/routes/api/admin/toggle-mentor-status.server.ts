import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { userId, action, actorId } = body; // action: activate | suspend | reactivate
    if (!userId || !action)
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });

    const admin = supabaseAdmin as any;
    const update: any = {};
    let verificationStatus: string | null = null;

    if (action === "activate" || action === "reactivate") {
      update.is_active = true;
      update.verification_status = "approved";
      verificationStatus = "approved";
    }
    if (action === "suspend") {
      update.is_active = false;
      update.verification_status = "suspended";
      verificationStatus = "suspended";
    }

    const { error } = await admin.from("mentor_profiles").update(update).eq("user_id", userId);
    if (error) throw error;

    // Log to activation history
    await admin.from("mentor_activation_history").insert([
      {
        user_id: userId,
        action,
        details: { user_id: userId, verification_status: verificationStatus },
        performed_by: actorId ?? null,
      },
    ]);

    await admin
      .from("audit_logs")
      .insert([{ actor_id: actorId ?? null, scope: "mentor_profiles", action, details: { user_id: userId } }]);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
}
