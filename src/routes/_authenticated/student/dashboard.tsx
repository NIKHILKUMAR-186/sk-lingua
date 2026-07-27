import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Flame, Trophy, Video, Sparkles, Star, ArrowRight, BookOpen, CheckCircle2, CalendarDays, Target, Clock } from "lucide-react";
import { getProfileCompletionPercent } from "@/lib/profile";
import { EmptyState } from "@/components/empty-state";
import { StatCardSkeleton, CardSkeleton, ListSkeleton } from "@/components/skeleton-loader";

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
    <Card className="transition hover:shadow-soft">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-display">{value}</div>
          </div>
          <Icon className={`h-8 w-8 ${colors[accent] || colors.primary}`} />
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
        .in("status", ["pending", "accepted"])
        .order("scheduled_time")
        .limit(3);
      return data ?? [];
    },
  });

  const { data: recommended = [], isLoading: recLoading } = useQuery({
    queryKey: ["recommended-mentors"],
    queryFn: async () =>
      (await supabase.from("mentor_profiles").select("user_id, headline, hourly_rate, rating_avg, languages_taught").eq("is_active", true).order("rating_avg", { ascending: false }).limit(4)).data ?? [],
  });

  const { data: resources = [], isLoading: resLoading } = useQuery({
    queryKey: ["student-dashboard-resources", userId],
    enabled: !!userId,
    queryFn: async () =>
      (await supabase.from("resources").select("*").order("created_at", { ascending: false }).limit(6)).data ?? [],
  });

  const recentResources = resources.filter(
    (r) => r.visibility === "public" || (r.visibility === "session" && r.student_id === userId)
  );
  const homeworkShared = resources.filter(
    (r) => r.visibility === "session" && r.student_id === userId
  ).length;
  const nextSession = upcoming[0];

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

  const recentSessions = upcoming.slice(0, 2);

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display">
            Welcome
            <span className="text-primary">
              {auth?.profile?.full_name ? `, ${auth.profile.full_name.split(" ")[0]}` : ""}.
            </span>
          </h1>
          <p className="text-muted-foreground">Keep the momentum going.</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          className="grid gap-4 md:grid-cols-5"
        >
          {streakLoading ? (
            Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <StatCard icon={Flame} label="Current streak" value={`${streak?.current_streak ?? 0} days`} accent="flame" />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <StatCard icon={Trophy} label="Total points" value={`${streak?.total_points ?? 0}`} accent="warning" />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <StatCard icon={Video} label="Next session" value={`${upcoming.length}`} accent="primary" />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <StatCard icon={Sparkles} label="Badges" value={`${streak?.badges?.length ?? 0}`} accent="mentor" />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <StatCard icon={Target} label="Profile" value={`${profileCompletion}%`} accent="primary" />
              </motion.div>
            </>
          )}
        </motion.div>

        {/* Main grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Upcoming sessions */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming sessions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/student/sessions">See all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingLoading ? (
                <ListSkeleton />
              ) : upcoming.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming sessions"
                  description="Book your first session to start learning."
                  actionLabel="Find a mentor"
                  onAction={() => window.location.href = "/student/explore"}
                />
              ) : (
                <div className="space-y-3">
                  {upcoming.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50">
                      <div>
                        <div className="text-sm font-medium">
                          {new Date(s.scheduled_time).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.status} • {s.duration_mins} min
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/student/session/$id" params={{ id: s.id }}>Details</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/student/explore"><Video className="mr-2 h-4 w-4" /> Find a mentor</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/student/sessions"><CalendarDays className="mr-2 h-4 w-4" /> View sessions</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/student/resources"><BookOpen className="mr-2 h-4 w-4" /> Browse resources</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/student/streak"><Flame className="mr-2 h-4 w-4" /> View streak</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Second grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recommended mentors */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recommended mentors</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/student/explore">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recLoading ? (
                <ListSkeleton items={4} />
              ) : recommended.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No recommendations yet.</div>
              ) : (
                <div className="space-y-2">
                  {recommended.map((m) => (
                    <Link
                      key={m.user_id}
                      to="/student/mentor/$id"
                      params={{ id: m.user_id }}
                      className="flex items-center justify-between rounded-lg p-2 border hover:bg-muted transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{m.headline ?? "Mentor"}</div>
                        <div className="text-xs text-muted-foreground">${Number(m.hourly_rate).toFixed(0)}/hr</div>
                      </div>
                      <span className="text-xs flex items-center gap-1">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        {Number(m.rating_avg).toFixed(1)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Continue learning */}
          <Card>
            <CardHeader>
              <CardTitle>Continue learning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>
                  {homeworkShared > 0
                    ? `${homeworkShared} shared homework item${homeworkShared > 1 ? "s" : ""} ready.`
                    : "No homework shared yet."}
                </span>
              </div>
              {nextSession ? (
                <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span>Next: {new Date(nextSession.scheduled_time).toLocaleString()}</span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-3">
                  Book your next lesson to keep the momentum going.
                </div>
              )}
              {recentSessions.length > 0 && (
                <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="text-muted-foreground">Recent activity</span>
                  <span className="font-medium">{recentSessions.length} session{recentSessions.length > 1 ? "s" : ""}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent resources */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent resources</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/student/resources">See all <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {resLoading ? (
              <ListSkeleton items={3} />
            ) : recentResources.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No resources shared yet.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {recentResources.slice(0, 4).map((resource) => (
                  <div key={resource.id} className="flex items-start gap-3 rounded-lg border p-3 transition hover:bg-muted/50">
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
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}




