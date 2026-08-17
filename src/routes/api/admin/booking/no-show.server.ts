import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/booking/no-show
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { bookingId, actor, notes } = body;

    if (!bookingId || !actor) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: bookingId, actor" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!["student", "mentor"].includes(actor)) {
      return new Response(
        JSON.stringify({ success: false, error: "actor must be 'student' or 'mentor'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;

    // 1. Load booking
    const { data: booking, error: bookingError } = await admin
      .from("session_requests")
      .select("id, student_id, assigned_mentor, booking_status, scheduled_time, session_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const allowedStates = ["confirmed", "in_progress", "pending_mentor_response", "mentor_assigned"];
    if (!allowedStates.includes(booking.booking_status)) {
      return new Response(
        JSON.stringify({ success: false, error: `Cannot mark no-show: booking is ${booking.booking_status}` }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Update booking
    const { error: updateError } = await admin
      .from("session_requests")
      .update({
        booking_status: "no_show",
        status: "no_show",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    // 3. Update session if linked
    if (booking.session_id) {
      await admin
        .from("sessions")
        .update({
          status: "no_show",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.session_id);
    }

    // 4. Timeline entry
    const action = actor === "student" ? "student_no_show" : "mentor_no_show";
    await admin.from("booking_timeline").insert({
      booking_id: bookingId,
      actor_id: authResult.userId,
      actor_role: "admin",
      action,
      description: notes
        ? `Marked as no-show (${actor}): ${notes}`
        : `Marked as no-show (${actor})`,
      metadata: { no_show_actor: actor, notes: notes || null },
    });

    // 5. Notify affected parties
    if (booking.student_id && actor === "mentor") {
      await admin.from("notifications").insert({
        user_id: booking.student_id,
        title: "Mentor No-Show",
        body: "Your mentor did not attend the scheduled session. We will follow up shortly.",
        category: "session",
        kind: "no_show",
        related_id: bookingId,
        metadata: { actor: "mentor" },
      });
    }

    if (booking.assigned_mentor && actor === "student") {
      await admin.from("notifications").insert({
        user_id: booking.assigned_mentor,
        title: "Student No-Show",
        body: "The student did not attend the scheduled session.",
        category: "session",
        kind: "no_show",
        related_id: bookingId,
        metadata: { actor: "student" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "No-show recorded", actor }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("No-show error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" } },
    );
  }
}
