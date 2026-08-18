import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/assignments/history
export const Route = createFileRoute("/api/admin/assignment-history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
      
        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;
      
          const url = new URL(request.url);
          const sessionId = url.searchParams.get("sessionId");
      
          const admin = supabaseAdmin as any;
      
          if (sessionId) {
            // Get history for specific session
            const { data: session, error } = await admin
              .from("sessions")
              .select("assignment_history")
              .eq("id", sessionId)
              .single();
      
            if (error || !session) {
              return new Response(
                JSON.stringify({ success: false, error: "Session not found" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
              );
            }
      
            return new Response(
              JSON.stringify({
                success: true,
                data: session.assignment_history || [],
              }),
              { headers: { "Content-Type": "application/json" } }
            );
          } else {
            // Get all assignment history from sessions
            const { data: sessions, error } = await admin
              .from("sessions")
              .select("id, assignment_history, status, created_at")
              .not("assignment_history", "is", null)
              .order("created_at", { ascending: false });
      
            if (error) throw error;
      
            // Flatten assignment history
            const allAssignments: any[] = [];
            sessions?.forEach((session: any) => {
              if (session.assignment_history && Array.isArray(session.assignment_history)) {
                session.assignment_history.forEach((event: any) => {
                  allAssignments.push({
                    ...event,
                    session_id: session.id,
                    session_status: session.status,
                  });
                });
              }
            });
      
            return new Response(
              JSON.stringify({
                success: true,
                data: allAssignments,
              }),
              { headers: { "Content-Type": "application/json" } }
            );
          }
        } catch (err: any) {
          console.error("Assignment history error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

      },
    },
  },
});
