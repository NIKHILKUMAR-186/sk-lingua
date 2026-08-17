import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/booking/auto-match
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { bookingId, assignedBy } = body;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing bookingId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;

    const { data: booking, error: bookingError } = await admin
      .from("session_requests")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: studentProfile, error: studentError } = await admin
      .from("profiles")
      .select("target_language")
      .eq("id", booking.student_id)
      .single();

    if (studentError || !studentProfile) {
      return new Response(
        JSON.stringify({ success: false, error: "Student profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const language = studentProfile.target_language || booking.language || "english";
    const scheduledDate = new Date(booking.scheduled_time);
    const dayOfWeek = scheduledDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const sessionEnd = new Date(scheduledDate.getTime() + (booking.duration_mins || 30) * 60000);

    const { data: mentorProfiles } = await (admin as any)
      .from("mentor_profiles")
      .select("user_id, languages_taught, is_active")
      .eq("is_active", true)
      .contains("languages_taught", [language]);

    if (!mentorProfiles || mentorProfiles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No available mentors found for this language" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const mentorIds = mentorProfiles.map((m: any) => m.user_id);

    const { data: slots } = await admin
      .from("availability_slots")
      .select("*")
      .in("mentor_id", mentorIds)
      .eq("day_of_week", dayOfWeek)
      .eq("is_available", true);

    const slotsByMentor = new Map<string, any[]>();
    for (const slot of slots ?? []) {
      const list = slotsByMentor.get(slot.mentor_id) || [];
      list.push(slot);
      slotsByMentor.set(slot.mentor_id, list);
    }

    const { data: existingSessions } = await admin
      .from("sessions")
      .select("mentor_id, scheduled_time, duration_mins, status")
      .in("mentor_id", mentorIds)
      .in("status", ["confirmed", "in_progress", "pending_mentor_response"])
      .gte("scheduled_time", scheduledDate.toISOString())
      .lt("scheduled_time", sessionEnd.toISOString());

    const sessionsByMentor = new Map<string, any[]>();
    for (const session of existingSessions ?? []) {
      const list = sessionsByMentor.get(session.mentor_id) || [];
      list.push(session);
      sessionsByMentor.set(session.mentor_id, list);
    }

    let matchedMentor: any = null;
    for (const mp of mentorProfiles) {
      const mentorSlots = slotsByMentor.get(mp.user_id) || [];
      const mentorSessions = sessionsByMentor.get(mp.user_id) || [];

      const hasTimeCoverage = mentorSlots.some((slot: any) => {
        const [sh, sm] = (slot.start_time || "").split(":").map(Number);
        const [eh, em] = (slot.end_time || "").split(":").map(Number);
        if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return false;
        const slotStart = sh * 60 + sm;
        const slotEnd = eh * 60 + em;
        const reqStart = scheduledDate.getHours() * 60 + scheduledDate.getMinutes();
        const reqEnd = reqStart + (booking.duration_mins || 30);
        return reqStart >= slotStart && reqEnd <= slotEnd;
      });

      if (!hasTimeCoverage) continue;

      const hasConflict = mentorSessions.some((s: any) => {
        const existingStart = new Date(s.scheduled_time).getTime();
        const existingEnd = existingStart + (s.duration_mins || 30) * 60000;
        return scheduledDate.getTime() < existingEnd && sessionEnd.getTime() > existingStart;
      });

      if (!hasConflict) {
        matchedMentor = mp;
        break;
      }
    }

    if (!matchedMentor) {
      return new Response(
        JSON.stringify({ success: false, error: "No eligible mentor available at this time" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const responseDeadline = new Date(scheduledDate.getTime() + 15 * 60 * 1000);

    const { data: requestData, error: requestError } = await admin
      .from("mentor_session_requests")
      .insert({
        booking_id: bookingId,
        mentor_id: matchedMentor.user_id,
        student_id: booking.student_id,
        session_date: scheduledDate.toISOString().split("T")[0],
        session_time: scheduledDate.toISOString().split("T")[1].split(".")[0],
        duration_mins: booking.duration_mins,
        status: "pending",
        response_deadline: responseDeadline.toISOString(),
      })
      .select("id")
      .single();

    if (requestError) throw requestError;

    const { error: updateError } = await admin
      .from("session_requests")
      .update({
        booking_status: "mentor_assigned",
        assigned_mentor: matchedMentor.user_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    await admin.from("booking_timeline").insert({
      booking_id: bookingId,
      actor_id: assignedBy || null,
      actor_role: "system",
      action: "mentor_auto_assigned",
      description: `Auto-matched mentor ${matchedMentor.user_id}`,
      metadata: { request_id: requestData.id, mentor_id: matchedMentor.user_id },
    });

    return new Response(
      JSON.stringify({ success: true, requestId: requestData.id, mentorId: matchedMentor.user_id }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Auto-match error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" } },
    );
  }
}