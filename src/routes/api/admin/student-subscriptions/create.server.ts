import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { studentId, planId, reason } = body;

    if (!studentId || !planId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing studentId or planId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;
    const { data, error } = await admin.rpc("admin_create_subscription", {
      p_student_id: studentId,
      p_plan_id: planId,
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
      JSON.stringify({ success: true, message: "Subscription created", data }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Create subscription error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Unable to create subscription. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
