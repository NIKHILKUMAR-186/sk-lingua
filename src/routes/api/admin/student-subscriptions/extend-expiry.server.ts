import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/student-subscriptions/extend-expiry
// Atomic server-side extension of a subscription's expiry date.
// Body: { subscriptionId, days, reason }
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { subscriptionId, days, reason } = body;

    const daysNum = Number(days);
    if (!subscriptionId || !Number.isFinite(daysNum) || !Number.isInteger(daysNum) || daysNum <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid subscriptionId and a positive integer number of days are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;
    const { data, error } = await admin.rpc("admin_extend_expiry", {
      p_subscription_id: subscriptionId,
      p_days: daysNum,
      p_reason: reason ?? "",
      p_admin_id: authResult.userId,
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: "Unable to update subscription. Please try again.", code: error.code }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `Expiry extended by ${daysNum} days`, data }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Extend expiry error:", err);
    return new Response(JSON.stringify({ success: false, error: "Unable to update subscription. Please try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}