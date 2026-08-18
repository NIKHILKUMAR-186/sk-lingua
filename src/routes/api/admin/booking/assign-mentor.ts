import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/booking/assign-mentor
export const Route = createFileRoute("/api/admin/booking/assign-mentor")({
  server: {
    handlers: {
      POST: async ({ request }) => {

        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;

          const body = await request.json();
          const { bookingId, mentorId, scheduledTime, durationMins, language, studentId } = body;

          if (!bookingId || !mentorId || !scheduledTime || !durationMins || !language || !studentId) {
            return new Response(
              JSON.stringify({ success: false, error: "Missing required fields" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const admin = supabaseAdmin as any;

          // Atomic check: verify booking is still assignable
          const { data: booking, error: bookingError } = await admin
            .from("session_requests")
            .select("id, booking_status, assigned_mentor")
            .eq("id", bookingId)
            .single();

          if (bookingError || !booking) {
            return new Response(
              JSON.stringify({ success: false, error: "Booking not found" }),
              { status: 404, headers: { "Content-Type": "application/json" } }
            );
          }

          if (booking.booking_status !== "awaiting_mentor") {
            return new Response(
              JSON.stringify({ success: false, error: `Cannot assign mentor: booking is ${booking.booking_status}` }),
              { status: 409, headers: { "Content-Type": "application/json" } }
            );
          }

          // Verify mentor is eligible
          const { data: mentor, error: mentorError } = await admin
            .from("mentor_profiles")
            .select("user_id, is_active, languages_taught")
            .eq("user_id", mentorId)
            .eq("is_active", true)
            .single();

          if (mentorError || !mentor) {
            return new Response(
              JSON.stringify({ success: false, error: "Mentor not found or not active" }),
              { status: 404, headers: { "Content-Type": "application/json" } }
            );
          }

          if (!mentor.languages_taught?.includes(language)) {
            return new Response(
              JSON.stringify({ success: false, error: "Mentor does not teach requested language" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const scheduledDate = new Date(scheduledTime);
          const responseDeadline = new Date(scheduledDate.getTime() + 15 * 60 * 1000);

          // Create mentor session request
          const { data: requestData, error: requestError } = await admin
            .from("mentor_session_requests")
            .insert({
              booking_id: bookingId,
              mentor_id: mentorId,
              student_id: studentId,
              session_date: scheduledDate.toISOString().split("T")[0],
              session_time: scheduledDate.toISOString().split("T")[1].split(".")[0],
              duration_mins: durationMins,
              status: "pending",
              response_deadline: responseDeadline.toISOString(),
            })
            .select("id")
            .single();

          if (requestError) throw requestError;

          // Update booking
          const { error: updateError } = await admin
            .from("session_requests")
            .update({
              booking_status: "mentor_assigned",
              assigned_mentor: mentorId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId);

          if (updateError) throw updateError;

          // Add timeline entry
          await admin.from("booking_timeline").insert({
            booking_id: bookingId,
            actor_id: authResult.userId,
            actor_role: "admin",
            action: "mentor_assigned",
            description: `Admin assigned mentor to booking`,
            metadata: { mentor_id: mentorId, request_id: requestData.id },
          });

          return new Response(
            JSON.stringify({ success: true, requestId: requestData.id, message: "Mentor assigned. 15-minute response window started." }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          console.error("Assign mentor error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" } },
          );
        }

      },
    },
  },
});
