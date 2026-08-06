import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Trophy, Star } from "lucide-react";
import React, { Suspense } from "react";
const StudentAnalyticsDashboard = React.lazy(
  () => import("@/components/student-analytics-dashboard"),
);

const BADGES = [
  { threshold: 100, name: "Explorer" },
  { threshold: 500, name: "Committed" },
  { threshold: 1500, name: "Fluent Learner" },
  { threshold: 5000, name: "Polyglot" },
];

export const Route = createFileRoute("/_authenticated/student/streak")({
  component: StreakPage,
});

function StreakPage() {
  const { data: auth } = useAuth();
  const { data: streak } = useQuery({
    queryKey: ["streak-full", auth?.user?.id],
    enabled: !!auth?.user,
    queryFn: async () =>
      (await supabase.from("streak_points").select("*").eq("user_id", auth!.user!.id).maybeSingle())
        .data,
  });
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("streak_points")
        .select("user_id, total_points, current_streak")
        .order("total_points", { ascending: false })
        .limit(10);
      if (!data?.length) return [];
      const ids = data.map((x) => x.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      return data.map((x) => ({ ...x, profile: byId.get(x.user_id) }));
    },
  });

  const grid = Array.from({ length: 84 }, (_, i) => {
    const daysAgo = 83 - i;
    const active = streak?.current_streak && streak.current_streak > daysAgo;
    return active;
  });

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-display">Your streak & points</h1>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6 text-center">
              <Flame className="mx-auto h-10 w-10 text-flame" />
              <div className="mt-3 text-4xl font-display">{streak?.current_streak ?? 0}</div>
              <div className="text-sm text-muted-foreground">Current streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Trophy className="mx-auto h-10 w-10 text-warning" />
              <div className="mt-3 text-4xl font-display">{streak?.total_points ?? 0}</div>
              <div className="text-sm text-muted-foreground">Total points</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Star className="mx-auto h-10 w-10 text-primary" />
              <div className="mt-3 text-4xl font-display">{streak?.longest_streak ?? 0}</div>
              <div className="text-sm text-muted-foreground">Longest streak</div>
            </CardContent>
          </Card>
        </div>
        <Suspense fallback={<div className="mb-4">Loading analytics…</div>}>
          <StudentAnalyticsDashboard />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle>Last 12 weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-1">
              {grid.map((active, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded ${active ? "bg-flame" : "bg-muted"}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              {BADGES.map((b) => {
                const unlocked = (streak?.total_points ?? 0) >= b.threshold;
                return (
                  <div
                    key={b.name}
                    className={`rounded-lg border p-4 text-center ${unlocked ? "border-primary bg-primary/5" : "opacity-50"}`}
                  >
                    <Trophy
                      className={`mx-auto h-6 w-6 ${unlocked ? "text-warning" : "text-muted-foreground"}`}
                    />
                    <div className="mt-2 text-sm font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.threshold} pts</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.map((l, i) => (
              <div
                key={l.user_id}
                className="flex items-center justify-between rounded-lg p-2 hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-mono text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="h-8 w-8 overflow-hidden rounded-full bg-muted">
                    {l.profile?.avatar_url ? (
                      <img
                        src={l.profile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <span className="text-sm font-medium">{l.profile?.full_name ?? "Learner"}</span>
                </div>
                <span className="text-sm font-semibold">{l.total_points} pts</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
