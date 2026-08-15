import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/mentors/<mentorId>
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const mentorId = segments[segments.length - 1];

    if (!mentorId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing mentorId" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: mentor, error: mentorError } = await admin
      .from("mentor_profiles")
      .select("*")
      .eq("user_id", mentorId)
      .single();

    if (mentorError || !mentor) {
      return new Response(
        JSON.stringify({ success: false, error: "Mentor not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: user } = await admin
      .from("profiles")
      .select("id, full_name, email, avatar_url, phone_number, state, country, bio, created_at")
      .eq("id", mentorId)
      .single();

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", mentorId);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...mentor,
          user: user || null,
          roles: (roles ?? []).map((r: any) => r.role),
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Mentor detail error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// PUT /api/admin/mentors/<mentorId>
export async function PUT(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const mentorId = segments[segments.length - 1];

    if (!mentorId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing mentorId" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await request.json();
    const allowed: Record<string, any> = {};
    for (const key of ["is_active", "is_verified", "headline", "bio", "years_experience", "teaching_style", "availability_preview"]) {
      if (body[key] !== undefined) allowed[key] = body[key];
    }

    const { data, error } = await admin
      .from("mentor_profiles")
      .update(allowed)
      .eq("user_id", mentorId)
      .select("*")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Mentor update error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
