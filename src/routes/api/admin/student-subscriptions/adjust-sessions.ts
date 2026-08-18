import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/student-subscriptions/adjust-sessions
// Atomic server-side add/remove of sessions for a student subscription.
// Body: { subscriptionId, amount (signed, + add / - remove), reason, source }
export const Route = createFileRoute("/api/admin/student-subscriptions/adjust-sessions")({
  server: {
    handlers: {
      POST: async ({ request }) => {

        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;

          const body = await request.json();
          const { subscriptionId, amount, reason, source } = body;

          const delta = Number(amount);
          if (!subscriptionId || !Number.isFinite(delta) || !Number.isInteger(delta) || delta === 0) {
            return new Response(
              JSON.stringify({ success: false, error: "Valid subscriptionId and a non-zero integer amount are required" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const admin = supabaseAdmin as any;
          const { data, error } = await admin.rpc("admin_adjust_sessions", {
            p_subscription_id: subscriptionId,
            p_delta: delta,
            p_reason: reason ?? "",
            p_source: source ?? "ADMIN_ADJUSTMENT",
            p_admin_id: authResult.userId,
          });

          if (error) {
            const message = error?.message?.includes("would go below zero")
              ? "Unable to remove sessions — this would push the balance below zero."
              : "Unable to update subscription. Please try again.";
            return new Response(
              JSON.stringify({ success: false, error: message, code: error.code }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: delta > 0 ? "Sessions added" : "Sessions removed",
              data,
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          console.error("Adjust sessions error:", err);
          return new Response(JSON.stringify({ success: false, error: "Unable to update subscription. Please try again." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

      },
    },
  },
});
