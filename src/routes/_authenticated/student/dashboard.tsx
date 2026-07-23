import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, Video, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/dashboard")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { data: auth } = useAuth();
  const userId = auth?.user?.id;

  const { data: streak } = useQuery({
    queryKey: ["streak", userId], enabled: !!userId,
    queryFn: async () => (await supabase.from("streak_points").select("*").eq("user_id", userId!).maybeSingle()).data,
  });
  const { data: upcoming = [] } = useQuery({
    queryKey: ["upcoming-sessions", userId], enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("sessions").select("*").eq("student_id", userId!).in("status", ["pending","accepted"]).order("scheduled_time").limit(3);
      return data ?? [];
    },
  });
  const { data: recommended = [] } = useQuery({
    queryKey: ["recommended-mentors"],
    queryFn: async () => (await supabase.from("mentor_profiles").select("user_id, headline, hourly_rate, rating_avg").order("rating_avg", { ascending: false }).limit(4)).data ?? [],
  });

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Welcome back{auth?.profile?.full_name ? `, ${auth.profile.full_name.split(" ")[0]}` : ""}.</h1>
          <p className="text-muted-foreground">Keep the momentum going.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={Flame} label="Current streak" value={`${streak?.current_streak ?? 0} days`} accent="flame" />
          <StatCard icon={Trophy} label="Total points" value={`${streak?.total_points ?? 0}`} accent="warning" />
          <StatCard icon={Video} label="Upcoming" value={`${upcoming.length}`} accent="primary" />
          <StatCard icon={Sparkles} label="Badges" value={`${streak?.badges?.length ?? 0}`} accent="mentor" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming sessions</CardTitle>
              <Button variant="ghost" size="sm" asChild><Link to="/student/sessions">See all <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No sessions yet. <Link to="/student/explore" className="text-primary underline">Find a mentor</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm font-medium">{new Date(s.scheduled_time).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{s.status} • {s.duration_mins} min</div>
                      </div>
                      <Button size="sm" variant="outline" asChild><Link to="/student/sessions">Details</Link></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recommended for you</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {recommended.map((m) => (
                <Link key={m.user_id} to="/student/mentor/$id" params={{ id: m.user_id }} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted">
                  <div className="min-w-0"><div className="truncate text-sm font-medium">{m.headline ?? "Mentor"}</div><div className="text-xs text-muted-foreground">${Number(m.hourly_rate).toFixed(0)}/hr</div></div>
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

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  const colors: Record<string, string> = { flame: "text-flame", warning: "text-warning", primary: "text-primary", mentor: "text-mentor" };
  return (
    <Card><CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-display">{value}</div></div>
        <Icon className={`h-8 w-8 ${colors[accent]}`} />
      </div>
    </CardContent></Card>
  );
}
