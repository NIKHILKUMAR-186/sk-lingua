import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { supabase } from "@/integrations/supabase/client";

// POST /api/payments/create
// Secure payment order creation.
// The client sends a planId (or related_id). The backend fetches the
// canonical price from the database and creates the payment order.
// The client MUST NOT be able to manipulate the final amount.
export const Route = createFileRoute("/api/payments/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {

        try {
          const body = await request.json();
          const { order_type, related_id, customer_email, customer_phone, billing_address } = body;

          if (!order_type || !related_id) {
            return new Response(
              JSON.stringify({ success: false, error: "Missing required fields: order_type, related_id" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const admin = supabaseAdmin as any;

          // Fetch the authenticated user from the request
          const authHeader = request.headers.get("Authorization");
          if (!authHeader) {
            return new Response(
              JSON.stringify({ success: false, error: "Unauthorized" }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }

          const token = authHeader.replace("Bearer ", "");
          const { data: { user }, error: authError } = await admin.auth.getUser(token);
          if (authError || !user) {
            return new Response(
              JSON.stringify({ success: false, error: "Unauthorized" }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }

          let amount = 0;
          let currency = "INR";

          // Fetch canonical price from database based on order_type
          if (order_type === "subscription" || order_type === "renewal") {
            const { data: plan, error: planError } = await admin
              .from("subscription_plans")
              .select("price, currency, name, num_sessions, billing_cycle")
              .eq("id", related_id)
              .eq("is_active", true)
              .single();

            if (planError || !plan) {
              return new Response(
                JSON.stringify({ success: false, error: "Plan not found or not active" }),
                { status: 404, headers: { "Content-Type": "application/json" } },
              );
            }

            amount = Number(plan.price);
            currency = plan.currency || "INR";
          } else if (order_type === "demo_session") {
            const { data: booking, error: bookingError } = await admin
              .from("demo_session_bookings")
              .select("price")
              .eq("id", related_id)
              .single();

            if (bookingError || !booking) {
              return new Response(
                JSON.stringify({ success: false, error: "Demo booking not found" }),
                { status: 404, headers: { "Content-Type": "application/json" } },
              );
            }

            amount = Number(booking.price);
            currency = "INR";
          } else {
            return new Response(
              JSON.stringify({ success: false, error: `Unsupported order type: ${order_type}` }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // GST is already included in the displayed plan price.
          // The amount from the database IS the final customer payable amount.
          const taxAmount = 0;
          const finalAmount = Math.round(amount * 100) / 100;

          const { data: order, error } = await admin
            .from("payment_orders")
            .insert({
              user_id: user.id,
              order_type,
              related_id,
              amount: finalAmount,
              tax_amount: taxAmount,
              discount_amount: 0,
              final_amount: finalAmount,
              currency,
              payment_status: "pending",
              customer_email: customer_email || null,
              customer_phone: customer_phone || null,
              billing_address: billing_address || null,
            })
            .select("*")
            .single();

          if (error) throw error;

          return new Response(JSON.stringify({ success: true, data: order }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("Create payment order error:", err);
          return new Response(
            JSON.stringify({ success: false, error: "Unable to create payment order. Please try again." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

      },
    },
  },
});
