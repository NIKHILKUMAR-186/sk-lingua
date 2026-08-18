import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/student-subscriptions/activate
// Activate a student subscription (does not touch the global plan).
// Body: { subscriptionId, reason }
export const Route = createFileRoute("/api/admin/student-subscriptions/activate")({
  server: {
    handlers: {
      POST: async ({ request }) => {

        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;

          const body = await request.json();
          const { subscriptionId, reason } = body;

          if (!subscriptionId) {
            return new Response(
              JSON.stringify({ success: false, error: "Missing subscriptionId" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const admin = supabaseAdmin as any;
          const { data, error } = await admin.rpc("admin_activate_subscription", {
            p_subscription_id: subscriptionId,
            p_reason: reason ?? "",
            p_admin_id: authResult.userId,
          });

          if (error) {
            const message = error?.message?.includes("has expired")
              ? "Subscription has expired. Extend its expiry before activating."
              : error?.message?.includes("no usable sessions")
              ? "Subscription has no usable sessions left. Add sessions before activating."
              : "Unable to update subscription. Please try again.";
            return new Response(
              JSON.stringify({ success: false, error: message, code: error.code }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ success: true, message: "Subscription activated", data }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          console.error("Activate subscription error:", err);
          return new Response(JSON.stringify({ success: false, error: "Unable to update subscription. Please try again." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

      },
    },
  },
});
