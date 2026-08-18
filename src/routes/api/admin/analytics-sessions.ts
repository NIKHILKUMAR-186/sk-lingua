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

// GET /api/admin/analytics/sessions
export const Route = createFileRoute("/api/admin/analytics-sessions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
      
        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;
      
          const url = new URL(request.url);
          const dateRange = url.searchParams.get("dateRange") || "all";
          const granularity = url.searchParams.get("granularity") || "daily";
      
          const admin = supabaseAdmin as any;
          const startDate = getDateFilter(dateRange);
      
          // Get all sessions in date range
          const { data: sessions, error } = await admin
            .from("sessions")
            .select("status, scheduled_time, created_at, duration_mins, student_id, mentor_id")
            .gte("created_at", startDate.toISOString())
            .order("created_at", { ascending: true });
      
          if (error) throw error;
      
          // Count by status
          const statusCounts: Record<string, number> = {
            total: sessions?.length || 0,
            completed: 0,
            pending: 0,
            cancelled: 0,
            rejected: 0,
            accepted: 0,
            in_progress: 0,
            confirmed: 0,
            pending_admin_assignment: 0,
            pending_mentor_response: 0,
          };
      
          sessions?.forEach((session: any) => {
            const status = session.status;
            if (status in statusCounts) {
              statusCounts[status]++;
            }
          });
      
          // Aggregate by time granularity
          const aggregated: Record<string, any> = {};
      
          sessions?.forEach((session: any) => {
            const date = new Date(session.scheduled_time || session.created_at);
            let key: string;
      
            if (granularity === "daily") {
              key = date.toISOString().split('T')[0];
            } else if (granularity === "weekly") {
              const weekStart = new Date(date);
              weekStart.setDate(date.getDate() - date.getDay());
              key = weekStart.toISOString().split('T')[0];
            } else if (granularity === "monthly") {
              key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else {
              key = date.toISOString().split('T')[0];
            }
      
            if (!aggregated[key]) {
              aggregated[key] = {
                date: key,
                total: 0,
                completed: 0,
                pending: 0,
                cancelled: 0,
                rejected: 0,
                accepted: 0,
              };
            }
      
            aggregated[key].total++;
            
            if (session.status === 'completed') aggregated[key].completed++;
            else if (['pending', 'pending_admin_assignment', 'pending_mentor_response'].includes(session.status)) aggregated[key].pending++;
            else if (session.status === 'cancelled') aggregated[key].cancelled++;
            else if (session.status === 'rejected') aggregated[key].rejected++;
            else if (session.status === 'accepted') aggregated[key].accepted++;
          });
      
          const timeSeriesData = Object.values(aggregated).sort((a: any, b: any) => 
            a.date.localeCompare(b.date)
          );
      
          // Calculate completion rate
          const completionRate = statusCounts.total > 0 
            ? ((statusCounts.completed / statusCounts.total) * 100).toFixed(1)
            : 0;
      
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                statusCounts,
                completionRate,
                timeSeriesData,
                totalSessions: statusCounts.total,
              },
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (err: any) {
          console.error("Session analytics error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

      },
    },
  },
});
