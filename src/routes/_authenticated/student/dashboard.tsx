import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Video,
  Sparkles,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  Target,
  Wallet,
  TrendingUp,
  GraduationCap,
  Crown,
} from "lucide-react";
import { getProfileCompletionPercent } from "@/lib/profile";
import { EmptyState } from "@/components/empty-state";
import { StatCardSkeleton, CardSkeleton, ListSkeleton } from "@/components/skeleton-loader";
import { useStudentSubscription, useRemainingSlots } from "@/hooks/use-subscriptions";
import { useUpcomingDemoBooking, useHasUsedDemoSession } from "@/hooks/use-demo-bookings";
import { useStudentLearningState } from "@/hooks/use-student-learning-state";
import { DemoCtaCard } from "@/components/demo-cta-card";
import { format, isToday, isTomorrow, addDays } from "date-fns";

const SESSION_STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Requested", variant: "secondary" },
  accepted: { label: "Confirmed", variant: "default" },
  confirmed: { label: "Confirmed", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  rejected: { label: "Not available", variant: "destructive" },
  pending_admin_assignment: { label: "Awaiting confirmation", variant: "secondary" },
  pending_mentor_response: { label: "Mentor confirmation pending", variant: "secondary" },
};

function SessionCard({
  session,
  mentor,
}: {
  session: any;
  mentor?: { full_name?: string | null } | null;
}) {
  const sessionDate = new Date(session.scheduled_time);
  const dateLabel = isToday(sessionDate)
    ? "Today"
    : isTomorrow(sessionDate)
      ? "Tomorrow"
      : format(sessionDate, "d MMM");

  const statusInfo = SESSION_STATUS_LABELS[session.status] || { label: "Scheduled", variant: "secondary" as const };

  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={statusInfo.variant}>
                {statusInfo.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{dateLabel}</span>
            </div>
            <div className="font-medium">
              {format(sessionDate, "h:mm a")} · {session.duration_mins ?? 30} min
            </div>
            {mentor?.full_name && (
              <div className="text-sm text-muted-foreground">with {mentor.full_name}</div>
            )}
            {session.student_message && (
              <div className="text-sm text-muted-foreground line-clamp-1">
                &ldquo;{session.student_message}&rdquo;
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/student/session/$id" params={{ id: session.id }}>
              View
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute("/_authenticated/student/dashboard")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { data: auth } = useAuth();
  const userId = auth?.user?.id;

  const { data: subscription, isLoading: subLoading } = useStudentSubscription(userId ?? null);
  const { data: remainingSlots = 0 } = useRemainingSlots(userId ?? null);
  const { data: upcomingDemo } = useUpcomingDemoBooking(userId ?? null);
  const { data: demoUsage = { used: false } } = useHasUsedDemoSession(userId ?? null);

  const { data: streak, isLoading: streakLoading } = useQuery({
    queryKey: ["streak", userId],
    enabled: !!userId,
    queryFn: async () =>
      (await supabase.from("streak_points").select("*").eq("user_id", userId!).maybeSingle()).data,
  });

  const { data: upcoming = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ["upcoming-sessions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("student_id", userId!)
        .in("status", ["pending", "accepted", "confirmed"])
        .order("scheduled_time")
        .limit(3);
      return data ?? [];
    },
  });

  const { data: pastSessions = 0 } = useQuery<number>({
    queryKey: ["past-sessions-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("student_id", userId!)
        .eq("status", "completed");
      return (count ?? 0) as number;
    },
  });

  const mentorIds = [...new Set(upcoming.map((s) => s.mentor_id).filter(Boolean))];
  const { data: mentors = [] } = useQuery({
    queryKey: ["dashboard-mentors", mentorIds.join(",")],
    enabled: !!userId && mentorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", mentorIds);
      return data ?? [];
    },
  });
  const mentorById = new Map((mentors ?? []).map((m) => [m.id, m]));

  const { data: resources = [], isLoading: resLoading } = useQuery({
    queryKey: ["student-dashboard-resources", userId],
    enabled: !!userId,
    queryFn: async () =>
      (
        await supabase
          .from("resources")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6)
      ).data ?? [],
  });

  const nextSession = upcoming[0];
  const hasSubscription = Boolean(subscription?.status === "active");
  const remainingSessionCount = subscription?.current_session_slots ?? remainingSlots;
  const totalSessionCount = subscription?.total_session_slots ?? 0;

  const profileCompletion = getProfileCompletionPercent(
    {
      full_name: auth?.profile?.full_name,
      bio: auth?.profile?.bio,
      state: auth?.profile?.state,
      timezone: auth?.profile?.timezone,
      native_language: auth?.profile?.native_language,
      learning_goal: auth?.profile?.learning_goal,
      target_language: auth?.profile?.target_language,
      current_level: auth?.profile?.current_level,
      interests: auth?.profile?.interests,
      avatar_url: auth?.profile?.avatar_url,
      cover_url: auth?.profile?.cover_url,
      linkedin_url: auth?.profile?.linkedin_url,
      github_url: auth?.profile?.github_url,
    },
    "student",
  );

  const learningState = useStudentLearningState();
  const demoUsed = Boolean(demoUsage.used);

  const hasUpcomingSession = upcoming.length > 0;
  const hasPendingDemo = !demoUsed && Boolean(upcomingDemo);

  // Primary action hierarchy:
  // 1. Upcoming session (highest priority — immediate action)
  // 2. Pending demo (next priority — needs attention)
  // 3. Book demo (if demo not yet used)
  // 4. Subscription/learning state actions
  let primaryAction: { label: string; to: string; description: string } | null = null;
  if (hasUpcomingSession) {
    primaryAction = {
      label: "Prepare for Session",
      to: `/student/session/${upcoming[0].id}`,
      description: `Your next session is ${format(new Date(upcoming[0].scheduled_time), "d MMM")}`,
    };
  } else if (hasPendingDemo) {
    primaryAction = {
      label: "Demo Status",
      to: "/student/sessions",
      description: "Your demo request is being processed",
    };
  } else if (!demoUsed) {
    primaryAction = {
      label: "Book a Demo",
      to: "/student/demo-session",
      description: "Start with a personalized demo session",
    };
  } else if (learningState.state === "TRIAL_COMPLETED_NO_SUBSCRIPTION") {
    primaryAction = {
      label: "View Plans",
      to: "/student/pricing",
      description: "Your demo is complete — choose a plan to continue",
    };
  } else if (hasSubscription && remainingSessionCount > 0) {
    primaryAction = {
      label: "Book a Session",
      to: "/student/book-session",
      description: `${remainingSessionCount} sessions remaining`,
    };
  } else if (hasSubscription && remainingSessionCount === 0) {
    primaryAction = {
      label: "Renew Plan",
      to: "/student/pricing",
      description: "Your session wallet is empty",
    };
  } else {
    primaryAction = {
      label: "Find a Mentor",
      to: "/student/explore",
      description: "Browse mentors and book your first session",
    };
  }

  const recentResources = resources.filter(
    (r) => r.visibility === "public" || (r.visibility === "session" && r.student_id === userId),
  );
  const homeworkShared = resources.filter(
    (r) => r.visibility === "session" && r.student_id === userId,
  ).length;

  // Calculate weeks of learning remaining
  const sessionsPerWeek =
    typeof pastSessions === "number" && pastSessions > 0
      ? Math.max(1, Math.round(pastSessions / 4))
      : 1;
  const weeksRemaining =
    remainingSessionCount > 0 && sessionsPerWeek > 0
      ? Math.round(remainingSessionCount / sessionsPerWeek)
      : null;

  return (
    <StudentLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Greeting + Primary Action */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display tracking-tight">
            Good {isToday(new Date()) ? "morning" : "evening"}
            {auth?.profile?.full_name ? `, ${auth.profile.full_name.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-1 text-muted-foreground">Keep your learning moving.</p>
        </motion.div>

        {/* Demo State Card */}
        {hasPendingDemo && !hasUpcomingSession && (
          <DemoCtaCard
            hasDemoBooking={Boolean(upcomingDemo)}
            demoStatus={upcomingDemo?.booking_status}
            demoUsed={demoUsed}
          />
        )}

        {/* Primary Action Card */}
        {primaryAction && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    {upcoming.length > 0 ? (
                      <CalendarDays className="h-6 w-6 text-primary" />
                    ) : (
                      <Target className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{primaryAction.label}</h3>
                    <p className="text-sm text-muted-foreground">{primaryAction.description}</p>
                  </div>
                </div>
                <Button asChild size="lg" className="shrink-0 gap-2">
                  <Link to={primaryAction.to}>
                    {primaryAction.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Upcoming Session — takes 2 columns */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold">Upcoming Session</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/student/sessions">
                    All sessions <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
              {upcomingLoading ? (
                <ListSkeleton items={2} />
              ) : upcoming.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60">
                    <CalendarDays className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm text-muted-foreground">No upcoming sessions</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Book a session to start learning
                  </p>
                  <Button variant="outline" size="sm" asChild className="mt-3">
                    <Link to="/student/explore">Find a mentor</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.slice(0, 2).map((s) => (
                    <SessionCard key={s.id} session={s} mentor={mentorById.get(s.mentor_id)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Wallet */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Session Wallet</h2>
              </div>
              {subLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-24 rounded" />
                  <Skeleton className="h-2 w-full rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
              ) : hasSubscription ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-primary">{remainingSessionCount}</div>
                    <div className="text-xs text-muted-foreground">sessions remaining</div>
                  </div>
                  <Progress
                    value={
                      totalSessionCount > 0
                        ? ((totalSessionCount - remainingSessionCount) / totalSessionCount) * 100
                        : 0
                    }
                    className="h-1.5"
                  />
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Used</span>
                      <span>{totalSessionCount - remainingSessionCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total</span>
                      <span>{totalSessionCount}</span>
                    </div>
                    {subscription?.expires_at && (
                      <div className="flex justify-between">
                        <span>Expires</span>
                        <span>{format(new Date(subscription.expires_at), "d MMM yyyy")}</span>
                      </div>
                    )}
                    {weeksRemaining !== null && (
                      <div className="flex justify-between">
                        <span>Pace</span>
                        <span>~{weeksRemaining} weeks remaining</span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to="/student/subscriptions">Manage subscription</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">No active subscription</p>
                  <p className="text-xs text-muted-foreground">
                    Purchase a plan to start booking sessions
                  </p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to="/student/pricing">Browse plans</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Second Row: Continue Learning + Mentor Relationship */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Continue Learning */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Continue Learning</h2>
              </div>
              <div className="space-y-3">
                {homeworkShared > 0 && (
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {homeworkShared} homework item{homeworkShared > 1 ? "s" : ""} ready
                      </div>
                      <div className="text-xs text-muted-foreground">From your last session</div>
                    </div>
                  </div>
                )}
                {recentResources.length > 0 && (
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{recentResources[0].title}</div>
                      <div className="text-xs text-muted-foreground">Latest resource</div>
                    </div>
                  </div>
                )}
                {homeworkShared === 0 && recentResources.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">
                    No pending learning materials. Resources will appear here after your sessions.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mentor Relationship / Discovery */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">
                  {upcoming.length > 0 ? "Your Mentor" : "Find a Mentor"}
                </h2>
              </div>
              {upcoming.length > 0 && upcoming[0].mentor_id ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    You have {upcoming.length} upcoming session
                    {upcoming.length !== 1 ? "s" : ""} with your mentor
                  </p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to="/student/sessions">View sessions</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Discover mentors who match your learning goals
                  </p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to="/student/explore">Browse mentors</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Completion Prompt */}
        {profileCompletion < 100 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Profile {profileCompletion}% complete</p>
                    <p className="text-xs text-muted-foreground">
                      Complete your profile to get better mentor recommendations.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link to="/student/student-settings">Complete profile</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Resources */}
        {recentResources.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold">Recent Resources</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/student/resources">
                    All resources <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {recentResources.slice(0, 4).map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-start gap-3 rounded-lg border p-3 transition hover:bg-muted/50"
                  >
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{resource.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {resource.visibility === "session" ? "Session shared" : "Public"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}
