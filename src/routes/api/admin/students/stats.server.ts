import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

/**
 * GET /api/admin/students/stats
 *
 * Database-driven admin dashboard statistics, role-filtered:
 *   - totalStudents   : COUNT(user_roles WHERE role = 'student')
 *   - activeMentors   : COUNT(mentor_profiles WHERE is_active = true)
 *   - withActiveSubscription : students with an active + unexpired subscription
 *   - expiringSoon    : active subscriptions expiring within 30 days
 *   - totalSessionsUsed      : sum of used_session_slots for active subscriptions
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isUsableCurrent(sub: any): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (sub.expires_at && new Date(sub.expires_at).getTime() <= Date.now()) return false;
  return true;
}

export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;

    const [
      { count: studentCount },
      { count: mentorCount },
      { data: subs, error: subsErr },
    ] = await Promise.all([
      admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
      admin
        .from("mentor_profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      admin
        .from("student_subscriptions")
        .select("user_id, status, expires_at, used_session_slots"),
    ]);
    if (subsErr) throw subsErr;

    let withActiveSubscription = 0;
    let expiringSoon = 0;
    let totalSessionsUsed = 0;
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const seen = new Set<string>();

    for (const s of subs || []) {
      if (!seen.has(s.user_id) && isUsableCurrent(s)) {
        seen.add(s.user_id);
        withActiveSubscription++;
        totalSessionsUsed += Number(s.used_session_slots || 0);
        if (s.expires_at && new Date(s.expires_at) <= soon) expiringSoon++;
      }
    }

    return json({
      success: true,
      data: {
        totalStudents: studentCount || 0,
        activeStudents: withActiveSubscription,
        activeMentors: mentorCount || 0,
        withActiveSubscription,
        expiringSoon,
        totalSessionsUsed,
      },
    });
  } catch (err: any) {
    console.error("[admin/students/stats] error:", err);
    return json({ success: false, error: "Unable to load statistics. Please try again." }, 500);
  }
}