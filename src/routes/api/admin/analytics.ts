import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// Helper to build date filter
function getDateFilter(dateRange: string, columnName: string = "created_at") {
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
      startDate = new Date(0); // All time
  }

  return { [columnName]: { gte: startDate.toISOString() } };
}

// GET /api/admin/analytics/overview
export const Route = createFileRoute("/api/admin/analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
      
        try {
          // Check admin authorization
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;
      
          const url = new URL(request.url);
          const dateRange = url.searchParams.get("dateRange") || "all";
      
          const admin = supabaseAdmin as any;
          const dateFilter = getDateFilter(dateRange);
      
          // Parallel queries for all metrics
          const [
            usersResult,
            studentsResult,
            mentorsResult,
            pendingMentorsResult,
            approvedMentorsResult,
            activeMentorsResult,
            totalBookingsResult,
            completedSessionsResult,
            pendingBookingsResult,
            cancelledBookingsResult,
            revenueResult,
            activeSubscriptionsResult,
            newRegistrationsResult,
          ] = await Promise.all([
            // Total Users
            admin.from("profiles").select("*", { count: "exact", head: true }),
            
            // Total Students
            admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
            
            // Total Mentors
            admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "mentor"),
            
            // Pending Mentor Approvals
            admin.from("mentor_applications").select("*", { count: "exact", head: true }).eq("status", "submitted"),
            
            // Approved Mentors
            admin.from("mentor_applications").select("*", { count: "exact", head: true }).eq("status", "approved"),
            
            // Active Mentors
            admin.from("mentor_profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
            
            // Total Bookings (sessions)
            admin.from("sessions").select("*", { count: "exact", head: true }).gte("created_at", dateFilter.created_at),
            
            // Completed Sessions
            admin.from("sessions").select("*", { count: "exact", head: true }).eq("status", "completed").gte("created_at", dateFilter.created_at),
            
            // Pending Bookings
            admin.from("sessions").select("*", { count: "exact", head: true }).in("status", ["pending", "pending_admin_assignment", "pending_mentor_response"]).gte("created_at", dateFilter.created_at),
            
            // Cancelled Bookings
            admin.from("sessions").select("*", { count: "exact", head: true }).eq("status", "cancelled").gte("created_at", dateFilter.created_at),
            
            // Total Revenue (from completed payments)
            admin.from("payment_orders").select("final_amount").eq("payment_status", "completed").gte("created_at", dateFilter.created_at),
            
            // Active Subscriptions
            admin.from("student_subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
            
            // New Registrations
            admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", dateFilter.created_at),
          ]);
      
          // Calculate total revenue
          const totalRevenue = revenueResult.data?.reduce((sum: number, p: any) => sum + (parseFloat(p.final_amount) || 0), 0) || 0;
      
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                totalUsers: usersResult.count || 0,
                totalStudents: studentsResult.count || 0,
                totalMentors: mentorsResult.count || 0,
                pendingMentorApprovals: pendingMentorsResult.count || 0,
                approvedMentors: approvedMentorsResult.count || 0,
                activeMentors: activeMentorsResult.count || 0,
                totalBookings: totalBookingsResult.count || 0,
                completedSessions: completedSessionsResult.count || 0,
                pendingBookings: pendingBookingsResult.count || 0,
                cancelledBookings: cancelledBookingsResult.count || 0,
                totalRevenue: totalRevenue,
                activeSubscriptions: activeSubscriptionsResult.count || 0,
                newRegistrations: newRegistrationsResult.count || 0,
              },
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (err: any) {
          console.error("Analytics overview error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

      },
    },
  },
});
