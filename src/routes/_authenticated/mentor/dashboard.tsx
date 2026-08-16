import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/mentor/page-header";
import { SectionCard } from "@/components/mentor/section-card";
import { TimelineItem } from "@/components/mentor/timeline-item";
import { MentorEmptyState } from "@/components/mentor/mentor-empty-state";
import { StatusBadge } from "@/components/mentor/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Calendar,
  Video,
  Star,
  Clock3,
  ShieldAlert,
  ArrowRight,
  Plus,
  BookOpen,
  Settings2,
  Target,
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
              The mentor dashboard is only available to approved mentors. If you've applied to
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
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${firstName}`}
          description="Here's what needs your attention today."
          action={
            <Button asChild>
              <Link to="/mentor/calendar">
                Review requests <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          }
        />

        {/* Command Center */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-5">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))
          ) : (
            <>
              <button
                type="button"
                onClick={() => nextSession && navigate({ to: "/mentor/session/$id", params: { id: nextSession.id } } as any)}
                className="w-full text-left"
              >
                <SectionCard className="hover:border-primary/20 transition h-full">
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Next session</p>
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    {nextSession ? (
                      <>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {format(parseISO(nextSession.scheduled_time), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(nextSession.scheduled_time), "h:mm a")} · {nextSession.duration_mins} min
                        </p>
                        <p className="mt-2 text-xs font-medium text-foreground truncate">
                          {studentMap.get(nextSession.student_id)?.full_name || "Student"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(nextSession as any).gig?.title || "Session"}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No upcoming sessions</p>
                    )}
                  </div>
                </SectionCard>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: "/mentor/calendar" })}
                className="w-full text-left"
              >
                <SectionCard className="hover:border-primary/20 transition h-full">
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Pending requests</p>
                      <Clock3 className="h-4 w-4 text-primary" />
                    </div>
                    <p className="mt-2 text-2xl font-display tracking-tight text-foreground">
                      {pending.length}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pending.length === 1 ? "1 awaiting response" : `${pending.length} awaiting response`}
                    </p>
                  </div>
                </SectionCard>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: "/mentor/profile" })}
                className="w-full text-left"
              >
                <SectionCard className="hover:border-primary/20 transition h-full">
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Profile</p>
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <p className="mt-2 text-2xl font-display tracking-tight text-foreground">
                      {profileCompletion}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {profileCompletion >= 80 ? "Strong profile" : profileCompletion >= 50 ? "Good progress" : "Getting started"}
                    </p>
                  </div>
                </SectionCard>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: "/mentor/availability" })}
                className="w-full text-left"
              >
                <SectionCard className="hover:border-primary/20 transition h-full">
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Availability</p>
                      <Settings2 className="h-4 w-4 text-primary" />
                    </div>
                    <p className="mt-2 text-2xl font-display tracking-tight text-foreground">
                      {activeDays} days
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {totalSlots} slots configured
                    </p>
                  </div>
                </SectionCard>
              </button>
            </>
          )}
        </motion.div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Schedule */}
            <SectionCard
              title="Today's schedule"
              description={format(new Date(), "EEEE, MMMM d")}
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/mentor/calendar">View calendar</Link>
                </Button>
              }
            >
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-4 w-12 shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              ) : todaySessions.length === 0 ? (
                <MentorEmptyState
                  icon={<Calendar className="h-5 w-5" />}
                  title="No sessions today"
                  description="Your schedule is clear. Use this time to prepare materials or review student profiles."
                />
              ) : (
                <div className="space-y-1">
                  {todaySessions.map((session) => {
                    const start = parseISO(session.scheduled_time);
                    return (
                      <TimelineItem
                        key={session.id}
                        time={format(start, "h:mm a")}
                        title={studentMap.get(session.student_id)?.full_name || "Student"}
                        subtitle={`${session.duration_mins} min · Session`}
                        status="booked"
                        action={
                          <Button size="sm" variant="ghost" asChild className="h-7 text-xs">
                            <Link to={`/mentor/session/${session.id}` as any}>Open</Link>
                          </Button>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Upcoming Sessions */}
            <SectionCard
              title="Upcoming"
              description={`${upcoming.length} session${upcoming.length !== 1 ? "s" : ""}`}
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/mentor/sessions">
                    All <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              }
            >
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcoming.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No upcoming sessions.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {upcoming.slice(0, 4).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 rounded-lg border border-border/40 p-2.5 transition hover:border-primary/20 hover:bg-accent/20 cursor-pointer"
                      onClick={() =>
                        navigate({ to: "/mentor/session/$id", params: { id: session.id } } as any)
                      }
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {studentMap.get(session.student_id)?.full_name?.charAt(0) || "S"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">
                          {studentMap.get(session.student_id)?.full_name || "Student"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(parseISO(session.scheduled_time), "MMM d")} ·{" "}
                          {format(parseISO(session.scheduled_time), "h:mm a")}
                        </p>
                      </div>
                      <StatusBadge
                        label={session.status}
                        variant={
                          session.status === "accepted" || session.status === "confirmed"
                            ? "success"
                            : "default"
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            {/* Quick Actions */}
            <SectionCard title="Quick actions">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-auto flex-col gap-1.5 py-3" asChild>
                  <Link to="/mentor/availability">
                    <Plus className="h-4 w-4" />
                    <span className="text-xs">Add availability</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-1.5 py-3" asChild>
                  <Link to="/mentor/calendar">
                    <Clock3 className="h-4 w-4" />
                    <span className="text-xs">Review requests</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-1.5 py-3" asChild>
                  <Link to="/mentor/sessions">
                    <Video className="h-4 w-4" />
                    <span className="text-xs">View sessions</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-1.5 py-3" asChild>
                  <Link to="/mentor/profile">
                    <Settings2 className="h-4 w-4" />
                    <span className="text-xs">Edit profile</span>
                  </Link>
                </Button>
              </div>
            </SectionCard>

            {/* Recent Reviews */}
            <SectionCard
              title="Recent reviews"
              description={`${reviews.length} review${reviews.length !== 1 ? "s" : ""}`}
            >
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2.5 w-full" />
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No reviews yet.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-lg border border-border/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{"★".repeat(review.rating)}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(parseISO(review.created_at), "MMM d")}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Recent Resources */}
            <SectionCard
              title="Resources"
              description={`${resources.length} recent`}
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/mentor/resources">
                    Manage
                  </Link>
                </Button>
              }
            >
              {isLoading ? (
                <div className="space-y-2.5">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : resources.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No resources shared yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {resources.slice(0, 3).map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {resource.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{resource.visibility}</p>
                      </div>
                      <StatusBadge
                        label={resource.resource_type === "file" ? "File" : "Link"}
                        variant="default"
                      />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </MentorLayout>
  );
}