
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Video, Star, DollarSign, ArrowRight, Users, FileText, Clock3 } from "lucide-react";
import { getProfileCompletionPercent } from "@/lib/profile";
import React, { Suspense } from "react";
const MentorAnalyticsDashboard = React.lazy(() => import("@/components/mentor-analytics-dashboard").then(m => ({ default: m.MentorAnalyticsDashboard })));

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
  const { data: reviews = [] } = useQuery({
    queryKey: ["mentor-reviews", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("reviews").select("*").eq("mentor_id", uid!).order("created_at", { ascending: false }).limit(3)).data ?? [],
  });
  const { data: resources = [] } = useQuery({
    queryKey: ["mentor-dashboard-resources", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("resources").select("*").eq("mentor_id", uid!).order("created_at", { ascending: false }).limit(4)).data ?? [],
  });

  const pending = sessions.filter((s) => s.status === "pending");
  const upcoming = sessions.filter((s) => s.status === "accepted");
  const completed = sessions.filter((s) => s.status === "completed");
  const today = new Date();
  const todaySessions = sessions.filter((s) => {
    const scheduled = new Date(s.scheduled_time);
    return scheduled.getDate() === today.getDate() && scheduled.getMonth() === today.getMonth() && scheduled.getFullYear() === today.getFullYear();
  });
  const studentsTaught = new Set(completed.map((s) => s.student_id).filter(Boolean)).size;
  const homeworkShared = resources.filter((resource) => resource.session_id).length;
  const earnings = completed.length * Number(mp?.hourly_rate ?? 0) * 0.9;
  const normalizedCertifications = Array.isArray(mp?.certifications)
    ? mp.certifications.join("\n")
    : typeof mp?.certifications === "string"
      ? mp.certifications
      : undefined;
  const profileCompletion = getProfileCompletionPercent({
    full_name: auth?.profile?.full_name,
    headline: mp?.headline,
    bio: auth?.profile?.bio ?? mp?.bio,
    state: auth?.profile?.state,
    timezone: auth?.profile?.timezone ?? mp?.timezone,
    native_language: auth?.profile?.native_language,
    languages_taught: mp?.languages_taught,
    years_experience: mp?.years_experience,
    hourly_rate: mp?.hourly_rate,
    teaching_style: mp?.teaching_style,
    certifications: normalizedCertifications,
    education: mp?.education,
    linkedin_url: auth?.profile?.linkedin_url ?? mp?.linkedin_url,
    website_url: auth?.profile?.website_url ?? mp?.website_url,
    youtube_url: auth?.profile?.youtube_url ?? mp?.youtube_url,
    availability_preview: mp?.availability_preview,
    avatar_url: auth?.profile?.avatar_url,
    cover_url: auth?.profile?.cover_url,
  }, "mentor");

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-6xl space-y-6">
        <Suspense fallback={<div className="mb-4">Loading analytics…</div>}>
          <MentorAnalyticsDashboard />
        </Suspense>
        <div><h1 className="text-3xl font-display">Hi{auth?.profile?.full_name ? `, ${auth.profile.full_name.split(" ")[0]}` : ""}!</h1><p className="text-muted-foreground">Here's what's happening.</p></div>
        <div className="grid gap-4 md:grid-cols-4">
          <Stat icon={Calendar} label="Today's sessions" value={todaySessions.length} />
          <Stat icon={Clock3} label="Pending requests" value={pending.length} />
          <Stat icon={Star} label="Rating" value={Number(mp?.rating_avg ?? 0).toFixed(1)} />
          <Stat icon={DollarSign} label="Earnings" value={`$${earnings.toFixed(0)}`} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Profile completion</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-display">{profileCompletion}%</div>
              <p className="text-sm text-muted-foreground">A fuller profile helps students trust your teaching profile.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Quick stats</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Students taught</div><div className="text-xl font-semibold">{studentsTaught}</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Upcoming sessions</div><div className="text-xl font-semibold">{upcoming.length}</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Homework shared</div><div className="text-xl font-semibold">{homeworkShared}</div></div>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
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
          <Card>
            <CardHeader><CardTitle>Recent reviews</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {reviews.length === 0 ? <div className="text-sm text-muted-foreground">No reviews yet.</div> : reviews.map((review) => (
                <div key={review.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">★ {review.rating}</span>
                    <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  {review.comment ? <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent uploaded resources</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link to="/mentor/resources">Manage resources <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {resources.length === 0 ? <div className="text-sm text-muted-foreground">No resources shared yet.</div> : resources.map((resource) => (
              <div key={resource.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">{resource.title}</div>
                  <div className="text-xs text-muted-foreground">{resource.visibility} • {resource.file_name ?? resource.url}</div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground"><FileText className="h-4 w-4" /><Users className="h-4 w-4" /></div>
              </div>
            ))}
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
