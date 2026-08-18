import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";
import { validateMeetingLink } from "@/lib/demo-bookings";

// POST /api/admin/demo/assign-mentor
// Assigns a mentor to a demo booking (independent of slot availability)
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;
    const body = await request.json();
    const { bookingId, mentorId, clientVersion } = body;

    if (!bookingId || !mentorId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: bookingId, mentorId" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Fetch booking for version check
    const { data: booking, error: bookingError } = await admin
      .from("demo_session_bookings")
      .select("id, assignment_version, assignment_status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ success: false, error: "Demo booking not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (clientVersion !== undefined && clientVersion !== booking.assignment_version) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Assignment has been modified. Please refresh.",
          code: "VERSION_MISMATCH",
          currentVersion: booking.assignment_version,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    // Use the race-safe PostgreSQL function
    const { data: result, error: fnError } = await admin.rpc("assign_demo_mentor", {
      p_booking_id: bookingId,
      p_mentor_id: mentorId,
      p_admin_id: authResult.userId,
      p_client_version: clientVersion ?? booking.assignment_version,
    });

    if (fnError) {
      console.error("assign_demo_mentor error:", fnError);
      return new Response(JSON.stringify({ success: false, error: "Database function failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fnResult = result?.[0];
    if (!fnResult?.success) {
      return new Response(
        JSON.stringify({ success: false, error: fnResult?.error || "Unable to assign mentor" }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    // Notify the assigned mentor
    try {
      await admin.from("notifications").insert({
        user_id: mentorId,
        category: "demo_assignment",
        kind: "mentor_assigned",
        title: "New Demo Assignment",
        body: "You have been assigned a demo session. You have 10 minutes to accept.",
        related_id: bookingId,
        link: "/mentor/calendar",
        metadata: {
          booking_id: bookingId,
          assignment_version: fnResult?.assignment_version,
        },
        read: false,
      });
    } catch (notifyErr) {
      console.error("Failed to notify mentor:", notifyErr);
    }

    // Notify other admins that an assignment was made
    try {
      const { data: otherAdmins } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .neq("user_id", authResult.userId!);

      for (const otherAdmin of otherAdmins ?? []) {
        await admin.from("notifications").insert({
          user_id: otherAdmin.user_id,
          category: "demo_assignment",
          kind: "mentor_assigned",
          title: "Demo Assignment Made",
          body: "A mentor has been assigned to a demo session.",
          related_id: bookingId,
          link: "/admin/demo-queue",
          metadata: { booking_id: bookingId, mentor_id: mentorId },
          read: false,
        });
      }
    } catch (notifyErr) {
      console.error("Failed to notify other admins:", notifyErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        assignment_version: fnResult?.assignment_version,
        acceptance_deadline: fnResult?.acceptance_deadline,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Assign mentor error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
