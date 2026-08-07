import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// The generated Supabase types do not yet include Phase 4 tables
// (session_requests, reports, etc.). Use a loose client for those.
const client = supabase as any;

export interface AdminAnalytics {
  totalRevenue: number;
  totalStudents: number;
  totalMentors: number;
  totalBookings: number;
  totalSessions: number;
  completedSessions: number;
  pendingSessions: number;
  demoConversionRate: number;
  completionRate: number;
  avgRating: number;
  totalReviews: number;
  openReports: number;
  resolvedReports: number;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    bookings: number;
    sessions: number;
    students: number;
  }>;
  recentBookings: Array<Record<string, unknown>>;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function bucketByMonthSlow(rows: Array<Record<string, any>>, field: string) {
  const buckets: Record<string, number> = {};
  for (const row of rows) {
    const raw = row?.[field];
    if (!raw) continue;
    const d = new Date(raw);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  return buckets;
}

function bucketRevenueByMonth(rows: Array<Record<string, any>>) {
  const buckets: Record<string, number> = {};
  for (const row of rows) {
    const raw = row?.created_at;
    if (!raw) continue;
    const d = new Date(raw);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets[key] = (buckets[key] ?? 0) + Number(row?.final_amount ?? 0);
  }
  return buckets;
}

export function useAdminAnalytics() {
  return useQuery<AdminAnalytics>({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [
        { data: paymentOrders = [] },
        { count: studentsCount },
        { count: mentorsCount },
        { data: sessionRequests = [] },
        { data: sessions = [] },
        { data: demoBookings = [] },
        { data: reviews = [] },
        { data: reports = [] },
        { data: studentSignups = [] },
      ] = await Promise.all([
        client
          .from("payment_orders")
          .select("final_amount, payment_status, created_at")
          .eq("payment_status", "completed"),
        client.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
        client
          .from("mentor_profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        client.from("session_requests").select("status, created_at"),
        client.from("sessions").select("status, scheduled_time, duration_mins"),
        client.from("demo_session_bookings").select("booking_status, created_at"),
        client.from("reviews").select("rating"),
        client.from("reports").select("status"),
        client.from("user_roles").select("created_at").eq("role", "student"),
      ]);

      const completedPayments = (paymentOrders ?? []).filter(
        (p: any) => p.payment_status === "completed",
      );
      const totalRevenue = completedPayments.reduce(
        (sum: number, p: any) => sum + Number(p.final_amount ?? 0),
        0,
      );

      const totalStudents = studentsCount ?? 0;
      const totalMentors = mentorsCount ?? 0;
      const totalBookings = (sessionRequests ?? []).length;
      const totalSessions = (sessions ?? []).length;
      const completedSessions = (sessions ?? []).filter(
        (s: any) => s.status === "completed",
      ).length;
      const pendingSessions = (sessions ?? []).filter(
        (s: any) => s.status === "pending" || s.status === "accepted",
      ).length;

      const demoBookingsArr = demoBookings ?? [];
      const completedDemo = demoBookingsArr.filter(
        (d: any) => d.booking_status === "completed",
      ).length;
      const demoConversionRate =
        demoBookingsArr.length > 0 ? Math.round((completedDemo / demoBookingsArr.length) * 100) : 0;

      const completionRate =
        totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

      const reviewsArr = reviews ?? [];
      const avgRating = reviewsArr.length
        ? Math.round(
            (reviewsArr.reduce((sum: number, r: any) => sum + Number(r.rating ?? 0), 0) /
              reviewsArr.length) *
              10,
          ) / 10
        : 0;
      const totalReviews = reviewsArr.length;

      const reportsArr = reports ?? [];
      const openReports = reportsArr.filter((r: any) => r.status === "open").length;
      const resolvedReports = reportsArr.length - openReports;

      // Monthly trends for the last 6 months
      const now = new Date();
      const sixMonths: Array<{ key: string; label: string }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        sixMonths.push({
          key: `${d.getFullYear()}-${d.getMonth()}`,
          label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        });
      }

      const revenueByMonth = bucketRevenueByMonth(paymentOrders ?? []);
      const bookingsByMonth = bucketByMonthSlow(sessionRequests ?? [], "created_at");
      const sessionsByMonth = bucketByMonthSlow(sessions ?? [], "scheduled_time");
      const studentsByMonth = bucketByMonthSlow(studentSignups ?? [], "created_at");

      const monthlyTrends = sixMonths.map((m) => ({
        month: m.label,
        revenue: Math.round(revenueByMonth[m.key] ?? 0),
        bookings: bookingsByMonth[m.key] ?? 0,
        sessions: sessionsByMonth[m.key] ?? 0,
        students: studentsByMonth[m.key] ?? 0,
      }));

      const recentBookings = (sessionRequests ?? [])
        .sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 8);

      return {
        totalRevenue,
        totalStudents,
        totalMentors,
        totalBookings,
        totalSessions,
        completedSessions,
        pendingSessions,
        demoConversionRate,
        completionRate,
        avgRating,
        totalReviews,
        openReports,
        resolvedReports,
        monthlyTrends,
        recentBookings,
      };
    },
  });
}
