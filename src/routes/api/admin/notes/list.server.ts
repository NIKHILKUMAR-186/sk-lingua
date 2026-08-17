import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const url = new URL(request.url);
    const entityType = url.searchParams.get("entity_type");
    const entityId = url.searchParams.get("entity_id");

    if (!entityType || !entityId) {
      return json({ success: false, error: "Missing entity_type or entity_id" }, 400);
    }

    if (!["student", "mentor"].includes(entityType)) {
      return json({ success: false, error: "Invalid entity_type. Must be 'student' or 'mentor'." }, 400);
    }

    const admin = supabaseAdmin as any;
    const { data: notes, error } = await admin
      .from("admin_notes")
      .select("id, note, created_by, created_at, updated_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return json({ success: true, data: notes ?? [] });
  } catch (err: any) {
    console.error("[admin/notes/list] error:", err);
    return json({ success: false, error: "Unable to load notes." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { entity_type, entity_id, note } = body;

    if (!entity_type || !entity_id || !note) {
      return json({ success: false, error: "Missing entity_type, entity_id, or note" }, 400);
    }

    if (!["student", "mentor"].includes(entity_type)) {
      return json({ success: false, error: "Invalid entity_type. Must be 'student' or 'mentor'." }, 400);
    }

    const admin = supabaseAdmin as any;

    const { data: inserted, error } = await admin
      .from("admin_notes")
      .insert({
        entity_type,
        entity_id,
        note,
        created_by: authResult.userId,
      })
      .select("id, note, created_by, created_at, updated_at")
      .single();

    if (error) throw error;

    return json({ success: true, data: inserted }, 201);
  } catch (err: any) {
    console.error("[admin/notes/create] error:", err);
    return json({ success: false, error: err.message || "Failed to create note." }, 500);
  }
}
