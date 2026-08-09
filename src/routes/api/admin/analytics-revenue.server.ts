import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

function getDateFilter(dateRange: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

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
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(0);
  }

  return { startDate, endDate };
}

// GET /api/admin/analytics/revenue
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const url = new URL(request.url);
    const dateRange = url.searchParams.get("dateRange") || "all";
    const granularity = url.searchParams.get("granularity") || "daily";

    const admin = supabaseAdmin as any;
    const { startDate, endDate } = getDateFilter(dateRange);

    // Get completed payments in date range
    const { data: payments, error } = await admin
      .from("payment_orders")
      .select("final_amount, completed_at, order_type, related_id")
      .eq("payment_status", "completed")
      .gte("completed_at", startDate.toISOString())
      .lte("completed_at", endDate.toISOString())
      .order("completed_at", { ascending: true });

    if (error) throw error;

    // Calculate total revenue
    const totalRevenue = payments?.reduce((sum: number, p: any) => sum + (parseFloat(p.final_amount) || 0), 0) || 0;

    // Aggregate by time granularity
    const aggregated: Record<string, number> = {};
    
    payments?.forEach((payment: any) => {
      const date = new Date(payment.completed_at);
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

      const amount = parseFloat(payment.final_amount) || 0;
      aggregated[key] = (aggregated[key] || 0) + amount;
    });

    // Convert to array and sort
    const timeSeriesData = Object.entries(aggregated)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Revenue by order type
    const revenueByType: Record<string, number> = {};
    payments?.forEach((payment: any) => {
      const type = payment.order_type || "unknown";
      const amount = parseFloat(payment.final_amount) || 0;
      revenueByType[type] = (revenueByType[type] || 0) + amount;
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalRevenue,
          timeSeriesData,
          revenueByType,
          transactionCount: payments?.length || 0,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Revenue analytics error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}