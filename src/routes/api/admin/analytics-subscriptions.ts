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

// GET /api/admin/analytics/subscriptions
export const Route = createFileRoute("/api/admin/analytics-subscriptions")({
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
      
          // Get all subscriptions in date range
          const { data: subscriptions, error } = await admin
            .from("student_subscriptions")
            .select("id, status, plan_id, created_at, activated_at, expires_at")
            .gte("created_at", startDate.toISOString());
      
          if (error) throw error;
      
          // Count by status
          const statusCounts: Record<string, number> = {
            total: subscriptions?.length || 0,
            active: 0,
            cancelled: 0,
            expired: 0,
            pending: 0,
          };
      
          subscriptions?.forEach((sub: any) => {
            const status = sub.status;
            if (status in statusCounts) {
              statusCounts[status]++;
            }
          });
      
          // Get all subscription plans
          const { data: plans, error: plansError } = await admin
            .from("subscription_plans")
            .select("id, name, price, billing_cycle");
      
          if (plansError) throw plansError;
      
          // Create plan map
          const planMap: Record<string, any> = {};
          plans?.forEach((plan: any) => {
            planMap[plan.id] = plan;
          });
      
          // Aggregate by plan
          const planStats: Record<string, any> = {};
      
          subscriptions?.forEach((sub: any) => {
            const plan = planMap[sub.plan_id];
            if (!plan) return;
      
            const planName = plan.name || "Unknown";
      
            if (!planStats[planName]) {
              planStats[planName] = {
                planName,
                count: 0,
                revenue: 0,
                billingCycle: plan.billing_cycle,
              };
            }
      
            planStats[planName].count++;
            
            // Add revenue if subscription is active or was active
            if (sub.status === 'active' || sub.status === 'cancelled' || sub.status === 'expired') {
              planStats[planName].revenue += parseFloat(plan.price) || 0;
            }
          });
      
          const planStatsArray = Object.values(planStats).sort((a: any, b: any) => 
            b.count - a.count
          );
      
          // Find most popular plan
          const mostPopularPlan = planStatsArray.length > 0 ? planStatsArray[0] : null;
      
          // Calculate total revenue from subscriptions
          const totalSubscriptionRevenue = planStatsArray.reduce((sum: number, plan: any) => 
            sum + plan.revenue, 0
          );
      
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                statusCounts,
                totalSubscriptions: statusCounts.total,
                activeSubscriptions: statusCounts.active,
                cancelledSubscriptions: statusCounts.cancelled,
                expiredSubscriptions: statusCounts.expired,
                subscribersByPlan: planStatsArray,
                revenueByPlan: planStatsArray.map((p: any) => ({
                  planName: p.planName,
                  revenue: p.revenue,
                })),
                mostPopularPlan,
                totalSubscriptionRevenue,
              },
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (err: any) {
          console.error("Subscription analytics error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

      },
    },
  },
});
