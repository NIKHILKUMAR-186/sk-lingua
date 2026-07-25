import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, Video, Sparkles, ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { getProfileCompletionPercent } from "@/lib/profile";
import React, { Suspense } from "react";
const StudentAnalyticsDashboard = React.lazy(() => import("@/components/student-analytics-dashboard"));

export const Route = createFileRoute("/_authenticated/student/dashboard")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { data: auth } = useAuth();
  const userId = auth?.user?.id;

  const { data: streak } = useQuery({
    queryKey: ["streak", userId],
    enabled: !!userId,
    queryFn: async () =>
      (await supabase.from("streak_points").select("*").eq("user_id", userId!).maybeSingle()).data,
  });
  const { data: upcoming = [] } = useQuery({
    queryKey: ["upcoming-sessions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("student_id", userId!)
        .in("status", ["pending", "accepted"])
        .order("scheduled_time")
        .limit(3);
      return data ?? [];
    },
  });
  const { data: recommended = [] } = useQuery({
    queryKey: ["recommended-mentors"],
    queryFn: async () =>
      (
        await supabase
          .from("mentor_profiles")
          .select("user_id, headline, hourly_rate, rating_avg")
          .order("rating_avg", { ascending: false })
          .limit(4)
      ).data ?? [],
  });
  const { data: resources = [] } = useQuery({
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

  const recentResources = resources.filter(
    (resource) =>
      resource.visibility === "public" ||
      (resource.visibility === "session" && resource.student_id === userId),
  );
  const homeworkShared = resources.filter(
    (resource) => resource.visibility === "session" && resource.student_id === userId,
  ).length;
  const nextSession = upcoming[0];
  const profileCompletion = getProfileCompletionPercent(
    {
      full_name: auth?.profile?.full_name,
      bio: auth?.profile?.bio,
      country: auth?.profile?.country,
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

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-6xl space-y-6">
        <Suspense fallback={<div className="mb-4">Loading analytics…</div>}>
          <StudentAnalyticsDashboard />
        </Suspense>
        <div>
          <h1 className="text-3xl font-display">
            Welcome back
            {auth?.profile?.full_name ? `, ${auth.profile.full_name.split(" ")[0]}` : ""}.
          </h1>
          <p className="text-muted-foreground">Keep the momentum going.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            icon={Flame}
            label="Current streak"
            value={`${streak?.current_streak ?? 0} days`}
            accent="flame"
          />
          <StatCard
            icon={Trophy}
            label="Total points"
            value={`${streak?.total_points ?? 0}`}
            accent="warning"
          />
          <StatCard
            icon={Video}
            label="Next session"
            value={`${upcoming.length}`}
            accent="primary"
          />
          <StatCard
            icon={Sparkles}
            label="Badges"
            value={`${streak?.badges?.length ?? 0}`}
            accent="mentor"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-display">{profileCompletion}%</div>
              <p className="text-sm text-muted-foreground">
                A complete profile helps mentors tailor your learning plan.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Continue learning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>
                  {homeworkShared > 0
                    ? `${homeworkShared} shared homework item${homeworkShared > 1 ? "s" : ""} ready to review.`
                    : "No homework shared yet for your sessions."}
                </span>
              </div>
              <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                {nextSession
                  ? `Next focus: ${new Date(nextSession.scheduled_time).toLocaleString()} • ${nextSession.duration_mins} min`
                  : "Book your next lesson to keep the momentum going."}
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/student/resources">
                  View my resources <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming sessions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/student/sessions">
                  See all <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No sessions yet.{" "}
                  <Link to="/student/explore" className="text-primary underline">
                    Find a mentor
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {new Date(s.scheduled_time).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.status} • {s.duration_mins} min
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/student/sessions">Details</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent resources</CardTitle>
              <Button className="lg:col-span-2" variant="ghost" size="sm" asChild>
                <Link to="/student/resources">
                  See all <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentResources.length === 0 ? (
                <div className="text-sm text-muted-foreground">No shared resources yet.</div>
              ) : (
                recentResources.slice(0, 4).map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{resource.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {resource.visibility === "session" ? "Session shared" : "Public"}
                      </div>
                    </div>
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recommended mentor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommended.map((m) => (
                <Link
                  key={m.user_id}
                  to="/student/mentor/$id"
                  params={{ id: m.user_id }}
                  className="flex items-center justify-between rounded-lg p-2 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{m.headline ?? "Mentor"}</div>
                    <div className="text-xs text-muted-foreground">
                      ${Number(m.hourly_rate).toFixed(0)}/hr
                    </div>
                  </div>
                  <span className="text-xs">★ {Number(m.rating_avg).toFixed(1)}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: string;
}) {
  const colors: Record<string, string> = {
    flame: "text-flame",
    warning: "text-warning",
    primary: "text-primary",
    mentor: "text-mentor",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-display">{value}</div>
          </div>
          <Icon className={`h-8 w-8 ${colors[accent]}`} />
        </div>
      </CardContent>
    </Card>
  );
}
