import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useAdminDemoBookings,
  useAssignMentorToDemo,
  useAdminTakeDemoSession,
  useAllActiveMentors,
  useAddDemoMeetingLink,
} from "@/hooks/use-demo-bookings";
import { DemoBookingCard } from "@/components/DemoBookingCard";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";
import { Loader2, AlertTriangle, Search, RefreshCw, Clock } from "lucide-react";
import { isAttentionRequired, type DemoBooking } from "@/lib/demo-bookings";

export const Route = createFileRoute("/_authenticated/admin/demo-queue")({
  component: AdminDemoQueue,
});

const FILTERS = [
  { value: "needs_assignment", label: "Needs Assignment" },
  { value: "awaiting_mentor", label: "Awaiting Mentor" },
  { value: "expired", label: "Assignment Expired" },
  { value: "waiting_for_link", label: "Waiting for Link" },
  { value: "ready", label: "Ready to Join" },
  { value: "attention", label: "Attention Required" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
  { value: "all", label: "All" },
] as const;

const SORT_OPTIONS = [
  { value: "starting_soon", label: "Starting Soon" },
  { value: "oldest_waiting", label: "Oldest Waiting" },
  { value: "recently_assigned", label: "Recently Assigned" },
  { value: "recently_updated", label: "Recently Updated" },
] as const;

function AdminDemoQueue() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<string>("needs_assignment");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("starting_soon");
  const [selectedBooking, setSelectedBooking] = useState<DemoBooking | null>(null);
  const [dialog, setDialog] = useState<
    | null
    | "assignMentor"
    | "takeSession"
    | "viewDetails"
    | "addLink"
    | "complete"
    | "noShow"
    | "cancel"
  >(null);
  const [selectedMentorId, setSelectedMentorId] = useState<string>("");
  const [meetingLink, setMeetingLink] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [mentorSearch, setMentorSearch] = useState("");

  const { data: allBookings = [], isLoading } = useAdminDemoBookings();
  const { data: allMentors = [], isLoading: mentorsLoading } = useAllActiveMentors();

  const assignMentorMutation = useAssignMentorToDemo();
  const takeSessionMutation = useAdminTakeDemoSession();
  const addLinkMutation = useAddDemoMeetingLink();

  // Fetch all related profiles
  const allPersonIds = useMemo(() => {
    const ids = new Set<string>();
    allBookings.forEach((b: any) => {
      if (b.user_id) ids.add(b.user_id);
      if (b.mentor_id) ids.add(b.mentor_id);
      if (b.admin_id) ids.add(b.admin_id);
    });
    return [...ids];
  }, [allBookings]);

  const { data: people = [] } = useQuery({
    queryKey: ["admin-demo-people", allPersonIds.join(",")],
    enabled: allPersonIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, phone, current_level")
        .in("id", allPersonIds);
      return data ?? [];
    },
  });
  const peopleMap = useMemo(() => new Map(people.map((p: any) => [p.id, p])), [people]);

  // Summary counts
  const summary = useMemo(() => {
    const bookings = allBookings as DemoBooking[];
    return {
      needsAssignment: bookings.filter(
        (b) =>
          b.booking_status === "pending_admin_confirmation" &&
          ["unassigned", "needs_reassignment", "expired", "rejected"].includes(
            b.assignment_status || "unassigned",
          ),
      ).length,
      awaitingMentor: bookings.filter((b) => b.assignment_status === "pending_acceptance").length,
      waitingForLink: bookings.filter(
        (b) =>
          (b.assignment_status === "accepted" || b.assignment_status === "confirmed") &&
          !b.meeting_link,
      ).length,
      ready: bookings.filter((b) => b.booking_status === "confirmed" && !!b.meeting_link).length,
      live: bookings.filter((b) => b.booking_status === "live").length,
      completedToday: bookings.filter((b) => {
        if (b.booking_status !== "completed") return false;
        const d = new Date(b.completed_at || b.updated_at || b.created_at);
        return d.toDateString() === new Date().toDateString();
      }).length,
      attention: bookings.filter((b) => isAttentionRequired(b)).length,
    };
  }, [allBookings]);

  // Filter + search + sort
  const filtered = useMemo(() => {
    let result = allBookings as DemoBooking[];

    // Filter
    switch (activeFilter) {
      case "needs_assignment":
        result = result.filter(
          (b) =>
            b.booking_status === "pending_admin_confirmation" &&
            ["unassigned", "needs_reassignment", "expired", "rejected"].includes(
              b.assignment_status || "unassigned",
            ),
        );
        break;
      case "awaiting_mentor":
        result = result.filter((b) => b.assignment_status === "pending_acceptance");
        break;
      case "expired":
        result = result.filter((b) => b.assignment_status === "expired");
        break;
      case "waiting_for_link":
        result = result.filter(
          (b) =>
            (b.assignment_status === "accepted" || b.assignment_status === "confirmed") &&
            !b.meeting_link,
        );
        break;
      case "ready":
        result = result.filter((b) => b.booking_status === "confirmed" && !!b.meeting_link);
        break;
      case "attention":
        result = result.filter((b) => isAttentionRequired(b));
        break;
      case "completed":
        result = result.filter((b) => b.booking_status === "completed");
        break;
      case "cancelled":
        result = result.filter((b) => b.booking_status === "cancelled");
        break;
      case "no_show":
        result = result.filter((b) => b.booking_status === "no_show");
        break;
      case "all":
      default:
        result = result.filter(
          (b) => !["completed", "cancelled", "no_show"].includes(b.booking_status),
        );
        break;
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b) => {
        const student = peopleMap.get(b.user_id || "");
        const mentor = b.mentor_id ? peopleMap.get(b.mentor_id) : null;
        const admin = b.admin_id ? peopleMap.get(b.admin_id) : null;
        return (
          (student?.full_name?.toLowerCase().includes(q) ?? false) ||
          (student?.email?.toLowerCase().includes(q) ?? false) ||
          (mentor?.full_name?.toLowerCase().includes(q) ?? false) ||
          (admin?.full_name?.toLowerCase().includes(q) ?? false) ||
          (b.id.toLowerCase().includes(q) ?? false)
        );
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "starting_soon": {
          const aTime = new Date(`${a.booking_date}T${a.booking_time_start}`).getTime();
          const bTime = new Date(`${b.booking_date}T${b.booking_time_start}`).getTime();
          return aTime - bTime;
        }
        case "oldest_waiting": {
          const aTime = a.assigned_at
            ? new Date(a.assigned_at).getTime()
            : new Date(a.created_at).getTime();
          const bTime = b.assigned_at
            ? new Date(b.assigned_at).getTime()
            : new Date(b.created_at).getTime();
          return aTime - bTime;
        }
        case "recently_assigned": {
          const aTime = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
          const bTime = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
          return bTime - aTime;
        }
        case "recently_updated":
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return result;
  }, [allBookings, activeFilter, searchQuery, sortBy, peopleMap]);

  function openDialog(booking: DemoBooking, kind: typeof dialog) {
    setSelectedBooking(booking);
    setSelectedMentorId("");
    setMeetingLink("");
    setAdminNotes("");
    setMentorSearch("");
    setDialog(kind);
  }

  function closeDialog() {
    setDialog(null);
    setSelectedBooking(null);
    setSelectedMentorId("");
    setMeetingLink("");
    setAdminNotes("");
    setMentorSearch("");
  }

  function handleAssign() {
    if (!selectedBooking || !selectedMentorId) return;
    assignMentorMutation.mutate(
      {
        bookingId: selectedBooking.id,
        mentorId: selectedMentorId,
        clientVersion: selectedBooking.assignment_version,
      },
      {
        onSuccess: () => closeDialog(),
        onError: () => closeDialog(),
      },
    );
  }

  function handleTakeSession() {
    if (!selectedBooking) return;
    takeSessionMutation.mutate(
      { bookingId: selectedBooking.id, clientVersion: selectedBooking.assignment_version },
      {
        onSuccess: () => closeDialog(),
        onError: () => closeDialog(),
      },
    );
  }

  function handleAddMeetingLink() {
    if (!selectedBooking || !meetingLink) return;
    addLinkMutation.mutate(
      {
        bookingId: selectedBooking.id,
        meetingLink: meetingLink.trim(),
        userId: auth?.user?.id || "",
        isMentor: selectedBooking.assignment_status === "accepted",
      },
      {
        onSuccess: () => closeDialog(),
        onError: () => closeDialog(),
      },
    );
  }

  async function handleComplete() {
    if (!selectedBooking || !auth?.user?.id) return;
    const { error } = await (supabase as any)
      .from("demo_session_bookings")
      .update({
        booking_status: "completed",
        completed_at: new Date().toISOString(),
        admin_notes: adminNotes || undefined,
        admin_id: auth.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedBooking.id);

    if (error) {
      toast.error("Failed to mark completed");
    } else {
      toast.success("Demo marked as completed");
      qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
    }
    closeDialog();
  }

  async function handleNoShow() {
    if (!selectedBooking || !auth?.user?.id) return;
    const { error } = await (supabase as any)
      .from("demo_session_bookings")
      .update({
        booking_status: "no_show",
        no_show_at: new Date().toISOString(),
        admin_notes: adminNotes || undefined,
        admin_id: auth.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedBooking.id);

    if (error) {
      toast.error("Failed to mark no-show");
    } else {
      toast.success("Demo marked as no-show");
      qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
    }
    closeDialog();
  }

  async function handleCancel() {
    if (!selectedBooking || !auth?.user?.id) return;
    if (!confirm("Cancel this demo booking? The student will be notified.")) return;
    const { error } = await (supabase as any)
      .from("demo_session_bookings")
      .update({
        booking_status: "cancelled",
        assignment_status: "cancelled",
        cancelled_at: new Date().toISOString(),
        admin_id: auth.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedBooking.id);

    if (error) {
      toast.error("Failed to cancel");
    } else {
      toast.success("Demo booking cancelled");
      qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
    }
    closeDialog();
  }

  // Auto-invalidate for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
    }, 15000);
    return () => clearInterval(interval);
  }, [qc]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const getFilterCount = (filter: string): number => {
    const bookings = allBookings as DemoBooking[];
    switch (filter) {
      case "needs_assignment":
        return summary.needsAssignment;
      case "awaiting_mentor":
        return summary.awaitingMentor;
      case "waiting_for_link":
        return summary.waitingForLink;
      case "ready":
        return summary.ready;
      case "completed":
        return bookings.filter((b) => b.booking_status === "completed").length;
      case "no_show":
        return bookings.filter((b) => b.booking_status === "no_show").length;
      case "cancelled":
        return bookings.filter((b) => b.booking_status === "cancelled").length;
      case "expired":
        return bookings.filter((b) => b.assignment_status === "expired").length;
      case "attention":
        return summary.attention;
      default:
        return 0;
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6 py-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display">Demo Operations Center</h1>
            <p className="mt-1 text-muted-foreground">
              Manage demo session assignments, mentor responses, and meeting links.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] })}
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const {
                  data: { session },
                } = await supabase.auth.getSession();
                if (!session?.access_token) {
                  toast.error("Not authenticated. Please sign in.");
                  return;
                }
                try {
                  const res = await fetch("/api/admin/demo/send-reminders", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({}),
                  });
                  const json = await res.json();
                  if (json.expired_count > 0)
                    toast.info(`${json.expired_count} assignment(s) expired`);
                  if (json.reminders_5min > 0)
                    toast.info(`${json.reminders_5min} 5-min reminder(s) sent`);
                  if (json.reminders_8min > 0)
                    toast.info(`${json.reminders_8min} 8-min urgent reminder(s) sent`);
                  qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
                } catch {
                  toast.error("Failed to send reminders");
                }
              }}
            >
              <Clock className="mr-1 h-4 w-4" /> Escalate
            </Button>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Needs Assignment</div>
              <div className="mt-1 text-2xl font-bold">{summary.needsAssignment}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Awaiting Mentor</div>
              <div className="mt-1 text-2xl font-bold">{summary.awaitingMentor}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Waiting for Link</div>
              <div className="mt-1 text-2xl font-bold">{summary.waitingForLink}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Ready to Join</div>
              <div className="mt-1 text-2xl font-bold">{summary.ready}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Live</div>
              <div className="mt-1 text-2xl font-bold">{summary.live}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Completed Today</div>
              <div className="mt-1 text-2xl font-bold">{summary.completedToday}</div>
            </CardContent>
          </Card>
          <Card className={summary.attention > 0 ? "border-destructive bg-destructive/5" : ""}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {summary.attention > 0 && <AlertTriangle className="h-3 w-3 text-destructive" />}
                Attention Required
              </div>
              <div
                className={`mt-1 text-2xl font-bold ${summary.attention > 0 ? "text-destructive" : ""}`}
              >
                {summary.attention}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by student, mentor, or booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1 overflow-x-auto">
          {FILTERS.map((f) => {
            const count = getFilterCount(f.value);
            return (
              <Button
                key={f.value}
                size="sm"
                variant={activeFilter === f.value ? "default" : "outline"}
                className="h-8 text-xs whitespace-nowrap"
                onClick={() => setActiveFilter(f.value)}
              >
                {f.label}
                {count > 0 && (
                  <span
                    className={`ml-1 rounded-full px-1.5 text-xs ${
                      activeFilter === f.value
                        ? "bg-background/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Bookings List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                No bookings match this filter.
              </CardContent>
            </Card>
          ) : (
            filtered.map((booking) => (
              <DemoBookingCard
                key={booking.id}
                booking={booking}
                peopleMap={peopleMap}
                onSelect={(b) => openDialog(b, "viewDetails")}
                onAssign={(b) => openDialog(b, "assignMentor")}
                onTakeSession={(b) => openDialog(b, "takeSession")}
                onAddLink={(b) => openDialog(b, "addLink")}
                onComplete={(b) => openDialog(b, "complete")}
                onNoShow={(b) => openDialog(b, "noShow")}
                onCancel={(b) => openDialog(b, "cancel")}
                isAssigning={assignMentorMutation.isPending}
                isTakingSession={takeSessionMutation.isPending}
              />
            ))
          )}
        </div>
      </div>

      {/* Assign Mentor Dialog */}
      <Dialog open={dialog === "assignMentor"} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedBooking &&
              ["needs_reassignment", "expired", "rejected"].includes(
                selectedBooking.assignment_status || "",
              )
                ? "Reassign Demo Session"
                : "Assign Demo Session"}
            </DialogTitle>
            <DialogDescription>
              Select a mentor to conduct this demo. Any active mentor can be assigned regardless of
              slot availability.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <div className="text-sm font-medium">
                  Student: {peopleMap.get(selectedBooking.user_id)?.full_name || "Unknown"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(selectedBooking.booking_date).toDateString()} •{" "}
                  {selectedBooking.booking_time_start} - {selectedBooking.booking_time_end} •{" "}
                  {selectedBooking.duration_mins} min
                </div>
                <div className="text-sm text-muted-foreground">
                  Language: {selectedBooking.language} • Goal:{" "}
                  {selectedBooking.learning_goal || "—"}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">All Active Mentors</Label>
                <Input
                  type="text"
                  placeholder="Search mentors..."
                  className="mb-2"
                  value={mentorSearch}
                  onChange={(e) => setMentorSearch(e.target.value)}
                />
                {mentorsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {allMentors
                      .filter(
                        (m: any) =>
                          mentorSearch.trim() === "" ||
                          (m.full_name || m.email || "")
                            .toLowerCase()
                            .includes(mentorSearch.toLowerCase()),
                      )
                      .map((mentor: any) => {
                        const stats = mentor.demo_stats || { completed: 0, accepted: 0 };
                        return (
                          <div
                            key={mentor.id}
                            className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setSelectedMentorId(mentor.id)}
                          >
                            <input
                              type="radio"
                              name="mentor"
                              checked={selectedMentorId === mentor.id}
                              onChange={() => setSelectedMentorId(mentor.id)}
                              className="h-4 w-4"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                {mentor.full_name || mentor.email}
                              </div>
                              <div className="text-xs text-muted-foreground">{mentor.email}</div>
                              {stats.completed > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {stats.completed} demos completed
                                </div>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              Active
                            </Badge>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {selectedBooking.mentor_id &&
                selectedBooking.assignment_status === "pending_acceptance" && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <p className="text-sm text-orange-800">
                      <AlertTriangle className="inline h-4 w-4 mr-1" />
                      Reassigning will invalidate the current mentor's assignment.
                    </p>
                  </div>
                )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedMentorId || assignMentorMutation.isPending}
                >
                  {assignMentorMutation.isPending ? "Assigning..." : "Assign Mentor"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Take Session Myself Dialog */}
      <Dialog open={dialog === "takeSession"} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Take This Demo Session?</DialogTitle>
            <DialogDescription>
              You will become the conductor of this demo. Add a meeting link afterward.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <div className="text-sm font-medium">
                  Student: {peopleMap.get(selectedBooking.user_id)?.full_name || "Unknown"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(selectedBooking.booking_date).toDateString()} •{" "}
                  {selectedBooking.booking_time_start}
                </div>
                <div className="text-sm text-muted-foreground">
                  Language: {selectedBooking.language}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button onClick={handleTakeSession} disabled={takeSessionMutation.isPending}>
                  {takeSessionMutation.isPending ? "Taking..." : "Confirm & Take Session"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Meeting Link Dialog */}
      <Dialog open={dialog === "addLink"} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Meeting Link</DialogTitle>
            <DialogDescription>
              Add a Google Meet or Zoom link. The student will be able to join once this is saved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Meeting Link (HTTPS)</Label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleAddMeetingLink}
                disabled={!meetingLink || addLinkMutation.isPending}
              >
                {addLinkMutation.isPending ? "Saving..." : "Save & Make Ready"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={dialog === "viewDetails"} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Demo Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="text-sm">
                  <div className="font-medium mb-1">Student</div>
                  <div className="text-muted-foreground">
                    {peopleMap.get(selectedBooking.user_id)?.full_name || "Unknown"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {peopleMap.get(selectedBooking.user_id)?.email || "—"}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="font-medium mb-1">Conductor</div>
                  <div className="text-muted-foreground">
                    {selectedBooking.mentor_id
                      ? peopleMap.get(selectedBooking.mentor_id)?.full_name || "Assigned"
                      : selectedBooking.admin_id
                        ? peopleMap.get(selectedBooking.admin_id)?.full_name || "Admin"
                        : "Not assigned"}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="font-medium mb-1">Schedule</div>
                  <div className="text-muted-foreground">
                    {new Date(selectedBooking.booking_date).toDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedBooking.booking_time_start} - {selectedBooking.booking_time_end} ·{" "}
                    {selectedBooking.duration_mins} min
                  </div>
                </div>
                <div className="text-sm">
                  <div className="font-medium mb-1">Status</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selectedBooking.booking_status}</Badge>
                    <Badge variant="outline">
                      {selectedBooking.assignment_status || "unassigned"}
                    </Badge>
                  </div>
                  {selectedBooking.acceptance_deadline && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Deadline: {new Date(selectedBooking.acceptance_deadline).toLocaleString()}
                    </div>
                  )}
                  {selectedBooking.assignment_accepted_at && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Accepted at:{" "}
                      {new Date(selectedBooking.assignment_accepted_at).toLocaleString()}
                    </div>
                  )}
                  {selectedBooking.assignment_expired_at && (
                    <div className="text-xs text-destructive mt-1">
                      Expired at: {new Date(selectedBooking.assignment_expired_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {selectedBooking.meeting_link && (
                <div className="text-sm">
                  <div className="font-medium mb-1">Meeting Link</div>
                  <a
                    href={selectedBooking.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline break-all"
                  >
                    {selectedBooking.meeting_link}
                  </a>
                </div>
              )}

              {selectedBooking.admin_notes && (
                <div className="text-sm">
                  <div className="font-medium mb-1">Admin Notes</div>
                  <div className="text-muted-foreground">{selectedBooking.admin_notes}</div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={closeDialog}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={dialog === "complete"} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Demo Completed</DialogTitle>
            <DialogDescription>Confirm the demo session has been completed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Session summary, topics covered, etc."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={handleComplete}>Mark Completed</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* No Show Dialog */}
      <Dialog open={dialog === "noShow"} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as No-Show</DialogTitle>
            <DialogDescription>Student did not join the demo session.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleNoShow}>
                Mark No-Show
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
