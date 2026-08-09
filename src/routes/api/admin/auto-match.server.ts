import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/auto-match
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { sessionId } = body;

    // Validate input
    if (!sessionId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required field: sessionId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;

    // Get session details
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

    // Get student's target language
    const { data: studentProfile, error: studentError } = await admin
      .from("profiles")
      .select("target_language")
      .eq("id", session.student_id)
      .single();

    if (studentError || !studentProfile) {
      return new Response(
        JSON.stringify({ success: false, error: "Student profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find available mentors who teach the target language
    const { data: availableMentors, error: mentorsError } = await admin
      .from("mentor_profiles")
      .select("user_id, languages_taught, is_active")
      .eq("is_active", true)
      .contains("languages_taught", [studentProfile.target_language]);

    if (mentorsError) throw mentorsError;

    if (!availableMentors || availableMentors.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No available mentors found for this language" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Simple matching: pick first available mentor
    // In production, this would use a more sophisticated algorithm
    const matchedMentor = availableMentors[0];

    // Initialize assignment_history if not present
    const assignmentHistory = session.assignment_history || [];
    
    // Add auto-match event
    assignmentHistory.push({
      action: "auto_matched",
      mentor_id: matchedMentor.user_id,
      matched_by: "system",
      created_at: new Date().toISOString(),
    });

    // Update session with matched mentor
    const { error: updateError } = await admin
      .from("sessions")
      .update({
        mentor_id: matchedMentor.user_id,
        status: "pending_mentor_response",
        assignment_history: assignmentHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Mentor auto-matched successfully",
        mentorId: matchedMentor.user_id
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Auto-match error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}