import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/booking/cancel
export const Route = createFileRoute("/api/admin/booking/cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {

        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;

          const body = await request.json();
          const { bookingId, reason } = body;

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

          if (["completed", "cancelled", "no_show"].includes(booking.booking_status)) {
            return new Response(
              JSON.stringify({ success: false, error: `Cannot cancel: booking is already ${booking.booking_status}` }),
              { status: 409, headers: { "Content-Type": "application/json" } }
            );
          }

          const { error: updateError } = await admin
            .from("session_requests")
            .update({
              booking_status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId);

          if (updateError) throw updateError;

          await admin.from("booking_timeline").insert({
            booking_id: bookingId,
            actor_id: authResult.userId,
            actor_role: "admin",
            action: "booking_cancelled",
            description: reason ? `Booking cancelled: ${reason}` : "Booking cancelled",
            metadata: { reason: reason || null },
          });

          return new Response(
            JSON.stringify({ success: true, message: "Booking cancelled" }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          console.error("Cancel booking error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" } },
          );
        }

      },
    },
  },
});
