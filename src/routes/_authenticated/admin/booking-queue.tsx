import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Inbox,
  Clock,
  History,
  Sparkles,
  User,
  UserCheck,
  Volume2,
  MapPin,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Ban,
  Phone,
  Loader2,
  Timer,
  ShieldAlert,
  ArrowRight,
  Users,
} from "lucide-react";
import { useAdminSessionRequests, useAssignmentHistory } from "@/hooks/use-session-requests";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { getBookingTimeline } from "@/lib/booking-timeline";
import type { BookingTimelineEntry } from "@/types/booking";

export const Route = createFileRoute("/_authenticated/admin/booking-queue")({
  component: AdminBookingQueue,
});

const COMMAND_SECTIONS = [
  { key: "needs_attention", label: "Needs attention", icon: ShieldAlert, color: "text-red-600" },
  { key: "awaiting_mentor", label: "Awaiting mentor", icon: Inbox, color: "text-amber-600" },
  { key: "mentor_response_pending", label: "Mentor response pending", icon: Clock, color: "text-blue-600" },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "text-emerald-600" },
  { key: "upcoming", label: "Upcoming", icon: CalendarClock, color: "text-primary" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "text-muted-foreground" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, color: "text-destructive" },
  { key: "no_show", label: "No-show", icon: Ban, color: "text-orange-600" },
] as const;

type SectionKey = (typeof COMMAND_SECTIONS)[number]["key"];

function AdminBookingQueue() {
  const qc = useQueryClient();
  const { data: auth } = useAuth();
  const { data: requests = [], isLoading, refetch } = useAdminSessionRequests() as any;
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<SectionKey>("needs_attention");
  const [assigning, setAssigning] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timelineCache, setTimelineCache] = useState<Record<string, BookingTimelineEntry[]>>({});

  useRealtimeSubscription({
    channel: "admin-booking-queue",
    table: "session_requests",
    event: "*",
    onInsert: () => { refetch(); },
    onUpdate: () => { refetch(); },
    onDelete: () => { refetch(); },
    filter: undefined,
  });

  useRealtimeSubscription({
    channel: "admin-booking-timeline",
    table: "booking_timeline",
    event: "*",
    onInsert: () => { refetch(); },
    onUpdate: () => { refetch(); },
    onDelete: () => { refetch(); },
    filter: undefined,
  });

  const { data: mentors = [] } = useQuery({
    queryKey: ["admin-available-mentors"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("mentor_profiles")
        .select("user_id, headline, languages_taught, verification_status")
        .eq("is_active", true)
        .eq("verification_status", "approved");
      const ids = (data ?? []).map((m: any) => m.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", ids);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((m: any) => ({
        ...m,
        profile: profileMap.get(m.user_id) ?? null,
      }));
    },
  });

  const studentIds = useMemo(
    () => [...new Set(requests.map((r: any) => r.student_id).filter(Boolean))],
    [requests],
  );
  const { data: students = [] } = useQuery({
    queryKey: ["admin-queue-students", studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("*").in("id", studentIds);
      return (data ?? []) as any[];
    },
  });
  const studentMap = useMemo(() => new Map(students.map((s: any) => [s.id, s])), [students]);

  const mentorIds = useMemo(
    () => [...new Set(requests.map((r: any) => r.assigned_mentor).filter(Boolean))],
    [requests],
  );
  const { data: assignedMentors = [] } = useQuery({
    queryKey: ["admin-queue-mentors", mentorIds.join(",")],
    enabled: mentorIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", mentorIds);
      return (data ?? []) as any[];
    },
  });
  const assignedMentorMap = useMemo(() => new Map(assignedMentors.map((m: any) => [m.id, m])), [assignedMentors]);

  const now = useMemo(() => new Date(), []);

  const sectioned = useMemo(() => {
    const sections: Record<SectionKey, any[]> = {
      needs_attention: [],
      awaiting_mentor: [],
      mentor_response_pending: [],
      confirmed: [],
      upcoming: [],
      completed: [],
      cancelled: [],
      no_show: [],
    };

    for (const r of requests as any[]) {
      const slaDeadline = r.sla_deadline ? parseISO(r.sla_deadline) : null;
      const isSlaExpired = slaDeadline ? slaDeadline < now : false;
      const isUpcoming = r.scheduled_time && new Date(r.scheduled_time) > now;

      if (r.status === "pending_admin_assignment" || r.status === "unassigned") {
        sections.awaiting_mentor.push(r);
      } else if (r.status === "pending_mentor_response") {
        sections.mentor_response_pending.push(r);
      } else if (r.status === "confirmed") {
        if (isUpcoming) sections.upcoming.push(r);
        else sections.confirmed.push(r);
      } else if (r.status === "completed") {
        sections.completed.push(r);
      } else if (r.status === "cancelled") {
        sections.cancelled.push(r);
      } else if (r.status === "rejected" || r.status === "no_show") {
        sections.no_show.push(r);
      }
    }

    // Needs attention: awaiting mentor + expired SLA + no eligible mentor
    sections.needs_attention = [
      ...sections.awaiting_mentor,
      ...sections.mentor_response_pending.filter((r: any) => {
        const deadline = r.sla_deadline ? parseISO(r.sla_deadline) : null;
        return deadline ? deadline < now : false;
      }),
    ];

    return sections;
  }, [requests, now]);

  const filtered = useMemo(() => {
    const list = sectioned[activeSection] || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((r: any) => {
      const student = studentMap.get(r.student_id);
      const mentor = assignedMentorMap.get(r.assigned_mentor);
      return (
        (r.topic ?? "").toLowerCase().includes(q) ||
        (r.language ?? "").toLowerCase().includes(q) ||
        (student?.full_name ?? "").toLowerCase().includes(q) ||
        (mentor?.full_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [sectioned, activeSection, search, studentMap, assignedMentorMap]);

  async function assign(reqId: string, mentorId: string) {
    if (!mentorId) return toast.error("Select a mentor first");
    if (!auth?.user?.id) return toast.error("Admin identity required");
    setAssigning(true);
    try {
      const req = requests.find((r: any) => r.id === reqId);
      if (!req) throw new Error("Booking not found");

      const res = await fetch("/api/admin/booking/assign-mentor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookingId: reqId,
          mentorId,
          scheduledTime: req.scheduled_time,
          durationMins: req.duration_mins,
          language: req.language,
          studentId: req.student_id,
          assignedBy: auth.user.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "assign failed");
      toast.success("Mentor assigned. 15-minute response window started.");
      setSelectedMentorId("");
      setExpandedId(null);
      qc.invalidateQueries({ queryKey: ["admin-session-requests"] });
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setAssigning(false);
    }
  }

  async function autoMatch(reqId: string) {
    if (!auth?.user?.id) return toast.error("Admin identity required");
    setAutoMatching(true);
    try {
      const res = await fetch("/api/admin/auto-match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: reqId, assignedBy: auth.user.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || "auto-match failed");
      toast.success("Mentor auto-matched. 15-minute SLA timer started.");
      setExpandedId(null);
      qc.invalidateQueries({ queryKey: ["admin-session-requests"] });
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setAutoMatching(false);
    }
  }

  async function loadTimeline(bookingId: string) {
    if (timelineCache[bookingId]) return;
    try {
      const timeline = await getBookingTimeline(bookingId);
      setTimelineCache((prev) => ({ ...prev, [bookingId]: timeline }));
    } catch (e) {
      console.error("Failed to load timeline", e);
    }
  }

  function handleToggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
    if (expandedId !== id) loadTimeline(id);
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display">Booking Command Center</h1>
            <p className="text-sm text-muted-foreground">
              Manage bookings, assign mentors, and track status in real time.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-session-requests"] })}
          >
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student, mentor, topic, or language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {COMMAND_SECTIONS.map((section) => {
            const count = (sectioned[section.key] || []).length;
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  activeSection === section.key
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30 hover:bg-accent/30"
                )}
              >
                <Icon className={cn("h-4 w-4 mb-1", section.color)} />
                <div className="text-lg font-display font-semibold">{count}</div>
                <div className="text-[11px] text-muted-foreground truncate">{section.label}</div>
              </button>
            );
          })}
        </div>

        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as SectionKey)}>
          <TabsList className="flex flex-wrap">
            {COMMAND_SECTIONS.map((section) => (
              <TabsTrigger key={section.key} value={section.key}>
                {section.label}
                <span className="ml-1 rounded-full bg-muted px-1.5 text-xs">
                  {(sectioned[section.key] || []).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeSection} className="mt-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 w-3/4 bg-muted rounded" />
                        <div className="h-3 w-1/2 bg-muted rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No bookings in this section.</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((r: any) => (
                <BookingCard
                  key={r.id}
                  request={r}
                  student={studentMap.get(r.student_id)}
                  mentor={assignedMentorMap.get(r.assigned_mentor)}
                  mentors={mentors}
                  selectedMentorId={selectedMentorId}
                  onSelectMentor={setSelectedMentorId}
                  onAssign={assign}
                  onAutoMatch={autoMatch}
                  assigning={assigning}
                  autoMatching={autoMatching}
                  isExpanded={expandedId === r.id}
                  onToggleExpand={() => handleToggleExpand(r.id)}
                  timeline={timelineCache[r.id]}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function BookingCard({
  request: r,
  student,
  mentor,
  mentors,
  selectedMentorId,
  onSelectMentor,
  onAssign,
  onAutoMatch,
  assigning,
  autoMatching,
  isExpanded,
  onToggleExpand,
  timeline,
}: any) {
  const slaRemaining = useSlaRemaining(r.sla_deadline ?? null);
  const isSlaActive = r.status === "pending_mentor_response" && slaRemaining > 0;
  const isExpired = r.status === "pending_mentor_response" && !isSlaActive && slaRemaining === 0;

  const statusConfig = getStatusConfig(r.status, isSlaActive, isExpired);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-medium">{r.topic || "Session request"}</div>
              <StatusBadge status={r.status} isSlaActive={isSlaActive} isExpired={isExpired} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                {r.scheduled_time ? format(parseISO(r.scheduled_time), "MMM d, yyyy h:mm a") : "No date"} • {r.duration_mins} min
              </span>
              {r.language ? (
                <span className="flex items-center gap-1">
                  <Volume2 className="h-3.5 w-3.5" /> {r.language}
                </span>
              ) : null}
              {r.state ? (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {r.state}
                </span>
              ) : null}
              {r.booking_status && (
                <span className="flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" /> {r.booking_status}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {student?.full_name || "Unknown student"}
              </span>
              {mentor ? (
                <span className="flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" /> {mentor.full_name}
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                {formatDistanceToNow(parseISO(r.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(r.status === "pending_admin_assignment" || r.status === "unassigned") && (
              <>
                <select
                  className="rounded-md border px-2 py-1 text-sm"
                  value={selectedMentorId}
                  onChange={(e) => onSelectMentor(e.target.value)}
                >
                  <option value="">Find mentor...</option>
                  {mentors.map((m: any) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.user_id}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={() => onAssign(r.id, selectedMentorId)}
                  disabled={assigning || !selectedMentorId}
                >
                  {assigning ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UserCheck className="mr-1 h-3.5 w-3.5" />}
                  Assign
                </Button>
                <Button size="sm" variant="outline" onClick={() => onAutoMatch(r.id)} disabled={autoMatching}>
                  {autoMatching ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                  Auto Match
                </Button>
              </>
            )}
            {isSlaActive && (
              <span className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                <Clock className="h-3.5 w-3.5" /> SLA {formatSla(slaRemaining)}
              </span>
            )}
            {isExpired && (
              <span className="flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                <Clock className="h-3.5 w-3.5" /> SLA expired
              </span>
            )}
            {(r.status === "confirmed" || r.booking_status === "confirmed") && r.session_id && (
              <Button size="sm" variant="outline" asChild>
                <Link to="/student/session/$id" params={{ id: r.session_id }}>
                  <Eye className="mr-1 h-3.5 w-3.5" /> View Session
                </Link>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onToggleExpand}>
              <History className="mr-1 h-3.5 w-3.5" />
              {isExpanded ? "Hide" : "Details"}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Student Details</div>
              <div className="text-sm text-muted-foreground">
                {student ? (
                  <div className="space-y-1">
                    <div>{student.full_name}</div>
                    <div>{student.email}</div>
                    <div>{student.native_language || "No native language"}</div>
                    {student.learning_goal && <div>Goal: {student.learning_goal}</div>}
                  </div>
                ) : (
                  <span>Student details unavailable</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Request Details</div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Created: {format(parseISO(r.created_at), "MMM d, yyyy h:mm a")}</div>
                <div>Status: {r.status}</div>
                {r.language && <div>Language: {r.language}</div>}
                {r.state && <div>State: {r.state}</div>}
                {r.notes && <div>Notes: {r.notes}</div>}
                {r.sla_deadline && (
                  <div>SLA Deadline: {format(parseISO(r.sla_deadline), "MMM d, yyyy h:mm a")}</div>
                )}
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <div className="text-sm font-medium">Booking Timeline</div>
              {timeline && timeline.length > 0 ? (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {timeline.map((entry: BookingTimelineEntry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-md border bg-background px-3 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={getTimelineBadgeVariant(entry.action)}>{entry.action}</Badge>
                        <span>{entry.description}</span>
                      </div>
                      <span className="text-muted-foreground whitespace-nowrap ml-2">
                        {format(parseISO(entry.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading timeline...</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, isSlaActive, isExpired }: any) {
  const variant = getStatusBadgeVariant(status, isSlaActive, isExpired);
  const label = getStatusLabel(status, isSlaActive, isExpired);
  return <Badge variant={variant}>{label}</Badge>;
}

function getStatusBadgeVariant(status: string, isSlaActive: boolean, isExpired: boolean) {
  if (isExpired) return "destructive";
  if (isSlaActive) return "default";
  switch (status) {
    case "pending_admin_assignment":
    case "unassigned":
      return "secondary";
    case "pending_mentor_response":
      return "default";
    case "confirmed":
      return "default";
    case "completed":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: string, isSlaActive: boolean, isExpired: boolean) {
  if (isExpired) return "SLA expired";
  if (isSlaActive) return "Awaiting response";
  switch (status) {
    case "pending_admin_assignment":
      return "Pending assignment";
    case "unassigned":
      return "Unassigned";
    case "pending_mentor_response":
      return "Mentor assigned";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function getStatusConfig(status: string, isSlaActive: boolean, isExpired: boolean) {
  if (isExpired) return { label: "SLA expired", variant: "destructive" as const };
  if (isSlaActive) return { label: "Awaiting mentor response", variant: "default" as const };
  switch (status) {
    case "pending_admin_assignment":
    case "unassigned":
      return { label: "Needs mentor", variant: "secondary" as const };
    case "pending_mentor_response":
      return { label: "Mentor assigned", variant: "default" as const };
    case "confirmed":
      return { label: "Confirmed", variant: "default" as const };
    case "completed":
      return { label: "Completed", variant: "outline" as const };
    case "cancelled":
      return { label: "Cancelled", variant: "destructive" as const };
    default:
      return { label: status, variant: "secondary" as const };
  }
}

function getTimelineBadgeVariant(action: string) {
  switch (action) {
    case "mentor_accepted":
    case "booking_confirmed":
      return "default";
    case "mentor_declined":
    case "mentor_expired":
      return "destructive";
    case "mentor_assigned":
      return "secondary";
    default:
      return "outline";
  }
}

function useSlaRemaining(deadline: string | null) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!deadline) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const ms = new Date(deadline).getTime() - Date.now();
      setRemaining(Math.max(0, Math.round(ms / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return remaining;
}

function formatSla(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}