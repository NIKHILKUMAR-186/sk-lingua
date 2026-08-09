import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/mentors/approve
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { applicationId, action } = body;

    // Validate input
    if (!applicationId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: applicationId, action" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action. Must be 'approve' or 'reject'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;

    // Get the application
    const { data: application, error: appError } = await admin
      .from("mentor_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return new Response(
        JSON.stringify({ success: false, error: "Application not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "approve") {
      // Update application status
      const { error: updateError } = await admin
        .from("mentor_applications")
        .update({ 
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: authResult.userId,
        })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      // Add mentor role to user
      const { error: roleError } = await admin
        .from("user_roles")
        .insert({
          user_id: application.user_id,
          role: "mentor",
        });

      if (roleError) throw roleError;

      // Create mentor profile if it doesn't exist
      const { error: profileError } = await admin
        .from("mentor_profiles")
        .upsert({
          user_id: application.user_id,
          is_active: true,
          created_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      return new Response(
        JSON.stringify({ success: true, message: "Mentor approved successfully" }),
        { headers: { "Content-Type": "application/json" } }
      );
    } else {
      // Reject application
      const { error: updateError } = await admin
        .from("mentor_applications")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: authResult.userId,
        })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: "Application rejected" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error("Approve mentor error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}