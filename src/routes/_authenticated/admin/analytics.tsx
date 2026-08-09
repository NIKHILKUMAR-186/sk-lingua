import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, UserCheck, FileText, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAnalytics,
});

type DateRange = "today" | "last_7_days" | "last_30_days" | "this_month" | "last_month" | "this_year" | "all";

// Helper to get auth token and make authenticated requests
async function authenticatedFetch(url: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function AdminAnalytics() {
  const { data: auth } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>("all");

  // Fetch overview metrics
  const { data: overviewData, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ["admin-analytics-overview", dateRange],
    enabled: !!auth?.user,
    queryFn: async () => {
      const json = await authenticatedFetch(`/api/admin/analytics?dateRange=${dateRange}`);
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Fetch revenue data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["admin-analytics-revenue", dateRange],
    enabled: !!auth?.user,
    queryFn: async () => {
      const json = await authenticatedFetch(`/api/admin/analytics/revenue?dateRange=${dateRange}&granularity=daily`);
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Fetch session data
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ["admin-analytics-sessions", dateRange],
    enabled: !!auth?.user,
    queryFn: async () => {
      const json = await authenticatedFetch(`/api/admin/analytics/sessions?dateRange=${dateRange}&granularity=daily`);
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Fetch user growth data
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["admin-analytics-users", dateRange],
    enabled: !!auth?.user,
    queryFn: async () => {
      const json = await authenticatedFetch(`/api/admin/analytics/users?dateRange=${dateRange}&granularity=daily`);
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Fetch mentor data
  const { data: mentorData, isLoading: mentorLoading } = useQuery({
    queryKey: ["admin-analytics-mentors", dateRange],
    enabled: !!auth?.user,
    queryFn: async () => {
      const json = await authenticatedFetch(`/api/admin/analytics/mentors?dateRange=${dateRange}`);
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Fetch booking data
  const { data: bookingData, isLoading: bookingLoading } = useQuery({
    queryKey: ["admin-analytics-bookings", dateRange],
    enabled: !!auth?.user,
    queryFn: async () => {
      const json = await authenticatedFetch(`/api/admin/analytics/bookings?dateRange=${dateRange}`);
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Fetch subscription data
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["admin-analytics-subscriptions", dateRange],
    enabled: !!auth?.user,
    queryFn: async () => {
      const json = await authenticatedFetch(`/api/admin/analytics/subscriptions?dateRange=${dateRange}`);
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Fetch top mentors
  const { data: topMentorsData, isLoading: topMentorsLoading } = useQuery({
    queryKey: ["admin-analytics-top-mentors", dateRange],
    enabled: !!auth?.user,
    queryFn: async () => {
      const json = await authenticatedFetch(`/api/admin/analytics/top-mentors?limit=10&metric=sessions_completed`);
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Fetch region data
  const { data: regionData, isLoading: regionLoading } = useQuery({
    queryKey: ["admin-analytics-regions", dateRange],
    enabled: !!auth?.user,
    queryFn: async () => {
      const json = await authenticatedFetch(`/api/admin/analytics/regions?dateRange=${dateRange}`);
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Fetch language data
  const { data: languageData, isLoading: languageLoading } = useQuery({
    queryKey: ["admin-analytics-languages", dateRange],
    enabled: !!auth?.user,
    queryFn: async () => {
      const json = await authenticatedFetch(`/api/admin/analytics/languages?dateRange=${dateRange}`);
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const isLoading = overviewLoading || revenueLoading || sessionLoading || userLoading || mentorLoading || bookingLoading || subscriptionLoading || topMentorsLoading || regionLoading || languageLoading;

  if (!auth?.user) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  const statCards = [
    { 
      label: "Total Users", 
      value: overviewData?.totalUsers ?? 0, 
      icon: Users, 
      color: "text-primary" 
    },
    { 
      label: "Total Students", 
      value: overviewData?.totalStudents ?? 0, 
      icon: Users, 
      color: "text-blue-600" 
    },
    { 
      label: "Active Mentors", 
      value: overviewData?.activeMentors ?? 0, 
      icon: UserCheck, 
      color: "text-green-600" 
    },
    { 
      label: "Total Revenue", 
      value: `₹${(overviewData?.totalRevenue || 0).toFixed(0)}`, 
      icon: DollarSign, 
      color: "text-green-600" 
    },
    { 
      label: "Completed Sessions", 
      value: overviewData?.completedSessions ?? 0, 
      icon: Calendar, 
      color: "text-mentor" 
    },
    { 
      label: "Active Subscriptions", 
      value: overviewData?.activeSubscriptions ?? 0, 
      icon: TrendingUp, 
      color: "text-purple-600" 
    },
    { 
      label: "Pending Approvals", 
      value: overviewData?.pendingMentorApprovals ?? 0, 
      icon: FileText, 
      color: "text-amber-600" 
    },
    { 
      label: "New Registrations", 
      value: overviewData?.newRegistrations ?? 0, 
      icon: Users, 
      color: "text-primary" 
    },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Real-time platform metrics and insights</p>
          </div>
          
          {/* Date Filter */}
          <div className="flex gap-2">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-4 py-2 border rounded-md bg-background"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        ) : overviewError ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-red-600">Error loading analytics: {overviewError.message}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
              {statCards.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-3xl font-display mt-2">{stat.value}</p>
                        </div>
                        <stat.icon className={`h-10 w-10 ${stat.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Revenue Section */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueData && revenueData.timeSeriesData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-display">₹{revenueData.totalRevenue.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Transactions</p>
                        <p className="text-2xl font-display">{revenueData.transactionCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Transaction</p>
                        <p className="text-2xl font-display">
                          ₹{revenueData.transactionCount > 0 ? (revenueData.totalRevenue / revenueData.transactionCount).toFixed(0) : 0}
                        </p>
                      </div>
                    </div>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                      <p className="text-muted-foreground">Revenue chart: {revenueData.timeSeriesData.length} data points</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No revenue data available for this period</p>
                )}
              </CardContent>
            </Card>

            {/* Session Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Session Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {sessionData && sessionData.totalSessions > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Sessions</p>
                        <p className="text-2xl font-display">{sessionData.totalSessions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="text-2xl font-display text-green-600">{sessionData.statusCounts.completed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-2xl font-display text-amber-600">{sessionData.statusCounts.pending}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Completion Rate</p>
                        <p className="text-2xl font-display">{sessionData.completionRate}%</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No session data available for this period</p>
                )}
              </CardContent>
            </Card>

            {/* Mentor Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Mentor Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {mentorData ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Mentors</p>
                      <p className="text-2xl font-display">{mentorData.totalMentors}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active</p>
                      <p className="text-2xl font-display text-green-600">{mentorData.active}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Verification</p>
                      <p className="text-2xl font-display text-amber-600">{mentorData.pendingVerification}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Rating</p>
                      <p className="text-2xl font-display">{mentorData.averageRating}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sessions Completed</p>
                      <p className="text-2xl font-display">{mentorData.totalSessionsCompleted}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Reviews</p>
                      <p className="text-2xl font-display">{mentorData.totalReviews}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Loading mentor data...</p>
                )}
              </CardContent>
            </Card>

            {/* Booking Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {bookingData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Bookings</p>
                        <p className="text-2xl font-display">{bookingData.totalBookings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="text-2xl font-display text-green-600">{bookingData.statusCounts.completed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Assignment</p>
                        <p className="text-2xl font-display text-amber-600">{bookingData.statusCounts.pending_assignment}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cancelled</p>
                        <p className="text-2xl font-display text-red-600">{bookingData.statusCounts.cancelled}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Assignment Time</p>
                        <p className="text-2xl font-display">{bookingData.avgAssignmentTime} min</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Within 15 Min</p>
                        <p className="text-2xl font-display text-green-600">{bookingData.within15MinPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Mentor Acceptance Rate</p>
                        <p className="text-2xl font-display">{bookingData.mentorAcceptanceRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Auto-Assignment Success</p>
                        <p className="text-2xl font-display">{bookingData.autoAssignmentSuccessRate}%</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Loading booking data...</p>
                )}
              </CardContent>
            </Card>

            {/* Subscription Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {subscriptionData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Subscriptions</p>
                        <p className="text-2xl font-display">{subscriptionData.totalSubscriptions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Active</p>
                        <p className="text-2xl font-display text-green-600">{subscriptionData.activeSubscriptions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cancelled</p>
                        <p className="text-2xl font-display text-red-600">{subscriptionData.cancelledSubscriptions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expired</p>
                        <p className="text-2xl font-display text-amber-600">{subscriptionData.expiredSubscriptions}</p>
                      </div>
                    </div>
                    {subscriptionData.mostPopularPlan && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">Most Popular Plan</p>
                        <p className="text-xl font-display">{subscriptionData.mostPopularPlan.planName}</p>
                        <p className="text-sm text-muted-foreground">{subscriptionData.mostPopularPlan.count} subscribers</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Loading subscription data...</p>
                )}
              </CardContent>
            </Card>

            {/* Top Mentors */}
            <Card>
              <CardHeader>
                <CardTitle>Top Mentors</CardTitle>
              </CardHeader>
              <CardContent>
                {topMentorsData && topMentorsData.length > 0 ? (
                  <div className="space-y-3">
                    {topMentorsData.slice(0, 5).map((mentor: any, index: number) => (
                      <div key={mentor.userId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{mentor.headline || "Mentor"}</p>
                            <p className="text-sm text-muted-foreground">
                              Rating: {mentor.ratingAvg} ({mentor.totalReviews} reviews)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg">{mentor.sessionsCompleted}</p>
                          <p className="text-xs text-muted-foreground">sessions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No mentor data available</p>
                )}
              </CardContent>
            </Card>

            {/* Regional Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Regional Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {regionData && regionData.length > 0 ? (
                  <div className="space-y-3">
                    {regionData.slice(0, 5).map((region: any) => (
                      <div key={region.state} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{region.state}</p>
                          <p className="text-sm text-muted-foreground">
                            {region.students} students · {region.mentors} mentors · {region.bookings} bookings
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg">{region.totalUsers}</p>
                          <p className="text-xs text-muted-foreground">users</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No regional data available</p>
                )}
              </CardContent>
            </Card>

            {/* Language Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Language Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {languageData && languageData.bookingsByLanguage.length > 0 ? (
                  <div className="space-y-3">
                    {languageData.bookingsByLanguage.slice(0, 5).map((lang: any) => (
                      <div key={lang.language} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{lang.language}</p>
                          <p className="text-sm text-muted-foreground">
                            {languageData.activeMentorsByLanguage.find((l: any) => l.language === lang.language)?.count || 0} active mentors
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg">{lang.count}</p>
                          <p className="text-xs text-muted-foreground">bookings</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No language data available</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
