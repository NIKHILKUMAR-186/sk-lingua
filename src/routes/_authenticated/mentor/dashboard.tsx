import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Video, Star, DollarSign, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mentor/dashboard")({
  component: MentorDashboard,
});

function MentorDashboard() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const { data: sessions = [] } = useQuery({
    queryKey: ["mentor-sessions", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("sessions").select("*").eq("mentor_id", uid!).order("scheduled_time", { ascending: false })).data ?? [],
  });
  const { data: mp } = useQuery({
    queryKey: ["mp", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("mentor_profiles").select("*").eq("user_id", uid!).maybeSingle()).data,
  });

  const pending = sessions.filter(s => s.status === "pending");
  const upcoming = sessions.filter(s => s.status === "accepted");
  const completed = sessions.filter(s => s.status === "completed");
  const earnings = completed.length * Number(mp?.hourly_rate ?? 0) * 0.9;

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-6xl space-y-6">
        <div><h1 className="text-3xl font-display">Hi{auth?.profile?.full_name ? `, ${auth.profile.full_name.split(" ")[0]}` : ""}!</h1><p className="text-muted-foreground">Here's what's happening.</p></div>
        <div className="grid gap-4 md:grid-cols-4">
          <Stat icon={Calendar} label="Pending" value={pending.length} />
          <Stat icon={Video} label="Upcoming" value={upcoming.length} />
          <Stat icon={Star} label="Rating" value={Number(mp?.rating_avg ?? 0).toFixed(1)} />
          <Stat icon={DollarSign} label="Earnings" value={`$${earnings.toFixed(0)}`} />
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending requests</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link to="/mentor/calendar">Review all <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? <div className="text-sm text-muted-foreground">No pending requests.</div> : (
              <div className="space-y-2">{pending.slice(0,5).map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div><div className="text-sm font-medium">{new Date(s.scheduled_time).toLocaleString()}</div><div className="text-xs text-muted-foreground">{s.duration_mins} min</div></div>
                  <Button size="sm" asChild><Link to="/mentor/calendar">Review</Link></Button>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return <Card><CardContent className="p-5 flex items-center justify-between">
    <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-display">{value}</div></div>
    <Icon className="h-8 w-8 text-mentor" />
  </CardContent></Card>;
}
