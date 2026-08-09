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

// GET /api/admin/analytics/mentors
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const url = new URL(request.url);
    const dateRange = url.searchParams.get("dateRange") || "all";

    const admin = supabaseAdmin as any;
    const startDate = getDateFilter(dateRange);

    // Get mentor applications stats
    const [
      totalMentorsResult,
      pendingVerificationResult,
      approvedResult,
      activeResult,
      suspendedResult,
    ] = await Promise.all([
      // Total mentors (from user_roles)
      admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "mentor"),
      
      // Pending verification (submitted applications)
      admin.from("mentor_applications").select("*", { count: "exact", head: true }).eq("status", "submitted"),
      
      // Approved applications
      admin.from("mentor_applications").select("*", { count: "exact", head: true }).eq("status", "approved"),
      
      // Active mentors
      admin.from("mentor_profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
      
      // Suspended/inactive mentors
      admin.from("mentor_profiles").select("*", { count: "exact", head: true }).eq("is_active", false),
    ]);

    // Get mentor profiles with ratings
    const { data: mentorProfiles, error: profilesError } = await admin
      .from("mentor_profiles")
      .select("rating_avg, total_reviews, is_active")
      .gte("created_at", startDate.toISOString());

    if (profilesError) throw profilesError;

    // Calculate average rating
    const totalRating = mentorProfiles?.reduce((sum: number, m: any) => sum + (parseFloat(m.rating_avg) || 0), 0) || 0;
    const averageRating = mentorProfiles && mentorProfiles.length > 0
      ? parseFloat((totalRating / mentorProfiles.length).toFixed(1))
      : 0;

    // Get sessions completed by mentors
    const { data: completedSessions, error: sessionsError } = await admin
      .from("sessions")
      .select("mentor_id, status")
      .eq("status", "completed")
      .gte("created_at", startDate.toISOString());

    if (sessionsError) throw sessionsError;

    // Count sessions per mentor
    const sessionsPerMentor: Record<string, number> = {};
    completedSessions?.forEach((session: any) => {
      if (session.mentor_id) {
        sessionsPerMentor[session.mentor_id] = (sessionsPerMentor[session.mentor_id] || 0) + 1;
      }
    });

    const totalSessionsCompleted = completedSessions?.length || 0;

    // Get reviews count
    const { count: totalReviews } = await admin
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalMentors: totalMentorsResult.count || 0,
          pendingVerification: pendingVerificationResult.count || 0,
          approved: approvedResult.count || 0,
          active: activeResult.count || 0,
          suspended: suspendedResult.count || 0,
          averageRating: averageRating,
          totalSessionsCompleted,
          totalReviews: totalReviews || 0,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Mentor analytics error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}