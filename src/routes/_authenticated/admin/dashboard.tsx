import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  Users,
  AlertTriangle,
  FileText,
  Clock,
  MessageSquare,
  TrendingUp,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: auth } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    enabled: !!auth?.user && (auth.roles ?? []).includes("admin"),
    queryFn: async () => {
      const sup = supabase as any;
      const [
        { count: pendingCount },
        { count: mentorsCount },
        { count: studentsCount },
        { count: openReports },
        { count: demoQueueCount },
        { count: supportTicketsCount },
        { count: newApplicationsCount },
      ] = await Promise.all([
        sup
          .from("session_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending_admin_assignment"),
        sup
          .from("mentor_profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        sup.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
        sup.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
        sup.from("demo_session_workspaces").select("*", { count: "exact", head: true }).eq("status", "pending"),
        sup.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
        sup.from("mentor_applications").select("*", { count: "exact", head: true }).eq("status", "submitted"),
      ]);
      return {
        pendingCount: pendingCount ?? 0,
        mentorsCount: mentorsCount ?? 0,
        studentsCount: studentsCount ?? 0,
        openReports: openReports ?? 0,
        demoQueueCount: demoQueueCount ?? 0,
        supportTicketsCount: supportTicketsCount ?? 0,
        newApplicationsCount: newApplicationsCount ?? 0,
      };
    },
  });

  const { data: recentApplications = [] } = useQuery({
    queryKey: ["admin-recent-applications"],
    enabled: !!auth?.user && (auth.roles ?? []).includes("admin"),
    queryFn: async () => {
      const { data } = await supabase
        .from("mentor_applications")
        .select("id, full_name, email, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  if (!auth?.user)
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!(auth.roles ?? []).includes("admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Access denied — admin role required.</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Pending Requests",
      value: stats?.pendingCount ?? 0,
      icon: Inbox,
      color: "text-amber-600",
      bg: "bg-amber-50",
      link: "/admin/booking-queue",
    },
    {
      title: "New Applications",
      value: stats?.newApplicationsCount ?? 0,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      link: "/admin/mentor-applications",
    },
    {
      title: "Active Mentors",
      value: stats?.mentorsCount ?? 0,
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-50",
      link: "/admin/mentor-applications",
    },
    {
      title: "Students",
      value: stats?.studentsCount ?? 0,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/5",
      link: "/admin/analytics",
    },
    {
      title: "Demo Queue",
      value: stats?.demoQueueCount ?? 0,
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-50",
      link: "/admin/demo-queue",
    },
    {
      title: "Support Tickets",
      value: stats?.supportTicketsCount ?? 0,
      icon: MessageSquare,
      color: "text-orange-600",
      bg: "bg-orange-50",
      link: "/admin/support-tickets",
    },
    {
      title: "Open Reports",
      value: stats?.openReports ?? 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      link: "/admin/audit-logs",
    },
  ];

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    submitted: "default",
    under_review: "outline",
    interview_scheduled: "default",
    interview_completed: "outline",
    approved: "default",
    rejected: "destructive",
    active: "default",
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Platform overview and quick actions
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={stat.link}>
                <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer">
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <div className="text-xs text-muted-foreground">{stat.title}</div>
                      <div className="mt-1 text-3xl font-display">{stat.value}</div>
                    </div>
                    <div className={`rounded-xl p-3 ${stat.bg}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Mentor Applications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Mentor Applications</CardTitle>
                  <CardDescription>Latest 5 applications</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/mentor-applications">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentApplications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No applications yet
                </p>
              ) : (
                <div className="space-y-3">
                  {recentApplications.map((app: any) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{app.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{app.email}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant={statusColors[app.status] || "secondary"}>
                          {app.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common admin tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/booking-queue">
                  <Inbox className="mr-2 h-4 w-4" />
                  Assign pending session requests
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/mentor-applications">
                  <FileText className="mr-2 h-4 w-4" />
                  Review mentor applications
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/demo-queue">
                  <Clock className="mr-2 h-4 w-4" />
                  Manage demo sessions
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/support-tickets">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Respond to support tickets
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/notification-broadcasts">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Send platform notification
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}