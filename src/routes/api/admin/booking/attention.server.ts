import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/booking/attention
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;
    const now = new Date().toISOString();

    // Count bookings by status
    const [
      awaitingMentorRes,
      mentorAssignedRes,
      confirmedRes,
      completedRes,
      cancelledRes,
      noShowRes,
      expiredRes,
    ] = await Promise.all([
      admin.from("session_requests").select("id", { count: "exact", head: true }).eq("booking_status", "awaiting_mentor"),
      admin.from("session_requests").select("id", { count: "exact", head: true }).eq("booking_status", "mentor_assigned"),
      admin.from("session_requests").select("id", { count: "exact", head: true }).eq("booking_status", "confirmed"),
      admin.from("session_requests").select("id", { count: "exact", head: true }).eq("booking_status", "completed"),
      admin.from("session_requests").select("id", { count: "exact", head: true }).eq("booking_status", "cancelled"),
      admin.from("session_requests").select("id", { count: "exact", head: true }).eq("booking_status", "no_show"),
      admin.from("mentor_session_requests").select("id", { count: "exact", head: true }).eq("status", "pending").lt("response_deadline", now),
    ]);

    // Get pending mentor requests expiring soon (within 5 minutes)
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { data: expiringRequests } = await admin
      .from("mentor_session_requests")
      .select("id, booking_id, response_deadline")
      .eq("status", "pending")
      .lt("response_deadline", fiveMinutesFromNow);

    // Get bookings with no eligible mentor
    const { data: noMentorBookings } = await admin
      .from("session_requests")
      .select("id, topic, language")
      .eq("booking_status", "awaiting_mentor")
      .order("created_at", { ascending: true })
      .limit(10);

    // Get attention items
    const attentionItems: any[] = [];

    if ((awaitingMentorRes.count || 0) > 0) {
      attentionItems.push({
        level: "critical",
        label: `${awaitingMentorRes.count} booking${awaitingMentorRes.count !== 1 ? "s" : ""} waiting for mentor`,
        action: "Assign a mentor to free up bookings.",
      });
    }

    if ((expiredRes.count || 0) > 0) {
      attentionItems.push({
        level: "warning",
        label: `${expiredRes.count} mentor request${expiredRes.count !== 1 ? "s" : ""} expiring soon`,
        action: "Review and reassign if needed.",
      });
    }

    if ((mentorAssignedRes.count || 0) > 0) {
      attentionItems.push({
        level: "info",
        label: `${mentorAssignedRes.count} booking${mentorAssignedRes.count !== 1 ? "s" : ""} awaiting mentor response`,
        action: "Mentors have 15 minutes to respond.",
      });
    }

    if ((noMentorBookings?.length || 0) > 0) {
      attentionItems.push({
        level: "warning",
        label: `${noMentorBookings.length} booking${noMentorBookings.length !== 1 ? "s" : ""} with no eligible mentor`,
        action: "Consider expanding mentor pool or adjusting requirements.",
      });
    }

    // Upcoming confirmed sessions (next 2 hours)
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { data: upcomingConfirmed } = await admin
      .from("session_requests")
      .select("id, topic, scheduled_time")
      .eq("booking_status", "confirmed")
      .gte("scheduled_time", now)
      .lte("scheduled_time", twoHoursFromNow)
      .order("scheduled_time", { ascending: true });

    return new Response(
      JSON.stringify({
        success: true,
        counts: {
          awaitingMentor: awaitingMentorRes.count || 0,
          mentorAssigned: mentorAssignedRes.count || 0,
          confirmed: confirmedRes.count || 0,
          completed: completedRes.count || 0,
          cancelled: cancelledRes.count || 0,
          noShow: noShowRes.count || 0,
          expiringRequests: expiredRes.count || 0,
        },
        attentionItems,
        expiringRequests: expiringRequests || [],
        upcomingConfirmed: upcomingConfirmed || [],
        noMentorBookings: noMentorBookings || [],
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Attention center error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" } },
    );
  }
}