import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/mentor/page-header";
import { MentorEmptyState } from "@/components/mentor/mentor-empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  Video,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useMentorRespondDemoAssignment } from "@/hooks/use-demo-bookings";

export const Route = createFileRoute("/_authenticated/mentor/calendar")({
  component: MentorCalendarRequests,
});

type TopTab = "calendar" | "requests";
type RequestTab = "pending" | "upcoming" | "past";

function MentorCalendarRequests() {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const uid = auth?.user?.id;
  const [topTab, setTopTab] = useState<TopTab>("requests");
  const [requestTab, setRequestTab] = useState<RequestTab>("pending");

  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["mentor-calendar-sessions", uid],
    enabled: !!uid,
    queryFn: async () => {
      const uidLocal = auth!.user!.id;
      const { data } = await supabase
        .from("sessions")
        .select("*, gig:gig_id(*), student:profiles!student_id(full_name, avatar_url)")
        .eq("mentor_id", uidLocal)
        .order("scheduled_time");
      return (data ?? []) as any[];
    },
  });

  const {
    data: demoRequests = [],
    isLoading: demoLoading,
  } = useQuery({
    queryKey: ["mentor-demo-requests", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_session_bookings" as any)
        .select("*")
        .eq("mentor_id", uid!)
        .eq("assignment_status", "pending_mentor")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 15,
  });

  const studentIds = useMemo(
    () => [
      ...new Set([
        ...sessions.map((s: any) => s.student_id).filter(Boolean),
        ...demoRequests.map((r: any) => r.user_id).filter(Boolean),
      ]),
    ],
    [sessions, demoRequests],
  );

  const { data: students = [] } = useQuery({
    queryKey: ["mentor-calendar-students", studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").in("id", studentIds);
      return data ?? [];
    },
  });
  const studentMap = useMemo(() => new Map(students.map((s: any) => [s.id, s])), [students]);

  const pendingSessions = sessions.filter((r: any) => r.status === "pending");
  const upcomingSessions = sessions.filter((r: any) => r.status === "accepted" || r.status === "confirmed");
  const pastSessions = sessions.filter((r: any) => ["completed", "rejected", "cancelled"].includes(r.status));

  const totalPending = pendingSessions.length + demoRequests.length;

  const respondMutation = useMentorRespondDemoAssignment();

  async function updateStatus(id: string, status: "accepted" | "rejected" | "completed") {
    const patch: any = { status };
    if (status === "accepted")
      patch.video_call_link = `https://meet.jit.si/lingua-${id.slice(0, 8)}`;
    const { error } = await supabase.from("sessions").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(
        status === "accepted"
          ? "Booking accepted"
          : status === "rejected"
            ? "Booking rejected"
            : "Marked complete",
      );
      qc.invalidateQueries();
      refetchSessions();
    }
  }

  async function respondDemo(bookingId: string, action: "accept" | "reject") {
    try {
      await respondMutation.mutateAsync({ bookingId, mentorId: uid!, action });
      qc.invalidateQueries({ queryKey: ["mentor-demo-requests", uid] });
    } catch (err: any) {
      toast.error(err.message || String(err));
    }
  }

  const todaySessions = useMemo(() => {
    return upcomingSessions.filter((s: any) => {
      const dt = parseISO(s.scheduled_time);
      return (
        dt.getDate() === new Date().getDate() &&
        dt.getMonth() === new Date().getMonth() &&
        dt.getFullYear() === new Date().getFullYear()
      );
    });
  }, [upcomingSessions]);

  const isLoading = sessionsLoading;

  return (
    <MentorLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title="Calendar & Requests"
          description="Your schedule and booking requests."
        />

        <Tabs value={topTab} onValueChange={(v) => setTopTab(v as TopTab)}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="requests">
              Requests
              {totalPending > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
                  {totalPending}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {topTab === "calendar" && (
            <div className="mt-6">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcomingSessions.length === 0 ? (
                <MentorEmptyState
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="No upcoming sessions"
                  description="Accepted and confirmed sessions will appear here."
                />
              ) : (
                <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
                  {upcomingSessions.map((session: any) => {
                    const start = parseISO(session.scheduled_time);
                    const student = studentMap.get(session.student_id);
                    const dayLabel = isToday(start)
                      ? "Today"
                      : isTomorrow(start)
                        ? "Tomorrow"
                        : format(start, "EEE, MMM d");

                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-accent/10 transition-colors cursor-pointer"
                        onClick={() =>
                          navigate({ to: "/mentor/session/$id", params: { id: session.id } } as any)
                        }
                      >
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-border/60 bg-background">
                          <span className="text-[10px] font-medium uppercase leading-none text-muted-foreground">
                            {format(start, "MMM")}
                          </span>
                          <span className="text-lg font-display font-bold leading-tight">
                            {format(start, "d")}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {student?.full_name || "Student"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {dayLabel} · {format(start, "h:mm a")} · {session.duration_mins} min
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {topTab === "requests" && (
            <div className="mt-4">
              <Tabs value={requestTab} onValueChange={(v) => setRequestTab(v as RequestTab)}>
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="pending">
                    Pending {totalPending > 0 ? `(${totalPending})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming ({upcomingSessions.length})</TabsTrigger>
                  <TabsTrigger value="past">Past ({pastSessions.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4 space-y-3">
                  {isLoading && demoLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-xl border border-border/60 p-4"
                        >
                          <div className="h-10 w-10 rounded-full bg-muted" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 w-48 bg-muted rounded" />
                            <div className="h-3 w-32 bg-muted rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : pendingSessions.length === 0 && demoRequests.length === 0 ? (
                    <MentorEmptyState
                      icon={<CalendarClock className="h-6 w-6" />}
                      title="No pending requests"
                      description="New booking requests will appear here."
                    />
                  ) : (
                    <div className="space-y-3">
                      {demoRequests.map((r: any) => {
                        const student = studentMap.get(r.user_id);
                        const start = parseISO(r.booking_date);
                        const dayLabel = isToday(start)
                          ? "Today"
                          : isTomorrow(start)
                            ? "Tomorrow"
                            : format(start, "EEE, MMM d");

                        return (
                          <motion.div
                            key={`demo-${r.id}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-border/60 bg-card overflow-hidden"
                          >
                            <div className="p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                    {student?.full_name?.charAt(0) || "S"}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                      {student?.full_name || "Student"}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Demo Session · {dayLabel} · {r.duration_mins} min
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {r.booking_time_start} — {r.booking_time_end}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => respondDemo(r.id, "accept")}
                                    className="h-8 text-xs"
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => respondDemo(r.id, "reject")}
                                    className="h-8 text-xs"
                                  >
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      {pendingSessions.map((r: any) => {
                        const start = parseISO(r.scheduled_time);
                        const student = studentMap.get(r.student_id);
                        const dayLabel = isToday(start)
                          ? "Today"
                          : isTomorrow(start)
                            ? "Tomorrow"
                            : format(start, "EEE, MMM d");

                        return (
                          <motion.div
                            key={r.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-border/60 bg-card overflow-hidden"
                          >
                            <div className="p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                    {(r.student?.full_name || "S").charAt(0)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                      {r.student?.full_name || "Student"}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {r.gig?.title || "Session request"} · {dayLabel} · {format(start, "h:mm a")} · {r.duration_mins} min
                                    </p>
                                    {r.student_message && (
                                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                                        &ldquo;{r.student_message}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => updateStatus(r.id, "accepted")}
                                    className="h-8 text-xs"
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateStatus(r.id, "rejected")}
                                    className="h-8 text-xs"
                                  >
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="upcoming" className="mt-4 space-y-3">
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-xl border border-border/60 p-4"
                        >
                          <div className="h-10 w-10 rounded-full bg-muted" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 w-48 bg-muted rounded" />
                            <div className="h-3 w-32 bg-muted rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : upcomingSessions.length === 0 ? (
                    <MentorEmptyState
                      icon={<Video className="h-6 w-6" />}
                      title="No upcoming sessions"
                      description="Accepted sessions will appear here."
                    />
                  ) : (
                    <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
                      {upcomingSessions.map((r: any) => {
                        const start = parseISO(r.scheduled_time);
                        const student = studentMap.get(r.student_id);
                        const dayLabel = isToday(start)
                          ? "Today"
                          : isTomorrow(start)
                            ? "Tomorrow"
                            : format(start, "EEE, MMM d");

                        return (
                          <motion.div
                            key={r.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-4 px-5 py-4 hover:bg-accent/10 transition-colors cursor-pointer"
                            onClick={() =>
                              navigate({ to: "/mentor/session/$id", params: { id: r.id } } as any)
                            }
                          >
                            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-border/60 bg-background">
                              <span className="text-[10px] font-medium uppercase leading-none text-muted-foreground">
                                {format(start, "MMM")}
                              </span>
                              <span className="text-lg font-display font-bold leading-tight">
                                {format(start, "d")}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {student?.full_name || "Student"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {dayLabel} · {format(start, "h:mm a")} · {r.duration_mins} min
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground capitalize">
                              {r.status === "accepted" || r.status === "confirmed" ? "Confirmed" : r.status}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="past" className="mt-4 space-y-3">
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-xl border border-border/60 p-4"
                        >
                          <div className="h-10 w-10 rounded-full bg-muted" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 w-48 bg-muted rounded" />
                            <div className="h-3 w-32 bg-muted rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : pastSessions.length === 0 ? (
                    <MentorEmptyState
                      icon={<Clock3 className="h-6 w-6" />}
                      title="No past sessions"
                      description="Completed and cancelled sessions appear here."
                    />
                  ) : (
                    <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
                      {pastSessions.map((r: any) => {
                        const start = parseISO(r.scheduled_time);
                        const student = studentMap.get(r.student_id);
                        return (
                          <motion.div
                            key={r.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-4 px-5 py-4"
                          >
                            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-border/60 bg-background opacity-60">
                              <span className="text-[10px] font-medium uppercase leading-none text-muted-foreground">
                                {format(start, "MMM")}
                              </span>
                              <span className="text-lg font-display font-bold leading-tight text-muted-foreground">
                                {format(start, "d")}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {student?.full_name || "Student"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(start, "EEE, MMM d")} · {format(start, "h:mm a")} · {r.duration_mins} min
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground capitalize">
                              {r.status}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </Tabs>
      </div>
    </MentorLayout>
  );
}
