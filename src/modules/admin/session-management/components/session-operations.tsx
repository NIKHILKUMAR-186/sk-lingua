import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { CalendarClock, Loader2, AlertCircle, Inbox, RefreshCw, XCircle, Ban, ExternalLink } from "lucide-react";
import { format, parseISO, isToday } from "date-fns";
import { useRescheduleBooking, useCancelBooking, useMarkNoShow } from "@/hooks/use-admin-operations";
import { toast } from "sonner";

type TabKey = "upcoming" | "today" | "completed" | "cancelled" | "no_show" | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "today", label: "Today" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "no_show", label: "No-show" },
  { key: "all", label: "All" },
];

type BookingRow = {
  id: string;
  student_id: string;
  assigned_mentor: string | null;
  scheduled_time: string;
  duration_mins: number;
  topic: string | null;
  language: string | null;
  booking_status: string;
  status: string;
  student?: { full_name: string };
  mentor?: { full_name: string };
};

export function SessionOperations() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [newTime, setNewTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [noShowActor, setNoShowActor] = useState<"student" | "mentor">("student");
  const [noShowNotes, setNoShowNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const rescheduleMutation = useRescheduleBooking();
  const cancelMutation = useCancelBooking();
  const noShowMutation = useMarkNoShow();

  const { data: bookings = [], isLoading, isError, refetch } = useQuery<BookingRow[]>({
    queryKey: ["admin", "sessions-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("session_requests")
        .select("*")
        .order("scheduled_time", { ascending: true });
      if (error) throw error;

      const studentIds = [...new Set((data ?? []).map((b: any) => b.student_id).filter(Boolean))];
      const mentorIds = [...new Set((data ?? []).map((b: any) => b.assigned_mentor).filter(Boolean))];
      const allIds = [...new Set([...studentIds, ...mentorIds])];

      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, full_name")
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
    if (activeTab === "all") return bookings;
    if (activeTab === "today") {
      return bookings.filter((b) => isToday(b.scheduled_time) && !["completed", "cancelled"].includes(b.booking_status));
    }
    if (activeTab === "upcoming") {
      return bookings.filter((b) => {
        const up = new Date(b.scheduled_time) > now;
        return up && ["confirmed", "mentor_assigned", "pending_mentor_response"].includes(b.booking_status);
      });
    }
    return bookings.filter((b) => {
      if (activeTab === "completed") return b.booking_status === "completed";
      if (activeTab === "cancelled") return b.booking_status === "cancelled";
      if (activeTab === "no_show") return b.booking_status === "no_show" || b.status === "no_show";
      return true;
    });
  }, [bookings, activeTab, now]);

  const openReschedule = (b: BookingRow) => {
    setSelectedBooking(b);
    setNewTime(new Date(b.scheduled_time).toISOString().slice(0, 16));
    setDuration(b.duration_mins || 30);
    setRescheduleOpen(true);
  };

  const openNoShow = (b: BookingRow) => {
    setSelectedBooking(b);
    setNoShowOpen(true);
  };

  const openCancel = (b: BookingRow) => {
    setSelectedBooking(b);
    setCancelOpen(true);
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

  const statusColor = (s: string) => {
    switch (s) {
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
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading sessions…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-14 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Unable to load sessions. Please refresh the page.</p>
        <Button size="sm" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display tracking-tight">Session Operations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Oversee every session. Reschedule, cancel, or mark no-shows directly from this page.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
        {TABS.filter((t) => t.key !== "all").map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">
                <Inbox className="h-7 w-7 text-muted-foreground/50" />
                No {t.key} sessions found.
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((b) => {
                  const scheduled = format(parseISO(b.scheduled_time), "EEE, dd MMM yyyy · h:mm a");
                  const studentName = b.student?.full_name || "Unknown";
                  const mentorName = b.mentor?.full_name || "Unassigned";
                  const canAct = !["completed", "cancelled", "no_show"].includes(b.booking_status);
                  const isUpcoming = new Date(b.scheduled_time) > now;

                  return (
                    <Card key={b.id}>
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={statusColor(b.booking_status || b.status)}>
                              {b.booking_status || b.status || "unknown"}
                            </Badge>
                            {b.language && <span className="text-xs text-muted-foreground">{b.language}</span>}
                            {b.topic && <span className="text-xs text-muted-foreground">· {b.topic}</span>}
                          </div>
                          <p className="text-sm">
                            <CalendarClock className="mr-1.5 inline h-4 w-4 text-muted-foreground" />
                            {scheduled}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Student: <span className="font-medium text-foreground">{studentName}</span>
                            {" · "}Mentor: <span className="font-medium text-foreground">{mentorName}</span>
                            {" · "}Duration: <span className="font-medium text-foreground">{b.duration_mins || 30} min</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {canAct && isUpcoming && (
                            <Button size="sm" variant="outline" onClick={() => openReschedule(b)}>
                              <RefreshCw className="mr-1.5 h-4 w-4" /> Reschedule
                            </Button>
                          )}
                          {canAct && (
                            <Button size="sm" variant="outline" onClick={() => openNoShow(b)}>
                              <Ban className="mr-1.5 h-4 w-4" /> No-Show
                            </Button>
                          )}
                          {canAct && (
                            <Button size="sm" variant="destructive" onClick={() => openCancel(b)}>
                              <XCircle className="mr-1.5 h-4 w-4" /> Cancel
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" asChild>
                            <a href="/admin/booking-queue">
                              <ExternalLink className="mr-1.5 h-4 w-4" /> Queue
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
        <TabsContent value="all" className="mt-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">
              <Inbox className="h-7 w-7 text-muted-foreground/50" /> No sessions found.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((b) => {
                const scheduled = format(parseISO(b.scheduled_time), "EEE, dd MMM yyyy · h:mm a");
                const studentName = b.student?.full_name || "Unknown";
                const mentorName = b.mentor?.full_name || "Unassigned";
                const canAct = !["completed", "cancelled", "no_show"].includes(b.booking_status);
                const isUpcoming = new Date(b.scheduled_time) > now;

                return (
                  <Card key={b.id}>
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={statusColor(b.booking_status || b.status)}>
                            {b.booking_status || b.status || "unknown"}
                          </Badge>
                          {b.language && <span className="text-xs text-muted-foreground">{b.language}</span>}
                          {b.topic && <span className="text-xs text-muted-foreground">· {b.topic}</span>}
                        </div>
                        <p className="text-sm">
                          <CalendarClock className="mr-1.5 inline h-4 w-4 text-muted-foreground" />
                          {scheduled}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Student: <span className="font-medium text-foreground">{studentName}</span>
                          {" · "}Mentor: <span className="font-medium text-foreground">{mentorName}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {canAct && isUpcoming && (
                          <Button size="sm" variant="outline" onClick={() => openReschedule(b)}>
                            <RefreshCw className="mr-1.5 h-4 w-4" /> Reschedule
                          </Button>
                        )}
                        {canAct && (
                          <Button size="sm" variant="outline" onClick={() => openNoShow(b)}>
                            <Ban className="mr-1.5 h-4 w-4" /> No-Show
                          </Button>
                        )}
                        {canAct && (
                          <Button size="sm" variant="destructive" onClick={() => openCancel(b)}>
                            <XCircle className="mr-1.5 h-4 w-4" /> Cancel
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Session</DialogTitle>
            <DialogDescription>
              Current: {selectedBooking?.scheduled_time ? format(parseISO(selectedBooking.scheduled_time), "EEE, dd MMM yyyy · h:mm a") : "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Date & Time</label>
              <Input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={15} max={180} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button onClick={handleReschedule} disabled={rescheduleMutation.isPending}>
              {rescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">Reason (optional)</label>
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Student request, mentor unavailable..." className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep Session</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              <Input value={noShowNotes} onChange={(e) => setNoShowNotes(e.target.value)} placeholder="Additional context..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoShowOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleNoShow} disabled={noShowMutation.isPending}>
              {noShowMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm No-Show
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
