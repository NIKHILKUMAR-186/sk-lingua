import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/demo/expire-assignments
// Expired assignments: mentor did not respond within acceptance_deadline
// This runs periodically (or manually via admin Escalate button)
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;

    // Use the race-safe PostgreSQL function
    const { data: result, error: fnError } = await admin.rpc("expire_demo_assignments", {
      p_admin_id: authResult.userId,
    });

    if (fnError) {
      console.error("expire_demo_assignments error:", fnError);
      return new Response(JSON.stringify({ success: false, error: "Database function failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fnResult = result?.[0];
    const expiredCount = fnResult?.expired_count ?? 0;

    if (expiredCount > 0) {
      // Fetch expired assignments for notification
      const { data: expired } = await admin
        .from("demo_session_bookings")
        .select("id, mentor_id, user_id, student:profiles!user_id(full_name)")
        .eq("assignment_status", "expired")
        .order("assignment_expired_at", { ascending: false })
        .limit(expiredCount);

      for (const assignment of expired ?? []) {
        // Notify the expired mentor
        if (assignment.mentor_id) {
          await admin.from("notifications").insert({
            user_id: assignment.mentor_id,
            category: "demo_timeout",
            kind: "assignment_expired",
            title: "Demo Assignment Expired",
            body: "Your demo assignment has expired due to inactivity.",
            related_id: assignment.id,
            link: "/mentor/calendar",
            metadata: { booking_id: assignment.id, type: "timeout" },
            read: false,
          });
        }

        // Notify admins
        const { data: allAdmins } = await admin
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        for (const a of allAdmins ?? []) {
          await admin.from("notifications").insert({
            user_id: a.user_id,
            category: "demo_timeout",
            kind: "assignment_expired",
            title: "Demo Assignment Expired",
            body: `Assignment for ${assignment.student?.full_name || "student"} has expired.`,
            related_id: assignment.id,
            link: "/admin/demo-queue",
            metadata: { booking_id: assignment.id, mentor_id: assignment.mentor_id },
            read: false,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: expiredCount,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Expire assignments error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
