import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

function getDateFilter(dateRange: string) {
  const now = new Date();
  let startDate: Date;

  switch (dateRange) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "last_7_days":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last_30_days":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(0);
  }

  return startDate;
}

// GET /api/admin/analytics/bookings
export const Route = createFileRoute("/api/admin/analytics-bookings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
      
        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;
      
          const url = new URL(request.url);
          const dateRange = url.searchParams.get("dateRange") || "all";
      
          const admin = supabaseAdmin as any;
          const startDate = getDateFilter(dateRange);
      
          // Get all bookings (sessions) in date range
          const { data: bookings, error } = await admin
            .from("sessions")
            .select("id, status, created_at, scheduled_time, mentor_id, student_id, assignment_history")
            .gte("created_at", startDate.toISOString())
            .order("created_at", { ascending: true });
      
          if (error) throw error;
      
          // Count by status
          const statusCounts: Record<string, number> = {
            total: bookings?.length || 0,
            pending_assignment: 0,
            assigned: 0,
            accepted: 0,
            rejected: 0,
            completed: 0,
            cancelled: 0,
          };
      
          // Track assignment metrics
          let totalAssignmentTime = 0;
          let assignmentsWithin15Min = 0;
          let totalAssignments = 0;
          let acceptedAssignments = 0;
          let totalAssignmentAttempts = 0;
      
          bookings?.forEach((booking: any) => {
            const status = booking.status;
            
            // Count by status
            if (status === 'pending_admin_assignment' || status === 'pending_mentor_response') {
              statusCounts.pending_assignment++;
            } else if (status === 'confirmed' || status === 'in_progress') {
              statusCounts.assigned++;
            } else if (status === 'accepted') {
              statusCounts.accepted++;
            } else if (status === 'rejected') {
              statusCounts.rejected++;
            } else if (status === 'completed') {
              statusCounts.completed++;
            } else if (status === 'cancelled') {
              statusCounts.cancelled++;
            }
      
            // Calculate assignment SLA metrics
            if (booking.assignment_history && Array.isArray(booking.assignment_history)) {
              totalAssignmentAttempts += booking.assignment_history.length;
              
              const assignmentEvent = booking.assignment_history.find((e: any) => e.action === 'assigned');
              const acceptEvent = booking.assignment_history.find((e: any) => e.action === 'accepted');
              
              if (assignmentEvent) {
                totalAssignments++;
                
                if (acceptEvent) {
                  acceptedAssignments++;
                  
                  // Calculate response time
                  const assignedAt = new Date(assignmentEvent.created_at);
                  const respondedAt = new Date(acceptEvent.created_at);
                  const responseTimeMins = (respondedAt.getTime() - assignedAt.getTime()) / (1000 * 60);
                  
                  totalAssignmentTime += responseTimeMins;
                  
                  if (responseTimeMins <= 15) {
                    assignmentsWithin15Min++;
                  }
                }
              }
            }
          });
      
          // Calculate SLA metrics
          const avgAssignmentTime = totalAssignments > 0 
            ? parseFloat((totalAssignmentTime / totalAssignments).toFixed(1))
            : 0;
      
          const within15MinPercentage = totalAssignments > 0
            ? parseFloat(((assignmentsWithin15Min / totalAssignments) * 100).toFixed(1))
            : 0;
      
          const exceeding15MinPercentage = totalAssignments > 0
            ? parseFloat((100 - within15MinPercentage).toFixed(1))
            : 0;
      
          const autoAssignmentSuccessRate = totalAssignments > 0
            ? parseFloat(((acceptedAssignments / totalAssignments) * 100).toFixed(1))
            : 0;
      
          const mentorAcceptanceRate = totalAssignments > 0
            ? parseFloat(((acceptedAssignments / totalAssignments) * 100).toFixed(1))
            : 0;
      
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                statusCounts,
                totalBookings: statusCounts.total,
                avgAssignmentTime,
                within15MinPercentage,
                exceeding15MinPercentage,
                autoAssignmentSuccessRate,
                mentorAcceptanceRate,
                totalAssignments,
                acceptedAssignments,
              },
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (err: any) {
          console.error("Booking analytics error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

      },
    },
  },
});
