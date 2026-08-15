import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/demo/take-session
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required field: bookingId" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const admin = supabaseAdmin as any;
    const adminId = authResult.userId;

    // Fetch booking
    const { data: booking, error: bookingError } = await admin
      .from("demo_session_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: "Demo booking not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // Only allow self-assignment from unassigned or rejected states
    if (!["unassigned", "needs_reassignment"].includes(booking.assignment_status || "")) {
      return new Response(
        JSON.stringify({ success: false, error: "This demo is already assigned." }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    // Atomic update: only succeed if currently unassigned
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from("demo_session_bookings")
      .update({
        admin_id: adminId,
        assignment_status: "confirmed",
        confirmed_at: now,
        booking_status: "confirmed",
        updated_at: now,
      })
      .eq("id", bookingId)
      .eq("assignment_status", booking.assignment_status || "unassigned")
      .select("*")
      .single();

    if (updateError || !updated) {
      return new Response(
        JSON.stringify({ success: false, error: "Unable to take session. The demo may have been assigned by another admin." }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    // Record assignment history
    await admin.from("demo_assignment_history").insert({
      booking_id: bookingId,
      mentor_id: null,
      action: "admin_took",
      performed_by: adminId,
      created_at: now,
    });

    // Notify student
    try {
      await admin.from("notifications").insert({
        user_id: booking.user_id,
        category: "demo_confirmation",
        kind: "demo_confirmation",
        title: "Demo Session Confirmed",
        body: `Your demo session has been confirmed and will be conducted by our team. You will receive the meeting link shortly.`,
        related_id: bookingId,
        metadata: { booking_id: bookingId, type: "demo_confirmed_admin" },
        read: false,
      });
    } catch (notifyErr) {
      console.error("Failed to notify student (admin took demo)", notifyErr);
    }

    return new Response(
      JSON.stringify({ success: true, data: updated }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Admin take demo session error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Unable to take session. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
