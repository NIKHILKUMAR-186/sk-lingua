import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/booking/reschedule
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { bookingId, scheduledTime, durationMins, reason } = body;

    if (!bookingId || !scheduledTime || !durationMins) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: bookingId, scheduledTime, durationMins" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;
    const newStart = new Date(scheduledTime);
    const newEnd = new Date(newStart.getTime() + durationMins * 60000);

    // 1. Load current booking
    const { data: booking, error: bookingError } = await admin
      .from("session_requests")
      .select("id, student_id, assigned_mentor, booking_status, scheduled_time, duration_mins, language")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const terminalStates = ["completed", "cancelled", "no_show"];
    if (terminalStates.includes(booking.booking_status)) {
      return new Response(
        JSON.stringify({ success: false, error: `Cannot reschedule: booking is already ${booking.booking_status}` }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    const mentorId = booking.assigned_mentor;
    if (!mentorId) {
      return new Response(
        JSON.stringify({ success: false, error: "Cannot reschedule: no mentor assigned" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Check mentor availability at new time
    const dayOfWeek = newStart.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const { data: slots } = await admin
      .from("availability_slots")
      .select("*")
      .eq("mentor_id", mentorId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_available", true);

    const hasTimeCoverage = (slots ?? []).some((slot: any) => {
      const [sh, sm] = (slot.start_time || "").split(":").map(Number);
      const [eh, em] = (slot.end_time || "").split(":").map(Number);
      if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return false;
      const slotStart = sh * 60 + sm;
      const slotEnd = eh * 60 + em;
      const reqStart = newStart.getHours() * 60 + newStart.getMinutes();
      const reqEnd = reqStart + durationMins;
      return reqStart >= slotStart && reqEnd <= slotEnd;
    });

    if (!hasTimeCoverage) {
      return new Response(
        JSON.stringify({ success: false, error: "Mentor is not available at the requested time" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Check for session conflicts (confirmed/in_progress/pending_mentor_response)
    const { data: conflicts } = await admin
      .from("sessions")
      .select("id, scheduled_time, duration_mins, status")
      .eq("mentor_id", mentorId)
      .in("status", ["confirmed", "in_progress", "pending_mentor_response"])
      .lt("scheduled_time", newEnd.toISOString())
      .gt("scheduled_time", newStart.toISOString());

    const hasConflict = (conflicts ?? []).some((s: any) => {
      const existingStart = new Date(s.scheduled_time).getTime();
      const existingEnd = existingStart + (s.duration_mins || 30) * 60000;
      return newStart.getTime() < existingEnd && newEnd.getTime() > existingStart;
    });

    if (hasConflict) {
      return new Response(
        JSON.stringify({ success: false, error: "Mentor has a conflicting session at the new time" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Check for hold conflicts
    const { data: holds } = await admin
      .from("booking_holds")
      .select("id, scheduled_time, duration_mins, status")
      .eq("mentor_id", mentorId)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .lt("scheduled_time", newEnd.toISOString())
      .gt("scheduled_time", newStart.toISOString());

    const hasHoldConflict = (holds ?? []).some((h: any) => {
      const holdStart = new Date(h.scheduled_time).getTime();
      const holdEnd = holdStart + (h.duration_mins || 30) * 60000;
      return newStart.getTime() < holdEnd && newEnd.getTime() > holdStart;
    });

    if (hasHoldConflict) {
      return new Response(
        JSON.stringify({ success: false, error: "Mentor has an active booking hold at the new time" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    const oldTime = booking.scheduled_time;

    // 5. Update booking
    const { error: updateError } = await admin
      .from("session_requests")
      .update({
        scheduled_time: newStart.toISOString(),
        duration_mins: durationMins,
        booking_status: "rescheduled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    // 6. Update related session if exists
    if (booking.session_id) {
      await admin
        .from("sessions")
        .update({
          scheduled_time: newStart.toISOString(),
          duration_mins: durationMins,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.session_id);
    }

    // 7. Timeline entry
    await admin.from("booking_timeline").insert({
      booking_id: bookingId,
      actor_id: authResult.userId,
      actor_role: "admin",
      action: "booking_rescheduled",
      description: reason
        ? `Session rescheduled from ${oldTime} to ${newStart.toISOString()}: ${reason}`
        : `Session rescheduled from ${oldTime} to ${newStart.toISOString()}`,
      metadata: {
        old_time: oldTime,
        new_time: newStart.toISOString(),
        duration_mins: durationMins,
        reason: reason || null,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Booking rescheduled successfully",
        oldTime,
        newTime: newStart.toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Reschedule booking error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" } },
    );
  }
}
