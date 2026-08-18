import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/booking/claim
export const Route = createFileRoute("/api/admin/booking/claim")({
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

          // Atomic check
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

          if (booking.booking_status !== "awaiting_mentor" && booking.booking_status !== "mentor_assigned") {
            return new Response(
              JSON.stringify({ success: false, error: `Cannot claim: booking is ${booking.booking_status}` }),
              { status: 409, headers: { "Content-Type": "application/json" } }
            );
          }

          // Update booking as admin-claimed
          const { error: updateError } = await admin
            .from("session_requests")
            .update({
              booking_status: "confirmed",
              assigned_mentor: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId);

          if (updateError) throw updateError;

          // Add timeline entry
          await admin.from("booking_timeline").insert({
            booking_id: bookingId,
            actor_id: authResult.userId,
            actor_role: "admin",
            action: "admin_claimed",
            description: "Admin claimed this session",
            metadata: {},
          });

          return new Response(
            JSON.stringify({ success: true, message: "Session claimed by admin" }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          console.error("Claim session error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" } },
          );
        }

      },
    },
  },
});
