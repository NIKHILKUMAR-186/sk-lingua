import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { subscriptionId, newPlanId, reason } = body;

    if (!subscriptionId || !newPlanId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing subscriptionId or newPlanId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;
    const { data, error } = await admin.rpc("admin_replace_plan", {
      p_subscription_id: subscriptionId,
      p_new_plan_id: newPlanId,
      p_reason: reason ?? "",
      p_admin_id: authResult.userId,
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message, code: error.code }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Plan replaced", data }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Replace plan error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Unable to replace plan. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
