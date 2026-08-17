import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  Search,
  Loader2,
  AlertCircle,
  Inbox,
  User,
  UserCheck,
  Clock,
  XCircle,
  Ban,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAdminAttention, useRescheduleBooking, useCancelBooking, useMarkNoShow, useAssignMentor, useAutoMatch } from "@/hooks/use-admin-operations";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { AttentionAlert } from "@/hooks/use-admin-operations";

type TabKey = "all" | "needs_attention" | "awaiting_mentor" | "mentor_response_pending" | "confirmed" | "upcoming" | "completed" | "cancelled" | "no_show";

const TABS: { key: TabKey; label: string }[] = [
  { key: "needs_attention", label: "Needs Attention" },
  { key: "awaiting_mentor", label: "Awaiting Mentor" },
  { key: "mentor_response_pending", label: "Response Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "no_show", label: "No-show" },
  { key: "all", label: "All" },
];

type BookingRow = {
  id: string;
  student_id: string;
  assigned_mentor: string | null;
  session_id: string | null;
  scheduled_time: string;
  duration_mins: number;
  topic: string | null;
  language: string | null;
  status: string;
  booking_status: string;
  confirmed_at: string | null;
  mentor_response_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  student?: { full_name: string; email: string; avatar_url: string | null };
  mentor?: { full_name: string; email: string; avatar_url: string | null };
};

export function AdminBookingsPage() {
  const { data: auth } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("needs_attention");
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [newTime, setNewTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [noShowActor, setNoShowActor] = useState<"student" | "mentor">("student");
  const [noShowNotes, setNoShowNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [findingMentors, setFindingMentors] = useState(false);
  const [candidateMentors, setCandidateMentors] = useState<any[]>([]);

  const { data: alertsData } = useAdminAttention();
  const alerts = alertsData?.alerts ?? [];

  const rescheduleMutation = useRescheduleBooking();
  const cancelMutation = useCancelBooking();
  const noShowMutation = useMarkNoShow();
  const assignMutation = useAssignMentor();
  const autoMatchMutation = useAutoMatch();

  const { data: bookings = [], isLoading, isError, refetch } = useQuery<BookingRow[]>({
    queryKey: ["admin", "bookings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("session_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const studentIds = [...new Set((data ?? []).map((b: any) => b.student_id).filter(Boolean))];
      const mentorIds = [...new Set((data ?? []).map((b: any) => b.assigned_mentor).filter(Boolean))];
      const allIds = [...new Set([...studentIds, ...mentorIds])];

      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", allIds);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      return (data ?? []).map((b: any) => ({
        ...b,
        student: profileMap.get(b.student_id) || undefined,
        mentor: profileMap.get(b.assigned_mentor) || undefined,
      }));
    },
    refetchInterval: 15_000,
  });

  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    let list = bookings;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => {
        const studentName = b.student?.full_name?.toLowerCase() || "";
        const mentorName = b.mentor?.full_name?.toLowerCase() || "";
        const topic = (b.topic || "").toLowerCase();
        const language = (b.language || "").toLowerCase();
        return studentName.includes(q) || mentorName.includes(q) || topic.includes(q) || language.includes(q);
      });
    }

    if (activeTab === "all") return list;
    if (activeTab === "needs_attention") {
      return list.filter((b) => {
        const isAwaiting = b.booking_status === "awaiting_mentor" || b.status === "pending_admin_assignment";
        const isExpired = b.booking_status === "mentor_assigned" || b.status === "pending_mentor_response";
        const deadline = b.mentor_response_at ? new Date(b.mentor_response_at) : null;
        return isAwaiting || (isExpired && deadline && deadline < now);
      });
    }
    if (activeTab === "awaiting_mentor") {
      return list.filter((b) => b.booking_status === "awaiting_mentor" || b.status === "pending_admin_assignment");
    }
    if (activeTab === "mentor_response_pending") {
      return list.filter((b) => b.booking_status === "mentor_assigned" || b.status === "pending_mentor_response");
    }
    if (activeTab === "upcoming") {
      return list.filter((b) => {
        const up = b.scheduled_time && new Date(b.scheduled_time) > now;
        return up && ["confirmed", "mentor_assigned", "pending_mentor_response"].includes(b.booking_status);
      });
    }
    if (activeTab === "confirmed") {
      return list.filter((b) => b.booking_status === "confirmed" && new Date(b.scheduled_time) <= now);
    }
    return list.filter((b) => {
      if (activeTab === "completed") return b.booking_status === "completed";
      if (activeTab === "cancelled") return b.booking_status === "cancelled";
      if (activeTab === "no_show") return b.booking_status === "no_show" || b.status === "no_show";
      return true;
    });
  }, [bookings, search, activeTab, now]);

  const alertForTab = (tab: TabKey) => {
    if (tab === "awaiting_mentor") return alerts.find((a) => a.id === "awaiting_mentor");
    if (tab === "mentor_response_pending") return alerts.find((a) => a.id === "expired_mentor_response");
    return null;
  };

  const openReschedule = (booking: BookingRow) => {
    setSelectedBooking(booking);
    setNewTime(booking.scheduled_time ? new Date(booking.scheduled_time).toISOString().slice(0, 16) : "");
    setDuration(booking.duration_mins || 30);
    setRescheduleOpen(true);
  };

  const openNoShow = (booking: BookingRow) => {
    setSelectedBooking(booking);
    setNoShowOpen(true);
  };

  const openCancel = (booking: BookingRow) => {
    setSelectedBooking(booking);
    setCancelOpen(true);
  };

  const openAssign = (booking: BookingRow) => {
    setSelectedBooking(booking);
    setSelectedMentorId("");
    setCandidateMentors([]);
    setAssignOpen(true);
  };

  const handleReschedule = async () => {
    if (!selectedBooking || !newTime) return;
    await rescheduleMutation.mutateAsync({
      bookingId: selectedBooking.id,
      scheduledTime: newTime,
      durationMins: duration,
      reason: "Admin reschedule",
    });
    setRescheduleOpen(false);
    setSelectedBooking(null);
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;
    await cancelMutation.mutateAsync({
      bookingId: selectedBooking.id,
      reason: cancelReason || "Admin cancellation",
    });
    setCancelOpen(false);
    setSelectedBooking(null);
    setCancelReason("");
  };

  const handleNoShow = async () => {
    if (!selectedBooking) return;
    await noShowMutation.mutateAsync({
      bookingId: selectedBooking.id,
      actor: noShowActor,
      notes: noShowNotes || undefined,
    });
    setNoShowOpen(false);
    setSelectedBooking(null);
    setNoShowNotes("");
  };

  const handleAssign = async () => {
    if (!selectedBooking || !selectedMentorId) return;
    await assignMutation.mutateAsync({
      bookingId: selectedBooking.id,
      mentorId: selectedMentorId,
    });
    setAssignOpen(false);
    setSelectedBooking(null);
    setSelectedMentorId("");
    setCandidateMentors([]);
  };

  const handleAutoMatch = async (bookingId: string) => {
    await autoMatchMutation.mutateAsync({ bookingId });
  };

  const findMentors = async (booking: BookingRow) => {
    setFindingMentors(true);
    setCandidateMentors([]);
    try {
      const res = await fetch("/api/admin/booking/find-mentors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scheduledTime: booking.scheduled_time,
          durationMins: booking.duration_mins,
          language: booking.language || "english",
          excludeMentorId: booking.assigned_mentor || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to find mentors");
      setCandidateMentors(json.mentors || []);
    } catch (err: any) {
      toast.error(err?.message || "Unable to find mentors");
    } finally {
      setFindingMentors(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "confirmed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      case "no_show":
      case "rejected":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "mentor_assigned":
      case "pending_mentor_response":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "awaiting_mentor":
      case "pending_admin_assignment":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const renderBooking = (b: BookingRow) => {
    const scheduled = b.scheduled_time ? format(parseISO(b.scheduled_time), "EEE, dd MMM yyyy · h:mm a") : "Unknown time";
    const studentName = b.student?.full_name || "Unknown Student";
    const mentorName = b.mentor?.full_name || "Unassigned";
    const deadline = b.mentor_response_at ? new Date(b.mentor_response_at) : null;
    const isExpired = deadline && deadline < now;
    const isUpcoming = b.scheduled_time && new Date(b.scheduled_time) > now;

    return (
      <Card key={b.id} className="mb-3">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={statusColor(b.booking_status || b.status)}>
              {b.booking_status || b.status || "unknown"}
            </Badge>
            {b.language && <span className="text-xs text-muted-foreground">{b.language}</span>}
            {b.topic && <span className="text-xs text-muted-foreground">· {b.topic}</span>}
            {isExpired && (
              <Badge variant="destructive" className="text-xs">
                <Clock className="mr-1 h-3 w-3" /> Response expired
              </Badge>
            )}
          </div>
          <div className="text-sm">
            <CalendarClock className="mr-1.5 inline h-4 w-4 text-muted-foreground" />
            {scheduled}
          </div>
          <div className="text-sm text-muted-foreground">
            Student: <span className="font-medium text-foreground">{studentName}</span>
            {" · "}
            Mentor: <span className="font-medium text-foreground">{mentorName}</span>
            {" · "}
            Duration: <span className="font-medium text-foreground">{b.duration_mins || 30} min</span>
          </div>
          {b.notes && <p className="text-xs text-muted-foreground italic">Notes: {b.notes}</p>}
          <div className="flex flex-wrap gap-2">
            {!b.assigned_mentor && (
              <Button size="sm" variant="outline" onClick={() => openAssign(b)}>
                <UserCheck className="mr-1.5 h-4 w-4" /> Assign Mentor
              </Button>
            )}
            {!b.assigned_mentor && (
              <Button size="sm" variant="secondary" onClick={() => handleAutoMatch(b.id)} disabled={autoMatchMutation.isPending}>
                <Sparkles className="mr-1.5 h-4 w-4" /> Auto-Match
              </Button>
            )}
            {b.assigned_mentor && ["confirmed", "in_progress", "pending_mentor_response"].includes(b.booking_status) && isUpcoming && (
              <Button size="sm" variant="outline" onClick={() => openReschedule(b)}>
                <RefreshCw className="mr-1.5 h-4 w-4" /> Reschedule
              </Button>
            )}
            {["confirmed", "in_progress", "pending_mentor_response", "mentor_assigned"].includes(b.booking_status) && (
              <Button size="sm" variant="outline" onClick={() => openNoShow(b)}>
                <Ban className="mr-1.5 h-4 w-4" /> Mark No-Show
              </Button>
            )}
            {!["completed", "cancelled", "no_show"].includes(b.booking_status) && (
              <Button size="sm" variant="destructive" onClick={() => openCancel(b)}>
                <XCircle className="mr-1.5 h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmpty = (tab: TabKey) => (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">
      <Inbox className="h-7 w-7 text-muted-foreground/50" />
      <p>
        {tab === "needs_attention"
          ? "No bookings need attention right now."
          : `No ${tab.replace(/_/g, " ")} bookings found.`}
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading bookings…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-14 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Unable to load bookings. Please refresh the page.</p>
        <Button size="sm" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display tracking-tight">Booking Operations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage every booking lifecycle. Assign, reschedule, cancel, and track no-shows.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-64"
          />
        </div>
      </div>

      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-900">
              <ShieldAlert className="h-4 w-4" /> Operational Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {alerts.slice(0, 5).map((alert) => (
              <a key={alert.id} href={alert.href} className="text-xs">
                <Badge variant={alert.severity === "high" ? "destructive" : "secondary"}>
                  {alert.label} ({alert.count})
                </Badge>
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="relative">
              {t.label}
              {alertForTab(t.key) && (
                <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                  {alertForTab(t.key)!.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.filter((t) => t.key !== "all").map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            {filtered.length === 0 ? renderEmpty(t.key) : filtered.map(renderBooking)}
          </TabsContent>
        ))}
        <TabsContent value="all" className="mt-4">
          {filtered.length === 0 ? renderEmpty("all") : filtered.map(renderBooking)}
        </TabsContent>
      </Tabs>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
            <DialogDescription>
              Current: {selectedBooking?.scheduled_time ? format(parseISO(selectedBooking.scheduled_time), "EEE, dd MMM yyyy · h:mm a") : "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Date & Time</label>
              <Input
                type="datetime-local"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={15}
                max={180}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button onClick={handleReschedule} disabled={rescheduleMutation.isPending}>
              {rescheduleMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">Reason (optional)</label>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Student request, mentor unavailable, etc."
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep Booking</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No-Show Dialog */}
      <Dialog open={noShowOpen} onOpenChange={setNoShowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark No-Show</DialogTitle>
            <DialogDescription>Record who did not attend the session.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Who did not attend?</label>
              <Select value={noShowActor} onValueChange={(v) => setNoShowActor(v as "student" | "mentor")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                value={noShowNotes}
                onChange={(e) => setNoShowNotes(e.target.value)}
                placeholder="Any additional context..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoShowOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleNoShow} disabled={noShowMutation.isPending}>
              {noShowMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm No-Show
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Mentor Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Mentor</DialogTitle>
            <DialogDescription>Find and assign a mentor to this booking.</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="text-sm">
                <strong>Booking:</strong> {selectedBooking.topic || "No topic"} · {selectedBooking.language || "—"}
                <br />
                <strong>Time:</strong> {format(parseISO(selectedBooking.scheduled_time), "EEE, dd MMM yyyy · h:mm a")}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => findMentors(selectedBooking)}
                  disabled={findingMentors}
                >
                  {findingMentors ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Find Best Mentors
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAutoMatch(selectedBooking.id)}
                  disabled={autoMatchMutation.isPending}
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Auto-Match
                </Button>
              </div>
              {candidateMentors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Recommended mentors:</p>
                  {candidateMentors.map((m: any) => (
                    <div
                      key={m.user_id}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors ${selectedMentorId === m.user_id ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                      onClick={() => setSelectedMentorId(m.user_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground">{m.headline}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">Score: {m.eligibility_score}</p>
                          <p className="text-xs text-muted-foreground">{m.years_experience} yrs · {m.rating_avg?.toFixed(1)}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.reasons?.map((r: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {candidateMentors.length === 0 && !findingMentors && (
                <p className="text-xs text-muted-foreground">Click "Find Best Mentors" to see recommendations.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedMentorId || assignMutation.isPending}>
              {assignMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Assign Mentor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
