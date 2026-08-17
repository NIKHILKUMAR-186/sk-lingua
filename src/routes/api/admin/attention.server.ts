import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/attention
// Returns operational alerts prioritized by urgency.
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;
    const alerts: any[] = [];

    // 1. Bookings awaiting mentor assignment
    const { count: awaitingCount } = await admin
      .from("session_requests")
      .select("*", { count: "exact", head: true })
      .eq("booking_status", "awaiting_mentor");

    if ((awaitingCount || 0) > 0) {
      alerts.push({
        id: "awaiting_mentor",
        label: "Bookings awaiting mentor assignment",
        count: awaitingCount,
        severity: "high",
        href: "/admin/booking-queue?section=awaiting_mentor",
      });
    }

    // 2. Mentor response pending (expired SLA)
    const now = new Date().toISOString();
    const { count: expiredCount } = await admin
      .from("mentor_session_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("response_deadline", now);

    if ((expiredCount || 0) > 0) {
      alerts.push({
        id: "expired_mentor_response",
        label: "Mentor responses expired",
        count: expiredCount,
        severity: "high",
        href: "/admin/booking-queue?section=mentor_response_pending",
      });
    }

    // 3. Sessions today needing attention
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    const { count: todayCount } = await admin
      .from("session_requests")
      .select("*", { count: "exact", head: true })
      .gte("scheduled_time", dayStart)
      .lt("scheduled_time", dayEnd)
      .in("booking_status", ["confirmed", "mentor_assigned", "pending_mentor_response"]);

    if ((todayCount || 0) > 0) {
      alerts.push({
        id: "sessions_today",
        label: "Sessions scheduled for today",
        count: todayCount,
        severity: "medium",
        href: "/admin/sessions?tab=today",
      });
    }

    // 4. Mentors with no availability
    const { data: mentorIds } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "mentor");

    const mIds = (mentorIds ?? []).map((r: any) => r.user_id);
    let noAvail = 0;
    if (mIds.length > 0) {
      const { data: slots } = await admin
        .from("availability_slots")
        .select("mentor_id, is_available")
        .in("mentor_id", mIds)
        .eq("is_available", true);

      const activeSet = new Set((slots ?? []).map((s: any) => s.mentor_id));
      noAvail = mIds.filter((id: string) => !activeSet.has(id)).length;
    }

    if (noAvail > 0) {
      alerts.push({
        id: "mentors_no_availability",
        label: "Mentors with no availability configured",
        count: noAvail,
        severity: "medium",
        href: "/admin/mentors?filter=no_availability",
      });
    }

    // 5. Students expiring soon (30 days)
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const { count: expiringCount } = await admin
      .from("student_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .lte("expires_at", soon.toISOString());

    if ((expiringCount || 0) > 0) {
      alerts.push({
        id: "students_expiring",
        label: "Student subscriptions expiring within 30 days",
        count: expiringCount,
        severity: "medium",
        href: "/admin/students?filter=expired_subscription",
      });
    }

    // 6. Pending mentor applications
    const { count: appCount } = await admin
      .from("mentor_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if ((appCount || 0) > 0) {
      alerts.push({
        id: "pending_applications",
        label: "Pending mentor applications",
        count: appCount,
        severity: "low",
        href: "/admin/mentor-applications",
      });
    }

    // Sort by severity then count
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

    return new Response(
      JSON.stringify({ success: true, alerts }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Attention error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" } },
    );
  }
}
