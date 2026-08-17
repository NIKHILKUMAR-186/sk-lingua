import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/mentor/page-header";
import { TimelineItem } from "@/components/mentor/timeline-item";
import { MentorEmptyState } from "@/components/mentor/mentor-empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Calendar,
  Video,
  Clock3,
  ShieldAlert,
  ArrowRight,
  Plus,
  BookOpen,
  Settings2,
  Target,
  Flame,
  Users,
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { getProfileCompletionPercent, type ProfileCompletionValues } from "@/lib/profile";
import { useAvailability } from "@/hooks/use-availability";

export const Route = createFileRoute("/_authenticated/mentor/dashboard")({
  component: MentorDashboard,
});

function MentorDashboard() {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const uid = auth?.user?.id;
  const firstName = auth?.profile?.full_name?.split(" ")[0] ?? "Mentor";

  useEffect(() => {
    if (auth && (auth.roles ?? []).includes("mentor_pending")) {
      navigate({ to: "/mentor/pending" });
    }
  }, [auth, navigate]);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["mentor-sessions", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("sessions")
          .select("*")
          .eq("mentor_id", uid!)
          .order("scheduled_time", { ascending: false })
      ).data ?? [],
  });

  const { data: mp, isLoading: mpLoading } = useQuery({
    queryKey: ["mp", uid],
    enabled: !!uid,
    queryFn: async () =>
      (await supabase.from("mentor_profiles").select("*").eq("user_id", uid!).maybeSingle()).data,
  });

  const { slots: availabilitySlots = [], isLoading: availabilityLoading } = useAvailability(uid);

  const studentIds = useMemo(
    () => [...new Set(sessions.map((s) => s.student_id).filter(Boolean))],
    [sessions],
  );
  const { data: students = [] } = useQuery({
    queryKey: ["mentor-session-students", studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").in("id", studentIds);
      return data ?? [];
    },
  });
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["mentor-reviews", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("reviews")
          .select("*")
          .eq("mentor_id", uid!)
          .order("created_at", { ascending: false })
          .limit(3)
      ).data ?? [],
  });

  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ["mentor-dashboard-resources", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("resources")
          .select("*")
          .eq("mentor_id", uid!)
          .order("created_at", { ascending: false })
          .limit(4)
      ).data ?? [],
  });

  const pending = sessions.filter((s) => s.status === "pending");
  const upcoming = sessions.filter((s) => s.status === "accepted" || s.status === "confirmed");
  const completed = sessions.filter((s) => s.status === "completed");
  const todaySessions = sessions.filter((s) => {
    const scheduled = parseISO(s.scheduled_time);
    return isToday(scheduled);
  });
  const studentsTaught = new Set(completed.map((s) => s.student_id).filter(Boolean)).size;
  const homeworkShared = resources.filter((r) => r.session_id).length;

  const nextSession = upcoming.length > 0 ? upcoming[0] : null;

  const activeDays = useMemo(() => {
    const grouped: Record<string, boolean> = {};
    (availabilitySlots ?? []).forEach((s: any) => {
      if (s.is_available !== false) {
        grouped[s.day_of_week] = true;
      }
    });
    return Object.keys(grouped).length;
  }, [availabilitySlots]);

  const totalSlots = useMemo(() => (availabilitySlots ?? []).length, [availabilitySlots]);

  const profileCompletion = getProfileCompletionPercent(
    {
      ...(mp ?? {}),
      ...(auth?.profile ?? {}),
    } as ProfileCompletionValues,
    "mentor",
  );

  const isLoading = sessionsLoading || mpLoading || reviewsLoading || resourcesLoading;

  const isApprovedMentor = (auth?.roles ?? []).includes("mentor");
  if (!isApprovedMentor) {
    return (
      <MentorLayout>
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="max-w-md text-center space-y-4">
            <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
            <h1 className="text-2xl font-display">Access Restricted</h1>
            <p className="text-sm text-muted-foreground">
              The mentor dashboard is only available to approved mentors. If you&apos;ve applied to
              become a mentor, please check your application status.
            </p>
            <Button asChild>
              <Link to="/mentor/application">Check Application Status</Link>
            </Button>
          </div>
        </div>
      </MentorLayout>
    );
  }

  return (
    <MentorLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeader
          title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${firstName}`}
          description="Here&apos;s what needs your attention today."
          action={
            pending.length > 0 ? (
              <Button asChild>
                <Link to="/mentor/calendar">
                  Review requests <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : undefined
          }
        />

        {/* Next Session — primary focus */}
        <section>
          <h2 className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground mb-4">
            Next session
          </h2>
          {isLoading ? (
            <div className="rounded-xl border border-border/60 bg-card p-6">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : nextSession ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/60 bg-card overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-display tracking-tight tabular-nums">
                        {format(parseISO(nextSession.scheduled_time), "h:mm a")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {format(parseISO(nextSession.scheduled_time), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {studentMap.get(nextSession.student_id)?.full_name || "Student"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {(nextSession as any).gig?.title || "Session"} · {nextSession.duration_mins} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate({ to: "/mentor/session/$id", params: { id: nextSession.id } } as any)
                      }
                    >
                      Prepare
                    </Button>
                    {nextSession.video_call_link && (
                      <Button
                        onClick={() => window.open(nextSession.video_call_link!, "_blank")}
                      >
                        <Video className="mr-1.5 h-4 w-4" />
                        Open session
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
              <p className="text-sm font-medium text-foreground mb-1">Your day is clear</p>
              <p className="text-xs text-muted-foreground mb-4">
                No sessions scheduled today.
              </p>
              <Button variant="outline" asChild>
                <Link to="/mentor/availability">Manage availability</Link>
              </Button>
            </div>
          )}
        </section>

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Teaching Flow */}
            <section>
              <h2 className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground mb-4">
                Today&apos;s teaching flow
              </h2>
              {isLoading ? (
                <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-4 w-12 shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              ) : todaySessions.length === 0 && availabilitySlots.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No sessions or availability windows today.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
                  {todaySessions.map((session) => {
                    const start = parseISO(session.scheduled_time);
                    return (
                      <div
                        key={session.id}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-accent/10 transition-colors cursor-pointer"
                        onClick={() =>
                          navigate({ to: "/mentor/session/$id", params: { id: session.id } } as any)
                        }
                      >
                        <span className="text-sm font-medium text-muted-foreground tabular-nums w-16 shrink-0">
                          {format(start, "h:mm a")}
                        </span>
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {studentMap.get(session.student_id)?.full_name || "Student"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(session as any).gig?.title || "Session"} · {session.duration_mins} min
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {session.status === "accepted" || session.status === "confirmed"
                            ? "Confirmed"
                            : session.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            {/* Teaching Momentum */}
            <section>
              <h2 className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground mb-4">
                This week
              </h2>
              <div className="rounded-xl border border-border/60 bg-card p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-display tracking-tight">
                      {upcoming.length + completed.length}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Sessions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-display tracking-tight">{studentsTaught}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Students</p>
                  </div>
                  <div>
                    <p className="text-2xl font-display tracking-tight">
                      {completed.length > 0
                        ? `${Math.round((completed.length / (completed.length + todaySessions.filter((s) => s.status !== "completed").length + upcoming.length)) * 100)}%`
                        : "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Attendance</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">Teaching momentum</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(profileCompletion, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section>
              <h2 className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground mb-4">
                Quick actions
              </h2>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-2.5 px-4"
                  asChild
                >
                  <Link to="/mentor/availability">
                    <Plus className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Add availability</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-2.5 px-4"
                  asChild
                >
                  <Link to="/mentor/calendar">
                    <Clock3 className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Review requests</span>
                    {pending.length > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {pending.length}
                      </span>
                    )}
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-2.5 px-4"
                  asChild
                >
                  <Link to="/mentor/sessions">
                    <Video className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">View sessions</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-2.5 px-4"
                  asChild
                >
                  <Link to="/mentor/resources">
                    <BookOpen className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Teaching library</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-2.5 px-4"
                  asChild
                >
                  <Link to="/mentor/profile">
                    <Settings2 className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Edit profile</span>
                  </Link>
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </MentorLayout>
  );
}
