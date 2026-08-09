import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/reports/resolve
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { reportId, action, notes } = body;

    // Validate input
    if (!reportId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: reportId, action" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!["resolve", "dismiss", "escalate"].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action. Must be 'resolve', 'dismiss', or 'escalate'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;

    // Verify report exists
    const { data: report, error: reportError } = await admin
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ success: false, error: "Report not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update report status
    const { error: updateError } = await admin
      .from("reports")
      .update({
        status: action === "resolve" ? "resolved" : action === "dismiss" ? "dismissed" : "escalated",
        resolved_at: new Date().toISOString(),
        resolved_by: authResult.userId,
        resolution_notes: notes || null,
      })
      .eq("id", reportId);

    if (updateError) throw updateError;

    // Create notification for the user who filed the report
    const { error: notifError } = await admin
      .from("notifications")
      .insert({
        user_id: report.reported_by,
        title: "Report Update",
        message: `Your report has been ${action === "resolve" ? "resolved" : action === "dismiss" ? "dismissed" : "escalated"}.`,
        type: "report_update",
        created_at: new Date().toISOString(),
      });

    if (notifError) console.error("Failed to create notification:", notifError);

    return new Response(
      JSON.stringify({ success: true, message: `Report ${action}d successfully` }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Resolve report error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}