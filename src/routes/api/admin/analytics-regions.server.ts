import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

function getDateFilter(dateRange: string) {
  const now = new Date();
  let startDate: Date;

  switch (dateRange) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "last_7_days":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last_30_days":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(0);
  }

  return startDate;
}

// GET /api/admin/analytics/regions
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const url = new URL(request.url);
    const dateRange = url.searchParams.get("dateRange") || "all";

    const admin = supabaseAdmin as any;
    const startDate = getDateFilter(dateRange);

    // Get all profiles with state/country
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, state, country, created_at")
      .gte("created_at", startDate.toISOString());

    if (profilesError) throw profilesError;

    // Get all user roles
    const { data: roles, error: rolesError } = await admin
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) throw rolesError;

    // Create user role map
    const userRoles: Record<string, string> = {};
    roles?.forEach((r: any) => {
      userRoles[r.user_id] = r.role;
    });

    // Get all sessions with state info
    const { data: sessions, error: sessionsError } = await admin
      .from("sessions")
      .select("id, student_id, mentor_id, status, created_at")
      .gte("created_at", startDate.toISOString());

    if (sessionsError) throw sessionsError;

    // Get mentor profiles with languages
    const { data: mentorProfiles, error: mentorError } = await admin
      .from("mentor_profiles")
      .select("user_id, languages_taught, is_active");

    if (mentorError) throw mentorError;

    // Create mentor map
    const mentorMap: Record<string, any> = {};
    mentorProfiles?.forEach((m: any) => {
      mentorMap[m.user_id] = m;
    });

    // Aggregate by state
    const stateStats: Record<string, any> = {};

    // Count users by state
    profiles?.forEach((profile: any) => {
      const state = profile.state || profile.country || "Unknown";
      const role = userRoles[profile.id] || "unknown";

      if (!stateStats[state]) {
        stateStats[state] = {
          state,
          totalUsers: 0,
          students: 0,
          mentors: 0,
          bookings: 0,
          languages: {},
        };
      }

      stateStats[state].totalUsers++;
      if (role === "student") stateStats[state].students++;
      if (role === "mentor") stateStats[state].mentors++;
    });

    // Count bookings by state (via student)
    sessions?.forEach((session: any) => {
      const studentProfile = profiles?.find((p: any) => p.id === session.student_id);
      const state = studentProfile?.state || studentProfile?.country || "Unknown";

      if (stateStats[state]) {
        stateStats[state].bookings++;
      }
    });

    // Count languages taught by state
    Object.entries(mentorMap).forEach(([userId, mentor]: [string, any]) => {
      const mentorProfile = profiles?.find((p: any) => p.id === userId);
      const state = mentorProfile?.state || mentorProfile?.country || "Unknown";

      if (stateStats[state] && mentor.languages_taught && Array.isArray(mentor.languages_taught)) {
        mentor.languages_taught.forEach((lang: string) => {
          stateStats[state].languages[lang] = (stateStats[state].languages[lang] || 0) + 1;
        });
      }
    });

    // Convert to array and sort
    const stateStatsArray = Object.values(stateStats).sort((a: any, b: any) => 
      b.totalUsers - a.totalUsers
    );

    // Find most requested languages by state
    stateStatsArray.forEach((state: any) => {
      const sortedLangs = Object.entries(state.languages)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3);
      state.topLanguages = sortedLangs.map(([lang, count]) => ({ language: lang, count }));
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: stateStatsArray,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Region analytics error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}