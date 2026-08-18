import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/interviews


// POST /api/admin/interviews
export const Route = createFileRoute("/api/admin/interviews")({
  server: {
    handlers: {
      POST: async ({ request }) => {
      
        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;
      
          const body = await request.json();
          const { mentorId, studentId, scheduledAt, status } = body;
      
          // Validate input
          if (!mentorId || !studentId || !scheduledAt) {
            return new Response(
              JSON.stringify({ success: false, error: "Missing required fields: mentorId, studentId, scheduledAt" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }
      
          if (typeof scheduledAt !== 'string' || isNaN(Date.parse(scheduledAt))) {
            return new Response(
              JSON.stringify({ success: false, error: "Invalid scheduledAt date" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }
      
          const admin = supabaseAdmin as any;
      
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
      
          // Verify student exists
          const { data: student, error: studentError } = await admin
            .from("profiles")
            .select("*")
            .eq("id", studentId)
            .single();
      
          if (studentError || !student) {
            return new Response(
              JSON.stringify({ success: false, error: "Student not found" }),
              { status: 404, headers: { "Content-Type": "application/json" } }
            );
          }
      
          // Create interview
          const { data: interview, error: createError } = await admin
            .from("interviews")
            .insert({
              mentor_id: mentorId,
              student_id: studentId,
              scheduled_at: scheduledAt,
              status: status || "scheduled",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();
      
          if (createError) throw createError;
      
          // Create notifications for both mentor and student
          const notifications = [
            {
              user_id: mentorId,
              title: "Interview Scheduled",
              message: `An interview has been scheduled with student ${student.full_name || "Unknown"} on ${new Date(scheduledAt).toLocaleString()}.`,
              type: "interview_scheduled",
              created_at: new Date().toISOString(),
            },
            {
              user_id: studentId,
              title: "Interview Scheduled",
              message: `An interview has been scheduled with mentor ${mentor.headline || "Unknown"} on ${new Date(scheduledAt).toLocaleString()}.`,
              type: "interview_scheduled",
              created_at: new Date().toISOString(),
            },
          ];
      
          const { error: notifError } = await admin
            .from("notifications")
            .insert(notifications);
      
          if (notifError) console.error("Failed to create notifications:", notifError);
      
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Interview scheduled successfully",
              data: interview
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          console.error("Create interview error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

      },
      GET: async ({ request }) => {
      
        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;
      
          const admin = supabaseAdmin as any;
      
          // Get all interviews with related data
          const { data: interviews, error } = await admin
            .from("interviews")
            .select("id, mentor_id, student_id, scheduled_at, status, created_at, updated_at")
            .order("scheduled_at", { ascending: false });
      
          if (error) throw error;
      
          // Get mentor and student profiles
          const mentorIds = [...new Set(interviews?.map((i: any) => i.mentor_id) || [])];
          const studentIds = [...new Set(interviews?.map((i: any) => i.student_id) || [])];
          const allUserIds = [...new Set([...mentorIds, ...studentIds])];
      
          const { data: profiles, error: profilesError } = await admin
            .from("profiles")
            .select("id, full_name, email")
            .in("id", allUserIds);
      
          if (profilesError) throw profilesError;
      
          // Create user map
          const userMap: Record<string, any> = {};
          profiles?.forEach((p: any) => {
            userMap[p.id] = p;
          });
      
          // Combine data
          const interviewsWithUsers = interviews?.map((interview: any) => ({
            ...interview,
            mentor: userMap[interview.mentor_id] || { full_name: "Unknown", email: "unknown" },
            student: userMap[interview.student_id] || { full_name: "Unknown", email: "unknown" },
          })) || [];
      
          return new Response(
            JSON.stringify({
              success: true,
              data: interviewsWithUsers,
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (err: any) {
          console.error("Interviews error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

      },
    },
  },
});
