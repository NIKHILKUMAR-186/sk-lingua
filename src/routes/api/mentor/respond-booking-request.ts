import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/api/mentor/respond-booking-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { requestId, mentorId, action } = body;

          if (!requestId || !mentorId || !action) {
            return new Response("missing params", { status: 400 });
          }

          const admin = supabase as any;

          // Fetch the mentor session request with lock
          const { data: request, error: reqErr } = await admin
            .from("mentor_session_requests")
            .select("*")
            .eq("id", requestId)
            .eq("mentor_id", mentorId)
            .eq("status", "pending")
            .single();

          if (reqErr || !request) {
            return new Response(JSON.stringify({ error: "Request not found or already handled" }), {
              status: 404,
            });
          }

          if (action === "accept") {
            // Atomic accept using database function
            const { data, error } = await admin.rpc("mentor_accept_booking_atomic", {
              p_request_id: requestId,
              p_mentor_id: mentorId,
            });

            if (error) {
              return new Response(JSON.stringify({ error: error.message || "Failed to accept" }), {
                status: 409,
              });
            }

            const result = data as { success: boolean; error?: string; booking_id?: string };

            if (!result.success) {
              return new Response(JSON.stringify({ error: result.error || "Failed to accept" }), {
                status: 409,
              });
            }

            // Notify student
            await admin.from("notifications").insert({
              user_id: request.student_id,
              title: "Session confirmed",
              body: `Your session request has been accepted by a mentor.`,
              link: "/student/sessions",
              category: "session",
              kind: "session_confirmed",
              related_id: request.booking_id,
              metadata: { booking_id: request.booking_id, request_id: requestId },
            });

            return new Response(JSON.stringify({ ok: true, booking_id: result.booking_id }), {
              status: 200,
            });
          } else if (action === "decline") {
            const reason = body.reason || null;

            const { data, error } = await admin.rpc("mentor_decline_booking_atomic", {
              p_request_id: requestId,
              p_mentor_id: mentorId,
              p_reason: reason,
            });

            if (error) {
              return new Response(JSON.stringify({ error: error.message || "Failed to decline" }), {
                status: 409,
              });
            }

            const result = data as { success: boolean; error?: string };
            if (!result.success) {
              return new Response(JSON.stringify({ error: result.error || "Failed to decline" }), {
                status: 409,
              });
            }

            // Notify admin about decline
            const { data: admins } = await admin
              .from("user_roles")
              .select("user_id")
              .eq("role", "admin");

            for (const adminUser of admins ?? []) {
              await admin.from("notifications").insert({
                user_id: adminUser.user_id,
                title: "Mentor declined a booking",
                body: `A mentor declined a booking request. Auto-reassignment initiated.`,
                link: "/admin/booking-queue",
                category: "session",
                kind: "session_rejected",
                related_id: request.booking_id,
                metadata: { booking_id: request.booking_id, request_id: requestId, reason },
              });
            }

            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }

          return new Response("invalid action", { status: 400 });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || String(err) }), {
            status: 500,
          });
        }
      },
    },
  },
});
