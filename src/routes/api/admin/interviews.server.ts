import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { applicationId, scheduledTime, interviewerId, location, notes } = body;
    if (!applicationId || !scheduledTime || !interviewerId)
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });

    const admin = supabaseAdmin as any;
    const { error } = await admin.from("mentor_application_interviews").insert([
      {
        application_id: applicationId,
        scheduled_time: scheduledTime,
        interviewer_id: interviewerId,
        location,
        notes,
      },
    ]);
    if (error) throw error;

    await admin.from("audit_logs").insert([
      {
        actor_id: interviewerId,
        scope: "mentor_application_interviews",
        action: "schedule",
        details: {
          application_id: applicationId,
          scheduled_time: scheduledTime,
          location,
          notes,
        },
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
      await admin.from("notifications").insert([
        {
          user_id: userId,
          type: "interview_scheduled",
          payload: {
            application_id: applicationId,
            scheduled_time: scheduledTime,
            location,
            notes,
          },
        },
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

export async function PUT({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { interviewId, scheduledTime, interviewerId, location, notes, status } = body;
    if (!interviewId || !interviewerId)
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });

    const updates: any = {};
    if (scheduledTime) updates.scheduled_time = scheduledTime;
    if (location !== undefined) updates.location = location;
    if (notes !== undefined) updates.notes = notes;

    const admin = supabaseAdmin as any;
    const { error } = await admin
      .from("mentor_application_interviews")
      .update(updates)
      .eq("id", interviewId);
    if (error) throw error;

    await admin.from("audit_logs").insert([
      {
        actor_id: interviewerId,
        scope: "mentor_application_interviews",
        action: "update",
        details: { interview_id: interviewId, updates: updates },
      },
    ]);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
}

export async function DELETE({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const interviewId = url.searchParams.get("id");
    const actorId = url.searchParams.get("actorId");
    if (!interviewId || !actorId)
      return new Response(JSON.stringify({ error: "missing params" }), { status: 400 });

    const admin = supabaseAdmin as any;
    const { error } = await admin
      .from("mentor_application_interviews")
      .delete()
      .eq("id", interviewId);
    if (error) throw error;

    await admin.from("audit_logs").insert([
      {
        actor_id: actorId,
        scope: "mentor_application_interviews",
        action: "cancel",
        details: { interview_id: interviewId },
      },
    ]);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
}
