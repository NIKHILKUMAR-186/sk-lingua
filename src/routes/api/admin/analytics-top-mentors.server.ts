import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/analytics/top-mentors
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const metric = url.searchParams.get("metric") || "sessions_completed";

    const admin = supabaseAdmin as any;

    // Get all mentor profiles
    const { data: mentorProfiles, error: profilesError } = await admin
      .from("mentor_profiles")
      .select("user_id, headline, rating_avg, total_reviews, is_active, languages_taught")
      .eq("is_active", true);

    if (profilesError) throw profilesError;

    if (!mentorProfiles || mentorProfiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: [] }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Get sessions completed per mentor
    const { data: completedSessions, error: sessionsError } = await admin
      .from("sessions")
      .select("mentor_id, status")
      .eq("status", "completed");

    if (sessionsError) throw sessionsError;

    const sessionsPerMentor: Record<string, number> = {};
    completedSessions?.forEach((session: any) => {
      if (session.mentor_id) {
        sessionsPerMentor[session.mentor_id] = (sessionsPerMentor[session.mentor_id] || 0) + 1;
      }
    });

    // Get ratings per mentor
    const { data: reviews, error: reviewsError } = await admin
      .from("reviews")
      .select("mentor_id, rating");

    if (reviewsError) throw reviewsError;

    const ratingPerMentor: Record<string, { sum: number; count: number }> = {};
    reviews?.forEach((review: any) => {
      if (!ratingPerMentor[review.mentor_id]) {
        ratingPerMentor[review.mentor_id] = { sum: 0, count: 0 };
      }
      ratingPerMentor[review.mentor_id].sum += review.rating || 0;
      ratingPerMentor[review.mentor_id].count++;
    });

    // Get revenue per mentor (from payment_orders linked to sessions)
    const { data: sessionsWithPayments, error: paymentError } = await admin
      .from("sessions")
      .select("mentor_id, payment_order_id")
      .not("payment_order_id", "is", null);

    if (paymentError) throw paymentError;

    // Get payment amounts
    const { data: payments, error: paymentsError } = await admin
      .from("payment_orders")
      .select("id, final_amount, payment_status")
      .eq("payment_status", "completed");

    if (paymentsError) throw paymentsError;

    const paymentMap: Record<string, number> = {};
    payments?.forEach((p: any) => {
      paymentMap[p.id] = parseFloat(p.final_amount) || 0;
    });

    const revenuePerMentor: Record<string, number> = {};
    sessionsWithPayments?.forEach((session: any) => {
      if (session.mentor_id && session.payment_order_id) {
        revenuePerMentor[session.mentor_id] = (revenuePerMentor[session.mentor_id] || 0) + (paymentMap[session.payment_order_id] || 0);
      }
    });

    // Get acceptance rate per mentor
    const { data: allSessions, error: allSessionsError } = await admin
      .from("sessions")
      .select("mentor_id, status, assignment_history");

    if (allSessionsError) throw allSessionsError;

    const acceptancePerMentor: Record<string, { assigned: number; accepted: number }> = {};
    allSessions?.forEach((session: any) => {
      if (!session.mentor_id) return;
      
      if (!acceptancePerMentor[session.mentor_id]) {
        acceptancePerMentor[session.mentor_id] = { assigned: 0, accepted: 0 };
      }

      if (session.assignment_history && Array.isArray(session.assignment_history)) {
        const hasAssignment = session.assignment_history.some((e: any) => e.action === 'assigned' && e.mentor_id === session.mentor_id);
        const hasAcceptance = session.assignment_history.some((e: any) => e.action === 'accepted' && e.mentor_id === session.mentor_id);
        
        if (hasAssignment) {
          acceptancePerMentor[session.mentor_id].assigned++;
          if (hasAcceptance) {
            acceptancePerMentor[session.mentor_id].accepted++;
          }
        }
      }
    });

    // Build ranking
    let rankedMentors = mentorProfiles.map((mentor: any) => {
      const sessionsCompleted = sessionsPerMentor[mentor.user_id] || 0;
      const reviewsCount = ratingPerMentor[mentor.user_id]?.count || 0;
      const avgRating = reviewsCount > 0 
        ? parseFloat((ratingPerMentor[mentor.user_id].sum / reviewsCount).toFixed(1))
        : 0;
      const revenue = revenuePerMentor[mentor.user_id] || 0;
      const acceptanceData = acceptancePerMentor[mentor.user_id] || { assigned: 0, accepted: 0 };
      const acceptanceRate = acceptanceData.assigned > 0
        ? parseFloat(((acceptanceData.accepted / acceptanceData.assigned) * 100).toFixed(1))
        : 0;

      return {
        userId: mentor.user_id,
        headline: mentor.headline,
        ratingAvg: avgRating,
        totalReviews: reviewsCount,
        sessionsCompleted,
        revenue,
        acceptanceRate: acceptanceRate,
      };
    });

    // Sort by metric
    switch (metric) {
      case "rating":
        rankedMentors.sort((a, b) => b.ratingAvg - a.ratingAvg);
        break;
      case "reviews":
        rankedMentors.sort((a, b) => b.totalReviews - a.totalReviews);
        break;
      case "revenue":
        rankedMentors.sort((a, b) => b.revenue - a.revenue);
        break;
      case "acceptance_rate":
        rankedMentors.sort((a, b) => b.acceptanceRate - a.acceptanceRate);
        break;
      case "sessions_completed":
      default:
        rankedMentors.sort((a, b) => b.sessionsCompleted - a.sessionsCompleted);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: rankedMentors.slice(0, limit),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Top mentors analytics error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}