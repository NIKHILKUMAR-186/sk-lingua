import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/mentors/toggle-status
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { mentorId, isActive } = body;

    // Validate input
    if (!mentorId || typeof isActive !== 'boolean') {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: mentorId, isActive" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;

    // Verify mentor exists
    const { data: mentor, error: mentorError } = await admin
      .from("mentor_profiles")
      .select("*")
      .eq("user_id", mentorId)
      .single();

    if (mentorError || !mentor) {
      return new Response(
        JSON.stringify({ success: false, error: "Mentor not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update mentor status
    const { error: updateError } = await admin
      .from("mentor_profiles")
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", mentorId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Mentor ${isActive ? 'activated' : 'suspended'} successfully` 
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Toggle mentor status error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
