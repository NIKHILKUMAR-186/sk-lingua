import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const {
      title,
      body: message,
      link,
      category,
      kind,
      priority,
      target_type,
      target_role,
      target_state,
      target_language,
      target_plan_id,
      target_user_ids,
      expires_at,
      scheduled_at,
      actor_id,
    } = body;

    if (!title || !message || !target_type) {
      return new Response(JSON.stringify({ error: "missing required fields" }), { status: 400 });
    }

    const admin = supabaseAdmin as any;
    const now = new Date().toISOString();

    // Create broadcast record
    const { data: broadcast, error: broadcastError } = await admin
      .from("notification_broadcasts")
      .insert([
        {
          title,
          body: message,
          link,
          category: category || "general",
          kind: kind || "broadcast",
          priority: priority || "normal",
          target_type,
          target_role,
          target_state,
          target_language,
          target_plan_id,
          target_user_ids,
          expires_at,
          scheduled_at,
          status: scheduled_at && new Date(scheduled_at) > new Date() ? "scheduled" : "sent",
          sent_at: scheduled_at && new Date(scheduled_at) > new Date() ? null : now,
          created_by: actor_id,
        },
      ])
      .select()
      .single();

    if (broadcastError) throw broadcastError;

    // Query target users
    let userIds: string[] = [];

    if (target_type === "all") {
      const { data: users } = await admin.auth.admin.listUsers();
      userIds = users?.users?.map((u: any) => u.id) || [];
    } else if (target_type === "students") {
      const { data: roles } = await admin.from("user_roles").select("user_id").eq("role", "student");
      userIds = roles?.map((r: any) => r.user_id) || [];
    } else if (target_type === "mentors") {
      const { data: roles } = await admin.from("user_roles").select("user_id").eq("role", "mentor");
      userIds = roles?.map((r: any) => r.user_id) || [];
    } else if (target_type === "individual" && target_user_ids) {
      userIds = target_user_ids;
    } else if (target_type === "state") {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id")
        .eq("country", target_state);
      userIds = profiles?.map((p: any) => p.id) || [];
    } else if (target_type === "language") {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id")
        .eq("native_language", target_language);
      userIds = profiles?.map((p: any) => p.id) || [];
    } else if (target_type === "plan") {
      const { data: subscriptions } = await admin
        .from("student_subscriptions")
        .select("user_id")
        .eq("plan_id", target_plan_id)
        .eq("status", "active");
      userIds = subscriptions?.map((s: any) => s.user_id) || [];
    }

    // Insert notifications for each target user
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      title,
      body: message,
      link,
      category: category || "general",
      kind: kind || "broadcast",
      priority: priority || "normal",
      expires_at,
      broadcast_id: broadcast.id,
      target_role,
      target_state,
      target_language,
      target_plan_id,
      metadata: { broadcast_id: broadcast.id, target_type },
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await admin.from("notifications").insert(notifications);
      if (notifError) throw notifError;
    }

    // Update broadcast stats
    await admin
      .from("notification_broadcasts")
      .update({
        total_recipients: userIds.length,
        total_delivered: userIds.length,
      })
      .eq("id", broadcast.id);

    // Log audit
    await admin.from("audit_logs").insert([
      {
        actor_id: actor_id,
        scope: "notification_broadcasts",
        action: "send",
        target_entity: "notification_broadcast",
        target_id: broadcast.id,
        description: `Broadcast sent to ${userIds.length} users (${target_type})`,
        metadata: { title, target_type, recipient_count: userIds.length },
      },
    ]);

    return new Response(
      JSON.stringify({ ok: true, broadcast_id: broadcast.id, recipients: userIds.length }),
      { status: 200 },
    );
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
}