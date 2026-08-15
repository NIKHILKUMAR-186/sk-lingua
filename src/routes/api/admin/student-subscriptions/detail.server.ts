import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/student-subscriptions/detail?studentId=<id>&subscriptionId=<id>
// Returns the selected student, their current subscription, the immutable
// session ledger (subscription_slot_adjustments), and full subscription history.
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId");
    const subscriptionId = url.searchParams.get("subscriptionId");

    if (!studentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing studentId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

        // Student profile — fetch full profile so the detail view can display
    // avatar, phone, language, state, country, bio, etc.
    const { data: student, error: studentError } = await admin
      .from("profiles")
      .select(
        "id, full_name, email, reference_no, avatar_url, country, bio, onboarded, created_at"
      )
      .eq("id", studentId)
      .single();
    if (studentError || !student) {
      return new Response(
        JSON.stringify({ success: false, error: "Student not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // All subscriptions (history) for this student, newest first
    const { data: history, error: historyError } = await admin
      .from("student_subscriptions")
      .select("*, plan:subscription_plans(name, price, currency, num_sessions)")
      .eq("user_id", studentId)
      .order("created_at", { ascending: false });
    if (historyError) throw historyError;

    // The selected (current) subscription is `subscriptionId` if provided,
    // otherwise fall back to the latest row.
    const selected =
      (history || []).find((s: any) => s.id === subscriptionId) ||
      (history || [])[0] ||
      null;

    // Immutable audit ledger for the selected subscription
    let adjustments: any[] = [];
    if (selected) {
      const { data: adj, error: adjError } = await admin
        .from("subscription_slot_adjustments")
        .select("*")
        .eq("subscription_id", selected.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (adjError) throw adjError;
      adjustments = adj || [];
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          student,
          subscription: selected,
          history: history || [],
          adjustments,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Subscription detail error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
