import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/students/<studentId>
// Returns the full student profile (with avatar, phone, etc.) — used by the
// new /admin/students/$studentId detail page.
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    // Path: /api/admin/students/<studentId>
    const studentId = segments[segments.length - 1];

    if (!studentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing studentId" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: student, error: studentError } = await admin
      .from("profiles")
      .select(
        "id, full_name, email, reference_no, avatar_url, phone_number, native_language, state, country, bio, onboarded, created_at",
      )
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return new Response(
        JSON.stringify({ success: false, error: "Student not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: student }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Student profile GET error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// PUT /api/admin/students/<studentId>
// Persist lightweight profile edits (full_name, phone_number, native_language,
// state, country, bio).  Does NOT allow changing email or reference_no.
export async function PUT(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const studentId = segments[segments.length - 1];

    if (!studentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing studentId" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await request.json();
    // Allowlist of editable columns — prevents accidental overwrites of
    // email, reference_no, user_id, id, etc.
    const allowed: Record<string, any> = {};
    for (const key of [
      "full_name",
      "phone_number",
      "native_language",
      "state",
      "country",
      "bio",
    ]) {
      if (body[key] !== undefined) allowed[key] = body[key];
    }

    const { data, error } = await admin
      .from("profiles")
      .update(allowed)
      .eq("id", studentId)
      .select(
        "id, full_name, email, reference_no, avatar_url, phone_number, native_language, state, country, bio, onboarded, created_at",
      )
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Student profile PUT error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}