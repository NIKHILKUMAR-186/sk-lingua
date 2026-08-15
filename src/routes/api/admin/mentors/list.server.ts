import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/mentors
// Lists all mentors with their profile information.
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();

    const { data: mentors, error } = await admin
      .from("mentor_profiles")
      .select(
        "user_id, headline, bio, hourly_rate, rating_avg, total_reviews, total_students, total_sessions, years_experience, is_verified, demo_lesson_url, teaching_style, cover_url, availability_preview, is_active, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch user details for each mentor
    const userIds = (mentors ?? []).map((m: any) => m.user_id);
    let usersMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: users } = await admin
        .from("profiles")
        .select("id, full_name, email, avatar_url, phone_number, state, country")
        .in("id", userIds);
      (users ?? []).forEach((u: any) => usersMap.set(u.id, u));
    }

    // Fetch roles
    let rolesMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      (roles ?? []).forEach((r: any) => rolesMap.set(r.user_id, r.role));
    }

    const data = (mentors ?? []).map((m: any) => {
      const user = usersMap.get(m.user_id);
      const role = rolesMap.get(m.user_id);
      return {
        ...m,
        user: user ? { full_name: user.full_name, email: user.email, avatar_url: user.avatar_url } : null,
        role: role || "mentor",
      };
    });

    // Filter by query if provided
    const filtered = q
      ? data.filter((m: any) => {
          const name = m.user?.full_name?.toLowerCase() ?? "";
          const email = m.user?.email?.toLowerCase() ?? "";
          return name.includes(q.toLowerCase()) || email.includes(q.toLowerCase());
        })
      : data;

    return new Response(JSON.stringify({ success: true, data: filtered }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Mentor list error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
