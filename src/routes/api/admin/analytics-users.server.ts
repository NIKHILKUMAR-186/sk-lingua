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

// GET /api/admin/analytics/users
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const url = new URL(request.url);
    const dateRange = url.searchParams.get("dateRange") || "all";
    const granularity = url.searchParams.get("granularity") || "daily";

    const admin = supabaseAdmin as any;
    const startDate = getDateFilter(dateRange);

    // Get all users created in date range with their roles
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Get all user roles
    const { data: roles, error: rolesError } = await admin
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) throw rolesError;

    // Create a map of user_id -> role
    const userRoles: Record<string, string> = {};
    roles?.forEach((r: any) => {
      userRoles[r.user_id] = r.role;
    });

    // Aggregate by time granularity
    const aggregated: Record<string, any> = {
      total: 0,
      students: 0,
      mentors: 0,
      admins: 0,
    };

    const timeSeriesData: Record<string, any> = {};

    profiles?.forEach((profile: any) => {
      const role = userRoles[profile.id] || "unknown";
      
      aggregated.total++;
      if (role === "student") aggregated.students++;
      else if (role === "mentor") aggregated.mentors++;
      else if (role === "admin") aggregated.admins++;

      // Time series aggregation
      const date = new Date(profile.created_at);
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

      if (!timeSeriesData[key]) {
        timeSeriesData[key] = {
          date: key,
          total: 0,
          students: 0,
          mentors: 0,
          admins: 0,
        };
      }

      timeSeriesData[key].total++;
      if (role === "student") timeSeriesData[key].students++;
      else if (role === "mentor") timeSeriesData[key].mentors++;
      else if (role === "admin") timeSeriesData[key].admins++;
    });

    const timeSeriesArray = Object.values(timeSeriesData).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          summary: aggregated,
          timeSeriesData: timeSeriesArray,
          totalUsers: aggregated.total,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("User analytics error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}