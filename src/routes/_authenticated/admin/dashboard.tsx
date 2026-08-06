import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, Users, AlertTriangle } from "lucide-react";

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
      ]);
      return {
        pendingCount: pendingCount ?? 0,
        mentorsCount: mentorsCount ?? 0,
        studentsCount: studentsCount ?? 0,
        openReports: openReports ?? 0,
      };
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

  return (
    <AppShell variant="admin">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage session requests, mentor applications, and platform health.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-xs text-muted-foreground">Pending requests</div>
                <div className="mt-1 text-2xl font-display">{stats?.pendingCount ?? 0}</div>
              </div>
              <Inbox className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-xs text-muted-foreground">Active mentors</div>
                <div className="mt-1 text-2xl font-display">{stats?.mentorsCount ?? 0}</div>
              </div>
              <Users className="h-8 w-8 text-mentor" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-xs text-muted-foreground">Students</div>
                <div className="mt-1 text-2xl font-display">{stats?.studentsCount ?? 0}</div>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-xs text-muted-foreground">Open reports</div>
                <div className="mt-1 text-2xl font-display">{stats?.openReports ?? 0}</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Booking queue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Assign mentors to pending session requests.
              </p>
              <Button asChild>
                <Link to="/admin/booking-queue">Open booking queue</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mentor applications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Review and approve new mentor applications.
              </p>
              <Button asChild variant="outline">
                <Link to="/admin/mentor-applications">Review applications</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
