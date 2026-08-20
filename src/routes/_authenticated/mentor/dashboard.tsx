import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/mentor/page-header";
import { MentorSectionHeader } from "@/components/mentor-design/MentorSectionHeader";
import { MentorEmptyState } from "@/components/mentor-design/MentorEmptyState";
import { MentorActionCard } from "@/components/mentor-design/MentorActionCard";
import { MentorStatCard } from "@/components/mentor-design/MentorStatCard";
import { MentorQuickAction } from "@/components/mentor-design/MentorQuickAction";
import { MentorPageContainer } from "@/components/mentor-design/MentorPageContainer";
import { MentorStatusBadge } from "@/components/mentor-design/MentorStatusBadge";
import { MentorAvatar } from "@/components/mentor-design/MentorAvatar";
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
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  GraduationCap,
  BarChart3,
  CalendarDays,
  History,
  BookOpenText,
} from "lucide-react";
import { format, isToday, parseISO, differenceInMinutes, addMinutes } from "date-fns";
import { getProfileCompletionPercent, type ProfileCompletionValues } from "@/lib/profile";
import { useAvailability } from "@/hooks/use-availability";

export const Route = createFileRoute("/_authenticated/mentor/dashboard")({
  component: MentorDashboard,
});

type ActionPriority = "urgent" | "attention" | "suggested";

interface MentorAction {
  priority: ActionPriority;
  title: string;
  description: string;
  cta: string;
  to: string;
  icon: React.ReactNode;
}

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

  const mentorActions = useMemo((): MentorAction[] => {
    const actions: MentorAction[] = [];

    if (pending.length > 0) {
      actions.push({
        priority: "urgent",
        title: `${pending.length} booking request${pending.length > 1 ? "s" : ""} need${pending.length === 1 ? "s" : ""} your response`,
        description: "Students are waiting for your confirmation.",
        cta: "Review requests",
        to: "/mentor/calendar",
        icon: <AlertTriangle className="h-4 w-4" />,
      });
    }

    const nextSoon = nextSession && differenceInMinutes(parseISO(nextSession.scheduled_time), new Date()) <= 60
      ? nextSession
      : null;
    if (nextSoon) {
      actions.push({
        priority: "urgent",
        title: `Session with ${studentMap.get(nextSoon.student_id)?.full_name || "Student"} starts soon`,
        description: `Starts in ${differenceInMinutes(parseISO(nextSoon.scheduled_time), new Date())} minutes.`,
        cta: "View session",
        to: `/mentor/session/${nextSoon.id}`,
        icon: <Video className="h-4 w-4" />,
      });
    }

    if (profileCompletion < 80 && profileCompletion > 0) {
      actions.push({
        priority: "attention",
        title: "Your profile is incomplete",
        description: `Complete your profile to help students trust you. ${profileCompletion}% done.`,
        cta: "Complete profile",
        to: "/mentor/profile",
        icon: <Target className="h-4 w-4" />,
      });
    }

    if (activeDays === 0 && totalSlots === 0 && upcoming.length === 0) {
      actions.push({
        priority: "attention",
        title: "No availability set",
        description: "Students can't book sessions without your schedule.",
        cta: "Manage availability",
        to: "/mentor/availability",
        icon: <Clock3 className="h-4 w-4" />,
      });
    }

    if (todaySessions.length === 0 && upcoming.length === 0 && pending.length === 0 && activeDays > 0) {
      actions.push({
        priority: "suggested",
        title: "Your schedule is clear today",
        description: "Consider adding a last-minute availability window.",
        cta: "Manage availability",
        to: "/mentor/availability",
        icon: <Plus className="h-4 w-4" />,
      });
    }

    return actions;
  }, [pending, nextSession, studentMap, profileCompletion, activeDays, totalSlots, todaySessions, upcoming]);

  const teachingHours = useMemo(() => {
    const mins = completed.reduce((sum, s) => sum + (s.duration_mins || 0), 0);
    return (mins / 60).toFixed(1);
  }, [completed]);

  const attendanceRate = useMemo(() => {
    const total = completed.length + todaySessions.filter((s) => s.status !== "completed").length + upcoming.length;
    if (total === 0) return null;
    return Math.round((completed.length / total) * 100);
  }, [completed, todaySessions, upcoming]);

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <MentorLayout>
      <MentorPageContainer>
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-display tracking-tight text-foreground">
              {greeting}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mentorActions.length > 0 ? "Here's what needs your attention." : "You're all caught up."}
            </p>
          </div>
          {pending.length > 0 && (
            <Button asChild>
              <Link to="/mentor/calendar">
                Review requests <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {/* Next Actions */}
        {!isLoading && mentorActions.length > 0 && (
          <section>
            <MentorSectionHeader
              title="Next actions"
              className="mb-3"
            />
            <div className="space-y-2">
              {mentorActions.map((action, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <MentorActionCard
                    priority={action.priority}
                    title={action.title}
                    description={action.description}
                    cta={action.cta}
                    to={action.to}
                    icon={action.icon}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Next Session */}
        <section>
          <MentorSectionHeader
            title="Next session"
            className="mb-4"
          />
          {isLoading ? (
            <div className="mentor-card p-6 space-y-3">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : nextSession ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mentor-card overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-display tracking-tight tabular-nums text-foreground">
                        {format(parseISO(nextSession.scheduled_time), "h:mm a")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {format(parseISO(nextSession.scheduled_time), "MMM d, yyyy")}
                      </span>
                      {differenceInMinutes(parseISO(nextSession.scheduled_time), new Date()) <= 60 && (
                        <MentorStatusBadge status="warning" label="Starts soon" />
                      )}
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
            <div className="mentor-card p-8 text-center">
              <p className="text-sm font-medium text-foreground mb-1">Your calendar is open</p>
              <p className="text-xs text-muted-foreground mb-4">
                Add availability so students can discover bookable times.
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
              <MentorSectionHeader
                title="Today's teaching flow"
                className="mb-4"
              />
              {isLoading ? (
                <div className="mentor-card p-6 space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-4 w-12 shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              ) : todaySessions.length === 0 && availabilitySlots.length === 0 ? (
                <div className="mentor-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No sessions or availability windows today.
                  </p>
                </div>
              ) : (
                <div className="mentor-card divide-y divide-border/60">
                  {todaySessions.map((session) => {
                    const start = parseISO(session.scheduled_time);
                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mentor-timeline-item"
                        onClick={() =>
                          navigate({ to: "/mentor/session/$id", params: { id: session.id } } as any)
                        }
                      >
                        <span className="text-sm font-medium text-muted-foreground tabular-nums w-16 shrink-0">
                          {format(start, "h:mm a")}
                        </span>
                        <div className="h-2 w-2 rounded-full bg-electric-iris shrink-0 mt-1.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {studentMap.get(session.student_id)?.full_name || "Student"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(session as any).gig?.title || "Session"} · {session.duration_mins} min
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground capitalize shrink-0">
                          {session.status === "accepted" || session.status === "confirmed"
                            ? "Confirmed"
                            : session.status}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            {/* Teaching Momentum */}
            <section>
              <MentorSectionHeader
                title="This week"
                className="mb-4"
              />
              <div className="mentor-card p-6">
                {completed.length === 0 && upcoming.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Momentum will appear after your first completed session.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-display tracking-tight text-foreground">
                          {upcoming.length + completed.length}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Sessions</p>
                      </div>
                      <div>
                        <p className="text-2xl font-display tracking-tight text-foreground">{studentsTaught}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Students</p>
                      </div>
                      <div>
                        <p className="text-2xl font-display tracking-tight text-foreground">
                          {attendanceRate !== null ? `${attendanceRate}%` : "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Attendance</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Teaching hours</p>
                        <p className="text-xs font-medium text-foreground">{teachingHours}h</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Quick Actions */}
            <section>
              <MentorSectionHeader
                title="Quick actions"
                className="mb-3"
              />
              <div className="mentor-card divide-y divide-border/60">
                <MentorQuickAction
                  icon={<Plus className="h-4 w-4" />}
                  label="Add availability"
                  to="/mentor/availability"
                />
                <MentorQuickAction
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Review requests"
                  to="/mentor/calendar"
                  badge={pending.length > 0 ? pending.length : undefined}
                />
                <MentorQuickAction
                  icon={<History className="h-4 w-4" />}
                  label="View sessions"
                  to="/mentor/sessions"
                />
                <MentorQuickAction
                  icon={<BookOpenText className="h-4 w-4" />}
                  label="Teaching library"
                  to="/mentor/resources"
                />
                <MentorQuickAction
                  icon={<Settings2 className="h-4 w-4" />}
                  label="Edit profile"
                  to="/mentor/profile"
                />
              </div>
            </section>
          </div>
        </div>
      </MentorPageContainer>
    </MentorLayout>
  );
}
