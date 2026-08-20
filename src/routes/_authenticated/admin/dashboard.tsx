import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  UserCheck,
  ShieldCheck,
  CalendarDays,
  Video,
  RefreshCw,
  Wifi,
  WifiOff,
  TrendingUp,
  CreditCard,
  GraduationCap,
  Bell,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatINR } from "@/lib/currency";
import { getStudentStats } from "@/modules/admin/subscription-control/services/student-control.service";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface KPICardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  link: string;
  attention?: boolean;
}

function KPICard({ title, value, description, icon: Icon, color, bg, link, attention }: KPICardProps) {
  return (
    <Link to={link}>
      <Card className={`h-full transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer ${attention ? "ring-2 ring-amber-200 dark:ring-amber-800" : ""}`}>
        <CardContent className="flex items-center justify-between p-5">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{title}</div>
            <div className="mt-1 text-3xl font-display">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{description}</div>
          </div>
          <div className={`rounded-xl p-3 shrink-0 ${bg}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function Section({ title, description, children, action }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-destructive">
      <p>Unable to load this information.</p>
      <p className="text-xs opacity-80">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function AdminDashboard() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isAdmin = (auth?.roles ?? []).includes("admin");
  const sup = supabase as any;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // ── KPI Queries ──────────────────────────────────────────────────────────
  const pendingRequestsQuery = useQuery({
    queryKey: ["admin-dashboard", "pending-requests"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await sup
        .from("session_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_admin_assignment");
      return count ?? 0;
    },
  });

  const activeMentorsQuery = useQuery({
    queryKey: ["admin-dashboard", "active-mentors"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await sup
        .from("mentor_profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      return count ?? 0;
    },
  });

  const totalStudentsQuery = useQuery({
    queryKey: ["admin-dashboard", "total-students"],
    enabled: isAdmin,
    queryFn: async () => {
      // Server-side, service-role, role-filtered count (client user_roles
      // query is blocked by RLS for non-owner reads).
      const stats = await getStudentStats();
      return stats.totalStudents ?? 0;
    },
  });

  const todaySessionsQuery = useQuery({
    queryKey: ["admin-dashboard", "today-sessions"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await sup
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .gte("scheduled_time", startOfDay.toISOString())
        .lte("scheduled_time", endOfDay.toISOString());
      return count ?? 0;
    },
  });

  const activeSubscriptionsQuery = useQuery({
    queryKey: ["admin-dashboard", "active-subscriptions"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await sup
        .from("student_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      return count ?? 0;
    },
  });

  const demoQueueQuery = useQuery({
    queryKey: ["admin-dashboard", "demo-queue"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await sup
        .from("demo_session_bookings")
        .select("*", { count: "exact", head: true })
        .eq("booking_status", "pending_admin_confirmation");
      return count ?? 0;
    },
  });

  const supportTicketsQuery = useQuery({
    queryKey: ["admin-dashboard", "support-tickets"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await sup
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      return count ?? 0;
    },
  });

  const sessionsCompletedQuery = useQuery({
    queryKey: ["admin-dashboard", "sessions-completed"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await sup
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("updated_at", startOfDay.toISOString());
      return count ?? 0;
    },
  });

  // ── Attention Items Query ────────────────────────────────────────────────
  const attentionItemsQuery = useQuery({
    queryKey: ["admin-dashboard", "attention-items"],
    enabled: isAdmin,
    queryFn: async () => {
      const [
        pendingReqRes,
        appRes,
        demoRes,
        ticketRes,
      ] = await Promise.all([
        sup.from("session_requests").select("*", { count: "exact", head: true }).eq("status", "pending_admin_assignment"),
        sup.from("mentor_applications").select("*", { count: "exact", head: true }).eq("status", "submitted"),
        sup.from("demo_session_bookings").select("*", { count: "exact", head: true }).eq("booking_status", "pending_admin_confirmation"),
        sup.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);

      const items = [];
      if ((pendingReqRes.count ?? 0) > 0) items.push({ label: `${pendingReqRes.count} pending session request${pendingReqRes.count !== 1 ? 's' : ''}`, to: "/admin/booking-queue" });
      if ((appRes.count ?? 0) > 0) items.push({ label: `${appRes.count} mentor application${appRes.count !== 1 ? 's' : ''} waiting for review`, to: "/admin/mentor-applications" });
      if ((demoRes.count ?? 0) > 0) items.push({ label: `${demoRes.count} pending demo confirmation${demoRes.count !== 1 ? 's' : ''}`, to: "/admin/demo-queue" });
      if ((ticketRes.count ?? 0) > 0) items.push({ label: `${ticketRes.count} unresolved support ticket${ticketRes.count !== 1 ? 's' : ''}`, to: "/admin/support-tickets" });
      return items;
    },
  });

  // ── Booking Attention Center Query ───────────────────────────────────────
  const bookingAttentionQuery = useQuery({
    queryKey: ["admin-dashboard", "booking-attention"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await fetch("/api/admin/booking/attention");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load attention center");
      return json as {
        success: boolean;
        counts: Record<string, number>;
        attentionItems: Array<{ level: string; label: string; action: string }>;
        expiringRequests: any[];
        upcomingConfirmed: any[];
        noMentorBookings: any[];
      };
    },
    refetchInterval: 30000,
  });

  // ── Today's Operations Query ─────────────────────────────────────────────
  const todayOpsQuery = useQuery({
    queryKey: ["admin-dashboard", "today-ops"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await sup
        .from("sessions")
        .select("status")
        .gte("scheduled_time", startOfDay.toISOString())
        .lte("scheduled_time", endOfDay.toISOString());
      const sessions = data ?? [];
      return {
        total: sessions.length,
        pending: sessions.filter((s: any) => s.status === "pending" || s.status === "pending_admin_assignment" || s.status === "pending_mentor_response").length,
        confirmed: sessions.filter((s: any) => s.status === "confirmed" || s.status === "accepted").length,
        completed: sessions.filter((s: any) => s.status === "completed").length,
        cancelled: sessions.filter((s: any) => s.status === "cancelled" || s.status === "rejected").length,
        noShow: sessions.filter((s: any) => s.status === "no_show").length,
      };
    },
  });

  // ── Upcoming Sessions Query ──────────────────────────────────────────────
  const upcomingSessionsQuery = useQuery({
    queryKey: ["admin-dashboard", "upcoming-sessions"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await sup
        .from("sessions")
        .select("id, student_id, mentor_id, scheduled_time, duration_mins, status, gig_id")
        .gte("scheduled_time", new Date().toISOString())
        .in("status", ["confirmed", "accepted", "pending_mentor_response", "pending_admin_assignment"])
        .order("scheduled_time", { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  // ── Mentor Overview Query ────────────────────────────────────────────────
  const mentorOverviewQuery = useQuery({
    queryKey: ["admin-dashboard", "mentor-overview"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: mentors } = await sup
        .from("mentor_profiles")
        .select("is_active, is_verified");
      const mentorsList = mentors ?? [];
      return {
        active: mentorsList.filter((m: any) => m.is_active).length,
        pending: mentorsList.filter((m: any) => !m.is_active).length,
        verified: mentorsList.filter((m: any) => m.is_verified).length,
      };
    },
  });

  // ── Student Overview Query ───────────────────────────────────────────────
  const studentOverviewQuery = useQuery({
    queryKey: ["admin-dashboard", "student-overview"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: students } = await sup.from("profiles").select("id");
      const studentIds = (students ?? []).map((s: any) => s.id);
      if (studentIds.length === 0) return { total: 0, withSub: 0, withoutSub: 0, withUpcoming: 0 };

      const { data: subs } = await sup
        .from("student_subscriptions")
        .select("user_id")
        .eq("status", "active")
        .in("user_id", studentIds);
      const subUserIds = new Set((subs ?? []).map((s: any) => s.user_id));

      const { data: upcoming } = await sup
        .from("sessions")
        .select("student_id")
        .gte("scheduled_time", new Date().toISOString())
        .in("status", ["confirmed", "accepted"])
        .in("student_id", studentIds);
      const upcomingStudentIds = new Set((upcoming ?? []).map((s: any) => s.student_id));

      return {
        total: studentIds.length,
        withSub: subUserIds.size,
        withoutSub: studentIds.length - subUserIds.size,
        withUpcoming: upcomingStudentIds.size,
      };
    },
  });

  // ── Subscription Overview Query ──────────────────────────────────────────
  const subscriptionOverviewQuery = useQuery({
    queryKey: ["admin-dashboard", "subscription-overview"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: activeSubs } = await sup
        .from("student_subscriptions")
        .select("current_session_slots, bonus_slots, expires_at")
        .eq("status", "active");
      const subs = activeSubs ?? [];
      const totalRemaining = subs.reduce((sum: number, s: any) => sum + (s.current_session_slots ?? 0) + (s.bonus_slots ?? 0), 0);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringSoon = subs.filter((s: any) => s.expires_at && new Date(s.expires_at) <= thirtyDaysFromNow && new Date(s.expires_at) >= now).length;

      const { data: payments } = await sup
        .from("payment_orders")
        .select("final_amount, completed_at")
        .eq("payment_status", "completed")
        .eq("order_type", "subscription")
        .gte("completed_at", startOfDay.toISOString())
        .lte("completed_at", endOfDay.toISOString());
      const todayRevenue = (payments ?? []).reduce((sum: number, p: any) => sum + (p.final_amount ?? 0), 0);

      return {
        active: subs.length,
        totalRemaining,
        expiringSoon,
        todayRevenue,
      };
    },
  });

  // ── Live Activity Query ──────────────────────────────────────────────────
  const activityQuery = useQuery({
    queryKey: ["admin-dashboard", "activity"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await sup
        .from("audit_logs")
        .select("action, description, created_at, actor_name")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  // ── Recent Applications Query ────────────────────────────────────────────
  const recentApplicationsQuery = useQuery({
    queryKey: ["admin-dashboard", "recent-applications"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await sup
        .from("mentor_applications")
        .select("id, full_name, email, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // ── Realtime Subscriptions ───────────────────────────────────────────────
  useRealtimeSubscription({
    channel: "admin-dashboard-requests",
    table: "session_requests",
    event: "*",
    onInsert: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
    onUpdate: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
    onDelete: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
  });

  useRealtimeSubscription({
    channel: "admin-dashboard-applications",
    table: "mentor_applications",
    event: "*",
    onInsert: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
    onUpdate: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
    onDelete: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
  });

  useRealtimeSubscription({
    channel: "admin-dashboard-tickets",
    table: "support_tickets",
    event: "*",
    onInsert: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
    onUpdate: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
    onDelete: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
  });

  useRealtimeSubscription({
    channel: "admin-dashboard-demos",
    table: "demo_session_bookings",
    event: "*",
    onInsert: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
    onUpdate: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
    onDelete: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
  });

  useRealtimeSubscription({
    channel: "admin-dashboard-sessions",
    table: "sessions",
    event: "UPDATE",
    onUpdate: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
  });

  useRealtimeSubscription({
    channel: "admin-dashboard-subscriptions",
    table: "student_subscriptions",
    event: "*",
    onInsert: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
    onUpdate: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
    onDelete: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
  });

  useRealtimeSubscription({
    channel: "admin-dashboard-audit",
    table: "audit_logs",
    event: "INSERT",
    onInsert: () => { qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
  });

  const [realtimeConnected, setRealtimeConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const channel = sup.channel("admin-dashboard-status");
    channel.subscribe((status: any) => {
      if (!mounted) return;
      setRealtimeConnected(status === "SUBSCRIBED");
    });
    return () => {
      mounted = false;
      sup.removeChannel(channel);
    };
  }, []);

  async function handleRefresh() {
    await qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    toast.success("Dashboard refreshed");
  }

  if (!auth?.user)
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Access denied — admin role required.</p>
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Pending Requests",
      value: pendingRequestsQuery.data ?? 0,
      description: "Needs attention",
      icon: Inbox,
      color: "text-amber-600",
      bg: "bg-amber-50",
      link: "/admin/booking-queue",
      attention: (pendingRequestsQuery.data ?? 0) > 0,
    },
    {
      title: "Active Mentors",
      value: activeMentorsQuery.data ?? 0,
      description: "Approved mentors",
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-50",
      link: "/admin/mentor-applications",
    },
    {
      title: "Total Students",
      value: totalStudentsQuery.data ?? 0,
      description: "Registered students",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/5",
      link: "/admin/students",
    },
    {
      title: "Today's Sessions",
      value: todaySessionsQuery.data ?? 0,
      description: "Scheduled today",
      icon: CalendarDays,
      color: "text-blue-600",
      bg: "bg-blue-50",
      link: "/admin/booking-queue",
    },
    {
      title: "Active Subscriptions",
      value: activeSubscriptionsQuery.data ?? 0,
      description: "Current plans",
      icon: CreditCard,
      color: "text-purple-600",
      bg: "bg-purple-50",
      link: "/admin/subscription-management",
    },
    {
      title: "Demo Queue",
      value: demoQueueQuery.data ?? 0,
      description: "Pending trials",
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
      link: "/admin/demo-queue",
      attention: (demoQueueQuery.data ?? 0) > 0,
    },
    {
      title: "Support Tickets",
      value: supportTicketsQuery.data ?? 0,
      description: "Open tickets",
      icon: MessageSquare,
      color: "text-red-600",
      bg: "bg-red-50",
      link: "/admin/support-tickets",
      attention: (supportTicketsQuery.data ?? 0) > 0,
    },
    {
      title: "Sessions Completed",
      value: sessionsCompletedQuery.data ?? 0,
      description: "Today",
      icon: Video,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      link: "/admin/analytics",
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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor your platform, bookings, mentors and students in real time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
              {realtimeConnected === true ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Live</span>
                </>
              ) : realtimeConnected === false ? (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">Offline</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Connecting</span>
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <KPICard {...stat} />
            </motion.div>
          ))}
        </div>

        {/* Booking Attention Center */}
        {/* <Section title="Booking Attention Center" description="Real-time booking queue status">
          {bookingAttentionQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : bookingAttentionQuery.error ? (
            <SectionError message={bookingAttentionQuery.error.message} onRetry={() => bookingAttentionQuery.refetch()} />
          ) : (() => {
            const data = bookingAttentionQuery.data;
            if (!data) return null;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
                  {[
                    { label: "Awaiting mentor", value: data.counts?.awaitingMentor ?? 0, color: "text-red-600", bg: "bg-red-50" },
                    { label: "Mentor assigned", value: data.counts?.mentorAssigned ?? 0, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Confirmed", value: data.counts?.confirmed ?? 0, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Completed", value: data.counts?.completed ?? 0, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Cancelled", value: data.counts?.cancelled ?? 0, color: "text-slate-600", bg: "bg-slate-50" },
                    { label: "No-show", value: data.counts?.noShow ?? 0, color: "text-orange-600", bg: "bg-orange-50" },
                    { label: "Expiring requests", value: data.counts?.expiringRequests ?? 0, color: "text-red-600", bg: "bg-red-50" },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-lg border p-3 ${item.bg}`}>
                      <div className={`text-2xl font-display ${item.color}`}>{item.value}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.label}</div>
                    </div>
                  ))}
                </div> */}

                {/* {data.attentionItems?.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Attention Required</div>
                    {data.attentionItems.map((item: any, idx: number) => (
                      <div key={idx} className={`flex items-center justify-between rounded-lg border p-3 ${
                        item.level === "critical" ? "border-red-200 bg-red-50/50" :
                        item.level === "warning" ? "border-amber-200 bg-amber-50/50" :
                        "border-blue-200 bg-blue-50/50"
                      }`}>
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-xs text-muted-foreground ml-4">{item.action}</span>
                      </div>
                    ))}
                  </div>
                )} */}

                {/* {(data.noMentorBookings?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">No Eligible Mentor</div>
                    {data.noMentorBookings.slice(0, 5).map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/30 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{b.topic || "Session"}</div>
                          <div className="text-xs text-muted-foreground">{b.language || "No language"}</div>
                        </div>
                        <Badge variant="secondary">Needs manual review</Badge>
                      </div>
                    ))}
                  </div>
                )} */}

                {/* {(data.expiringRequests?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Expiring Mentor Requests</div>
                    {data.expiringRequests.slice(0, 5).map((req: any) => (
                      <div key={req.id} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/30 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">Request to mentor {(req as any).mentor_id?.slice(0, 8)}...</div>
                          <div className="text-xs text-muted-foreground">
                            Expires: {new Date((req as any).response_deadline).toLocaleTimeString()}
                          </div>
                        </div>
                        <Badge variant="destructive">Expiring soon</Badge>
                      </div>
                    ))}
                  </div>
                )} */}

                {/* {(!data.attentionItems?.length &&
                  !data.noMentorBookings?.length &&
                  !data.expiringRequests?.length) && (
                  <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 text-green-500" />
                    <p className="text-sm">All bookings are in good shape.</p>
                  </div>
                )}
              </div>
            );
          })()}
        </Section> */}

        {/* Needs Attention + Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Needs Your Attention" description="Items requiring admin action">
            {attentionItemsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : attentionItemsQuery.error ? (
              <SectionError message={attentionItemsQuery.error.message} onRetry={() => attentionItemsQuery.refetch()} />
            ) : attentionItemsQuery.data?.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                <ShieldCheck className="h-8 w-8" />
                <p>You're all caught up.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attentionItemsQuery.data?.map((item, idx) => (
                  <Link key={idx} to={item.to}>
                    <div className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50 cursor-pointer">
                      <span className="text-sm font-medium">{item.label}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title="Quick Actions" description="Common admin tasks">
            <div className="grid gap-3">
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/booking-queue">
                  <Inbox className="mr-2 h-4 w-4" />
                  Assign Session Request
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/mentor-applications">
                  <FileText className="mr-2 h-4 w-4" />
                  Review Mentor Applications
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/mentors">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Mentors
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/students">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Manage Students
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/demo-queue">
                  <Clock className="mr-2 h-4 w-4" />
                  Manage Demo Queue
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/subscription-management">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Subscriptions
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/support-tickets">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  View Support Tickets
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/notification-broadcasts">
                  <Bell className="mr-2 h-4 w-4" />
                  Send Notification
                </Link>
              </Button>
            </div>
          </Section>
        </div>

        {/* Today's Operations + Upcoming Sessions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Today's Operations" description="Session status breakdown for today">
            {todayOpsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : todayOpsQuery.error ? (
              <SectionError message={todayOpsQuery.error.message} onRetry={() => todayOpsQuery.refetch()} />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  { label: "Total", value: todayOpsQuery.data?.total ?? 0, color: "text-slate-700" },
                  { label: "Pending", value: todayOpsQuery.data?.pending ?? 0, color: "text-amber-600" },
                  { label: "Confirmed", value: todayOpsQuery.data?.confirmed ?? 0, color: "text-green-600" },
                  { label: "Completed", value: todayOpsQuery.data?.completed ?? 0, color: "text-blue-600" },
                  { label: "Cancelled", value: todayOpsQuery.data?.cancelled ?? 0, color: "text-red-600" },
                  { label: "No-show", value: todayOpsQuery.data?.noShow ?? 0, color: "text-gray-500" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border p-3 text-center">
                    <div className={`text-2xl font-display ${item.color}`}>{item.value}</div>
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Upcoming Sessions" description="Next scheduled sessions">
            {upcomingSessionsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : upcomingSessionsQuery.error ? (
              <SectionError message={upcomingSessionsQuery.error.message} onRetry={() => upcomingSessionsQuery.refetch()} />
            ) : upcomingSessionsQuery.data?.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                <CalendarDays className="h-8 w-8" />
                <p>No upcoming sessions.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingSessionsQuery.data?.map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {session.student_id ? "Student Session" : "Session"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(session.scheduled_time)} · {formatTime(session.scheduled_time)} · {session.duration_mins} min
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge variant={session.status === "confirmed" || session.status === "accepted" ? "default" : "secondary"}>
                        {session.status}
                      </Badge>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/admin/booking-queue`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Mentor Overview + Student Overview */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Mentor Overview" description="Mentor metrics" action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/mentors">Manage Mentors</Link>
            </Button>
          }>
            {mentorOverviewQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : mentorOverviewQuery.error ? (
              <SectionError message={mentorOverviewQuery.error.message} onRetry={() => mentorOverviewQuery.refetch()} />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-display text-green-600">{mentorOverviewQuery.data?.active}</div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-display text-amber-600">{mentorOverviewQuery.data?.pending}</div>
                  <div className="text-xs text-muted-foreground">Inactive</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-display text-blue-600">{mentorOverviewQuery.data?.verified}</div>
                  <div className="text-xs text-muted-foreground">Verified</div>
                </div>
              </div>
            )}
          </Section>

          <Section title="Student Overview" description="Student metrics" action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/students">Manage Students</Link>
            </Button>
          }>
            {studentOverviewQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : studentOverviewQuery.error ? (
              <SectionError message={studentOverviewQuery.error.message} onRetry={() => studentOverviewQuery.refetch()} />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-display">{studentOverviewQuery.data?.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-display text-green-600">{studentOverviewQuery.data?.withSub}</div>
                  <div className="text-xs text-muted-foreground">With Subscription</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-display text-amber-600">{studentOverviewQuery.data?.withoutSub}</div>
                  <div className="text-xs text-muted-foreground">No Subscription</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-display text-blue-600">{studentOverviewQuery.data?.withUpcoming}</div>
                  <div className="text-xs text-muted-foreground">Upcoming Sessions</div>
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* Subscription Overview + Live Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Subscription Overview" description="Plan and revenue metrics">
            {subscriptionOverviewQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : subscriptionOverviewQuery.error ? (
              <SectionError message={subscriptionOverviewQuery.error.message} onRetry={() => subscriptionOverviewQuery.refetch()} />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-display text-green-600">{subscriptionOverviewQuery.data?.active}</div>
                  <div className="text-xs text-muted-foreground">Active Subscriptions</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-display text-blue-600">{subscriptionOverviewQuery.data?.totalRemaining}</div>
                  <div className="text-xs text-muted-foreground">Sessions Remaining</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-display text-amber-600">{subscriptionOverviewQuery.data?.expiringSoon}</div>
                  <div className="text-xs text-muted-foreground">Expiring Soon</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-display text-primary">{formatINR(subscriptionOverviewQuery.data?.todayRevenue ?? 0)}</div>
                  <div className="text-xs text-muted-foreground">Today's Revenue</div>
                </div>
              </div>
            )}
          </Section>

          <Section title="Live Activity" description="Recent platform events">
            {activityQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : activityQuery.error ? (
              <SectionError message={activityQuery.error.message} onRetry={() => activityQuery.refetch()} />
            ) : activityQuery.data?.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                <TrendingUp className="h-8 w-8" />
                <p>No recent activity.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activityQuery.data?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-start justify-between rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{item.description || item.action}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.actor_name || "System"} · {formatTimeAgo(item.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Recent Mentor Applications */}
        <Section title="Recent Mentor Applications" description="Latest 5 applications" action={
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/mentor-applications">View all</Link>
          </Button>
        }>
          {recentApplicationsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : recentApplicationsQuery.error ? (
            <SectionError message={recentApplicationsQuery.error.message} onRetry={() => recentApplicationsQuery.refetch()} />
          ) : recentApplicationsQuery.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
              <FileText className="h-8 w-8" />
              <p>No applications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentApplicationsQuery.data?.map((app: any) => (
                <div key={app.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{app.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{app.email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant={statusColors[app.status] || "secondary"}>
                      {app.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(app.created_at)}
                    </span>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/admin/mentor-applications/${encodeURIComponent(app.id)}` as any}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </AdminLayout>
  );
}
