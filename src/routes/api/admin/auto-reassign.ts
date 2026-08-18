import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/auto-reassign
export const Route = createFileRoute("/api/admin/auto-reassign")({
  server: {
    handlers: {
      POST: async ({ request }) => {
      
        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;
      
          const body = await request.json();
          const { sessionId, reason } = body;
      
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
      
          // Find available mentors who teach the target language (excluding current mentor)
          const { data: availableMentors, error: mentorsError } = await admin
            .from("mentor_profiles")
            .select("user_id, languages_taught, is_active")
            .eq("is_active", true)
            .contains("languages_taught", [studentProfile.target_language])
            .neq("user_id", session.mentor_id);
      
          if (mentorsError) throw mentorsError;
      
          if (!availableMentors || availableMentors.length === 0) {
            return new Response(
              JSON.stringify({ success: false, error: "No other available mentors found for this language" }),
              { status: 404, headers: { "Content-Type": "application/json" } }
            );
          }
      
          // Simple matching: pick first available mentor
          const matchedMentor = availableMentors[0];
      
          // Initialize assignment_history if not present
          const assignmentHistory = session.assignment_history || [];
          
          // Add reassignment event
          assignmentHistory.push({
            action: "reassigned",
            mentor_id: matchedMentor.user_id,
            previous_mentor_id: session.mentor_id,
            reason: reason || "Admin reassignment",
            reassigned_by: authResult.userId,
            created_at: new Date().toISOString(),
          });
      
          // Update session with new mentor
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
              message: "Mentor reassigned successfully",
              newMentorId: matchedMentor.user_id
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          console.error("Auto-reassign error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

      },
    },
  },
});
