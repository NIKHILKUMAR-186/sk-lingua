import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/bookings/assign
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { sessionId, mentorId } = body;

    // Validate input
    if (!sessionId || !mentorId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: sessionId, mentorId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;

    // Verify session exists
    const { data: session, error: sessionError } = await admin
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ success: false, error: "Session not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify mentor exists and is active
    const { data: mentor, error: mentorError } = await admin
      .from("mentor_profiles")
      .select("*")
      .eq("user_id", mentorId)
      .eq("is_active", true)
      .single();

    if (mentorError || !mentor) {
      return new Response(
        JSON.stringify({ success: false, error: "Mentor not found or not active" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize assignment_history if not present
    const assignmentHistory = session.assignment_history || [];
    
    // Add assignment event
    assignmentHistory.push({
      action: "assigned",
      mentor_id: mentorId,
      assigned_by: authResult.userId,
      created_at: new Date().toISOString(),
    });

    // Update session
    const { error: updateError } = await admin
      .from("sessions")
      .update({
        mentor_id: mentorId,
        status: "pending_mentor_response",
        assignment_history: assignmentHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, message: "Mentor assigned successfully" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Assign mentor error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}