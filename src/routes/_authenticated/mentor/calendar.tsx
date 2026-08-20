import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/mentor/page-header";
import { MentorSectionHeader } from "@/components/mentor-design/MentorSectionHeader";
import { MentorEmptyState } from "@/components/mentor-design/MentorEmptyState";
import { MentorStatusBadge } from "@/components/mentor-design/MentorStatusBadge";
import { MentorDateChip } from "@/components/mentor-design/MentorDateChip";
import { MentorAvatar } from "@/components/mentor-design/MentorAvatar";
import { MentorPageContainer } from "@/components/mentor-design/MentorPageContainer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { CalendarDays, Clock3, Video, CalendarClock, ChevronRight, ExternalLink, ArrowRight } from "lucide-react";
import { format, parseISO, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useMentorRespondDemoAssignment, useAddDemoMeetingLink } from "@/hooks/use-demo-bookings";

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

  const { data: demoRequests = [], isLoading: demoLoading } = useQuery({
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
  const upcomingSessions = sessions.filter(
    (r: any) => r.status === "accepted" || r.status === "confirmed",
  );
  const pastSessions = sessions.filter((r: any) =>
    ["completed", "rejected", "cancelled"].includes(r.status),
  );

  const totalPending = pendingSessions.length + demoRequests.length;

  const respondMutation = useMentorRespondDemoAssignment();
  const addLinkMutation = useAddDemoMeetingLink();
  const [linkInput, setLinkInput] = useState<Record<string, string>>({});

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

  async function respondDemo(bookingId: string, action: "accept" | "reject", version?: number) {
    try {
      await respondMutation.mutateAsync({
        bookingId,
        mentorId: uid!,
        action,
        clientVersion: version,
      });
      qc.invalidateQueries({ queryKey: ["mentor-demo-requests", uid] });
    } catch (err: any) {
      toast.error(err.message || String(err));
    }
  }

  async function addMeetingLink(bookingId: string, link: string) {
    if (!uid) return;
    try {
      await addLinkMutation.mutateAsync({
        bookingId,
        meetingLink: link,
        userId: uid,
        isMentor: true,
      });
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
      <MentorPageContainer>
        <PageHeader
          title="Calendar & Requests"
          description="Your schedule and booking requests."
          action={
            totalPending > 0 ? (
              <Button asChild>
                <Link to="/mentor/calendar">
                  Review requests <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : undefined
          }
        />

        <Tabs value={topTab} onValueChange={(v) => setTopTab(v as TopTab)}>
          <TabsList className="mentor-tabs-list w-auto">
            <TabsTrigger value="calendar" className="mentor-tab">Calendar</TabsTrigger>
            <TabsTrigger value="requests" className="mentor-tab">
              Requests
              {totalPending > 0 && (
                <span className="mentor-sidebar-item-badge">{totalPending}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {topTab === "calendar" && (
            <div className="mt-6">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
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
                <div className="mentor-card divide-y divide-border/60">
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
                        className="mentor-session-row"
                        onClick={() =>
                          navigate({ to: "/mentor/session/$id", params: { id: session.id } } as any)
                        }
                      >
                        <MentorDateChip
                          month={format(start, "MMM")}
                          day={format(start, "d")}
                        />
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
                <TabsList className="mentor-tabs-list w-auto">
                  <TabsTrigger value="pending" className="mentor-tab">
                    Pending {totalPending > 0 ? `(${totalPending})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" className="mentor-tab">
                    Upcoming ({upcomingSessions.length})
                  </TabsTrigger>
                  <TabsTrigger value="past" className="mentor-tab">
                    Past ({pastSessions.length})
                  </TabsTrigger>
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

                        const isAwaiting = r.assignment_status === "pending_acceptance";
                        const isAccepted = r.assignment_status === "accepted";
                        const hasLink = !!r.meeting_link;
                        const timeRemaining =
                          isAwaiting && r.acceptance_deadline
                            ? Math.max(
                                0,
                                Math.floor(
                                  (new Date(r.acceptance_deadline).getTime() - Date.now()) / 1000,
                                ),
                              )
                            : null;

                        let countdownLabel = "";
                        if (isAwaiting && timeRemaining !== null) {
                          if (timeRemaining <= 0) {
                            countdownLabel = "Expired";
                          } else {
                            const mins = Math.floor(timeRemaining / 60);
                            const secs = timeRemaining % 60;
                            countdownLabel = `${mins}:${secs.toString().padStart(2, "0")} remaining`;
                          }
                        }

                        return (
                          <motion.div
                            key={`demo-${r.id}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mentor-request-card"
                          >
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                  <MentorAvatar
                                    fallback={student?.full_name || "S"}
                                    size="md"
                                  />
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
                                    {isAwaiting && (
                                      <p className="text-xs text-amber-600 mt-1 font-medium">
                                        Accept within: {countdownLabel}
                                      </p>
                                    )}
                                    {isAccepted && !hasLink && (
                                      <p className="text-xs text-electric-iris mt-1">
                                        Add a Google Meet link to make this session ready
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-col gap-2">
                                  {isAwaiting && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          respondDemo(r.id, "accept", r.assignment_version)
                                        }
                                        disabled={respondMutation.isPending}
                                        className="h-8 text-xs"
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          respondDemo(r.id, "reject", r.assignment_version)
                                        }
                                        disabled={respondMutation.isPending}
                                        className="h-8 text-xs"
                                      >
                                        Decline
                                      </Button>
                                    </>
                                  )}
                                  {isAccepted && !hasLink && (
                                    <div className="flex flex-col gap-2">
                                      <Input
                                        type="url"
                                        placeholder="https://meet.google.com/..."
                                        value={linkInput[r.id] || ""}
                                        onChange={(e) =>
                                          setLinkInput({ ...linkInput, [r.id]: e.target.value })
                                        }
                                        className="text-xs h-8"
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => addMeetingLink(r.id, linkInput[r.id] || "")}
                                        disabled={!linkInput[r.id] || addLinkMutation.isPending}
                                        className="h-8 text-xs"
                                      >
                                        Save Link
                                      </Button>
                                    </div>
                                  )}
                                  {isAccepted && hasLink && (
                                    <MentorStatusBadge status="success" label="Ready" />
                                  )}
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
                            className="mentor-request-card"
                          >
                            <div className="p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                  <MentorAvatar
                                    fallback={(r.student?.full_name || "S").charAt(0)}
                                    size="md"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                      {r.student?.full_name || "Student"}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {r.gig?.title || "Session request"} · {dayLabel} ·{" "}
                                      {format(start, "h:mm a")} · {r.duration_mins} min
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
                    <div className="mentor-card divide-y divide-border/60">
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
                            className="mentor-session-row"
                            onClick={() =>
                              navigate({ to: "/mentor/session/$id", params: { id: r.id } } as any)
                            }
                          >
                            <MentorDateChip
                              month={format(start, "MMM")}
                              day={format(start, "d")}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {student?.full_name || "Student"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {dayLabel} · {format(start, "h:mm a")} · {r.duration_mins} min
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground capitalize shrink-0">
                              {r.status === "accepted" || r.status === "confirmed"
                                ? "Confirmed"
                                : r.status}
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
                    <div className="mentor-card divide-y divide-border/60">
                      {pastSessions.map((r: any) => {
                        const start = parseISO(r.scheduled_time);
                        const student = studentMap.get(r.student_id);
                        return (
                          <motion.div
                            key={r.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mentor-session-row opacity-70"
                          >
                            <MentorDateChip
                              month={format(start, "MMM")}
                              day={format(start, "d")}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {student?.full_name || "Student"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(start, "EEE, MMM d")} · {format(start, "h:mm a")} ·{" "}
                                {r.duration_mins} min
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground capitalize shrink-0">
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
      </MentorPageContainer>
    </MentorLayout>
  );
}
