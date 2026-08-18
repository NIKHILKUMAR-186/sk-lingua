import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/demo/take-session
// Admin takes the session themselves (becomes the conductor)
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;
    const body = await request.json();
    const { bookingId, clientVersion } = body;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required field: bookingId" }),
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
    const { data: result, error: fnError } = await admin.rpc("admin_take_demo_session", {
      p_booking_id: bookingId,
      p_admin_id: authResult.userId,
      p_client_version: clientVersion ?? booking.assignment_version,
    });

    if (fnError) {
      console.error("admin_take_demo_session error:", fnError);
      return new Response(JSON.stringify({ success: false, error: "Database function failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fnResult = result?.[0];
    if (!fnResult?.success) {
      const statusCode = fnResult?.error?.includes("Authorized") ? 403 : 409;
      return new Response(
        JSON.stringify({ success: false, error: fnResult?.error || "Unable to take session" }),
        { status: statusCode, headers: { "Content-Type": "application/json" } },
      );
    }

    // Notify student: admin is conducting the demo
    try {
      const { data: bookingInfo } = await admin
        .from("demo_session_bookings")
        .select("user_id, student:profiles!user_id(full_name)")
        .eq("id", bookingId)
        .single();

      if (bookingInfo?.user_id) {
        await admin.from("notifications").insert({
          user_id: bookingInfo.user_id,
          category: "demo_confirmed",
          kind: "admin_conducting",
          title: "Demo Session Confirmed",
          body: "Your demo session is being conducted by an admin. A meeting link will be provided shortly.",
          related_id: bookingId,
          link: "/student/sessions",
          metadata: { booking_id: bookingId, admin_id: authResult.userId },
          read: false,
        });
      }
    } catch (notifyErr) {
      console.error("Failed to notify student:", notifyErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking_status: fnResult?.booking_status,
        assignment_status: fnResult?.assignment_status,
        assignment_version: fnResult?.assignment_version,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Take session error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
