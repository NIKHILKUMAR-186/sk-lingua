import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const VALID_STATUSES = new Set(["verified", "unverified", "pending", "rejected"]);

export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { mentorId, status } = body;

    if (!mentorId || !status || !VALID_STATUSES.has(status)) {
      return json({ success: false, error: "Missing or invalid mentorId/status" }, 400);
    }

    const admin = supabaseAdmin as any;

    const { data: existing, error: existingError } = await admin
      .from("mentor_profiles")
      .select("user_id")
      .eq("user_id", mentorId)
      .maybeSingle();

    if (existingError || !existing) {
      return json({ success: false, error: "Mentor not found" }, 404);
    }

    const isVerified = status === "verified";

    const { data: updated, error: updateError } = await admin
      .from("mentor_profiles")
      .update({ is_verified: isVerified, updated_at: new Date().toISOString() })
      .eq("user_id", mentorId)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return json({ success: true, data: updated, message: `Mentor marked as ${status}` });
  } catch (err: any) {
    console.error("[admin/mentors/set-verification] error:", err);
    return json({ success: false, error: err.message || "Failed to update verification status." }, 500);
  }
}
