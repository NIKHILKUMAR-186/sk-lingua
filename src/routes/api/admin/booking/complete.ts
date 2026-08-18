import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/booking/complete
export const Route = createFileRoute("/api/admin/booking/complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {

        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;

          const body = await request.json();
          const { bookingId } = body;

          if (!bookingId) {
            return new Response(
              JSON.stringify({ success: false, error: "Missing bookingId" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const admin = supabaseAdmin as any;

          const { data: booking, error: bookingError } = await admin
            .from("session_requests")
            .select("id, booking_status")
            .eq("id", bookingId)
            .single();

          if (bookingError || !booking) {
            return new Response(
              JSON.stringify({ success: false, error: "Booking not found" }),
              { status: 404, headers: { "Content-Type": "application/json" } }
            );
          }

          if (booking.booking_status !== "confirmed" && booking.booking_status !== "in_progress") {
            return new Response(
              JSON.stringify({ success: false, error: `Cannot complete: booking is ${booking.booking_status}` }),
              { status: 409, headers: { "Content-Type": "application/json" } }
            );
          }

          const { error: updateError } = await admin
            .from("session_requests")
            .update({
              booking_status: "completed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId);

          if (updateError) throw updateError;

          await admin.from("booking_timeline").insert({
            booking_id: bookingId,
            actor_id: authResult.userId,
            actor_role: "admin",
            action: "booking_completed",
            description: "Booking marked as completed",
            metadata: {},
          });

          return new Response(
            JSON.stringify({ success: true, message: "Booking completed" }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          console.error("Complete booking error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" } },
          );
        }

      },
    },
  },
});
