import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

/**
 * GET /api/admin/subscription-plans
 * Active subscription plans for the admin plan-picker (activate / change plan).
 */
export const Route = createFileRoute("/api/admin/subscription-plans")({
  server: {
    handlers: {
      GET: async ({ request }) => {

        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;

          const admin = supabaseAdmin as any;
          const { data, error } = await admin
            .from("subscription_plans")
            .select("id, name, price, currency, num_sessions, billing_cycle, validity_days")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

          if (error) throw error;

          return new Response(
            JSON.stringify({ success: true, data: data || [] }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (err: any) {
          console.error("[admin/subscription-plans] error:", err);
          return new Response(
            JSON.stringify({ success: false, error: "Unable to load subscription plans. Please try again." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

      },
    },
  },
});
