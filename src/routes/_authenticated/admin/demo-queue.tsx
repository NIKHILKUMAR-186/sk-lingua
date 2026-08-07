import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useAdminDemoBookings,
  useConfirmDemoBooking,
  useRescheduleDemoBooking,
  useCompleteDemoBooking,
  useMarkDemoNoShow,
  useCancelDemoBooking,
} from "@/hooks/use-demo-bookings";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  UserX,
  RefreshCw,
  Phone,
  Mail,
  Globe,
  BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/demo-queue")({
  component: AdminDemoQueue,
});

const STATUS_TABS = [
  { value: "pending_admin_confirmation", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
] as const;

function AdminDemoQueue() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("pending_admin_confirmation");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [dialog, setDialog] = useState<null | "confirm" | "reschedule" | "complete" | "noShow">(
    null,
  );

  // Form state for confirm/reschedule
  const [meetingLink, setMeetingLink] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTimeStart, setEditTimeStart] = useState("");
  const [editTimeEnd, setEditTimeEnd] = useState("");

  const { data: allBookings = [], isLoading } = useAdminDemoBookings();

  const confirmMutation = useConfirmDemoBooking();
  const rescheduleMutation = useRescheduleDemoBooking();
  const completeMutation = useCompleteDemoBooking();
  const noShowMutation = useMarkDemoNoShow();
  const cancelMutation = useCancelDemoBooking();

  // Fetch student profiles for all bookings
  const studentIds = [...new Set(allBookings.map((b: any) => b.user_id).filter(Boolean))];
  const { data: students = [] } = useQuery({
    queryKey: ["admin-demo-students", studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").in("id", studentIds);
      return data ?? [];
    },
  });
  const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));

  const filtered = (allBookings as any[]).filter((b) => b.booking_status === activeTab);

  function openDialog(booking: any, kind: "confirm" | "reschedule" | "complete" | "noShow") {
    setSelectedBooking(booking);
    setMeetingLink(booking.meeting_link || "");
    setAdminNotes(booking.admin_notes || "");
    setEditDate(booking.booking_date || "");
    setEditTimeStart(booking.booking_time_start || "");
    setEditTimeEnd(booking.booking_time_end || "");
    setDialog(kind);
  }

  function handleConfirm() {
    if (!selectedBooking || !auth?.user?.id) return;
    if (!meetingLink.trim()) return toast.error("Meeting link is required");
    confirmMutation.mutate(
      {
        bookingId: selectedBooking.id,
        adminId: auth.user.id,
        booking_date: editDate || selectedBooking.booking_date,
        booking_time_start: editTimeStart || selectedBooking.booking_time_start,
        booking_time_end: editTimeEnd || selectedBooking.booking_time_end,
        meeting_link: meetingLink.trim(),
        admin_notes: adminNotes || undefined,
      },
      {
        onSuccess: () => {
          setDialog(null);
          setSelectedBooking(null);
        },
      },
    );
  }

  function handleReschedule() {
    if (!selectedBooking || !auth?.user?.id) return;
    if (!editDate || !editTimeStart || !editTimeEnd)
      return toast.error("Date and time are required");
    rescheduleMutation.mutate(
      {
        bookingId: selectedBooking.id,
        adminId: auth.user.id,
        booking_date: editDate,
        booking_time_start: editTimeStart,
        booking_time_end: editTimeEnd,
      },
      {
        onSuccess: () => {
          setDialog(null);
          setSelectedBooking(null);
        },
      },
    );
  }

  function handleComplete() {
    if (!selectedBooking || !auth?.user?.id) return;
    completeMutation.mutate(
      {
        bookingId: selectedBooking.id,
        adminId: auth.user.id,
        adminNotes: adminNotes || undefined,
      },
      {
        onSuccess: () => {
          setDialog(null);
          setSelectedBooking(null);
        },
      },
    );
  }

  function handleNoShow() {
    if (!selectedBooking || !auth?.user?.id) return;
    noShowMutation.mutate(
      {
        bookingId: selectedBooking.id,
        adminId: auth.user.id,
        adminNotes: adminNotes || undefined,
      },
      {
        onSuccess: () => {
          setDialog(null);
          setSelectedBooking(null);
        },
      },
    );
  }

  function handleCancel(booking: any) {
    if (!auth?.user?.id) return;
    if (!window.confirm("Cancel this demo booking? The student will be notified.")) return;
    cancelMutation.mutate({
      bookingId: booking.id,
      userId: booking.user_id,
      adminId: auth.user.id,
    });
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending_admin_confirmation: "secondary",
      confirmed: "default",
      completed: "default",
      cancelled: "destructive",
      no_show: "outline",
    };
    const labels: Record<string, string> = {
      pending_admin_confirmation: "Pending Confirmation",
      confirmed: "Confirmed",
      completed: "Completed",
      cancelled: "Cancelled",
      no_show: "No Show",
    };
    return <Badge variant={variants[status] ?? "secondary"}>{labels[status] ?? status}</Badge>;
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display">Demo Session Queue</h1>
            <p className="mt-1 text-muted-foreground">
              Review and confirm demo session bookings. Every demo is conducted by an admin.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] })}
          >
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="mt-1 text-2xl font-bold">
                {
                  (allBookings as any[]).filter(
                    (b) => b.booking_status === "pending_admin_confirmation",
                  ).length
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Confirmed</div>
              <div className="mt-1 text-2xl font-bold">
                {(allBookings as any[]).filter((b) => b.booking_status === "confirmed").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Completed</div>
              <div className="mt-1 text-2xl font-bold">
                {(allBookings as any[]).filter((b) => b.booking_status === "completed").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Cancelled</div>
              <div className="mt-1 text-2xl font-bold">
                {(allBookings as any[]).filter((b) => b.booking_status === "cancelled").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">No Show</div>
              <div className="mt-1 text-2xl font-bold">
                {(allBookings as any[]).filter((b) => b.booking_status === "no_show").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                <span className="ml-1 rounded-full bg-muted px-1.5 text-xs">
                  {(allBookings as any[]).filter((b) => b.booking_status === tab.value).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-3">
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                  No bookings in this category.
                </CardContent>
              </Card>
            ) : (
              filtered.map((booking) => {
                const student = studentMap.get(booking.user_id);
                return (
                  <Card key={booking.id}>
                    <CardContent className="space-y-4 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">
                              {student?.full_name || "Unknown student"}
                            </div>
                            {getStatusBadge(booking.booking_status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {booking.booking_date
                                ? new Date(booking.booking_date).toDateString()
                                : "TBD"}{" "}
                              • {booking.booking_time_start || "TBD"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> {booking.duration_mins} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5" /> {booking.language}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {student?.email || "—"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {student?.phone || "—"}
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" /> {student?.current_level || "—"}
                            </span>
                            <span>Timezone: {student?.timezone || "—"}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Payment:{" "}
                            <Badge variant="outline" className="text-[10px]">
                              {booking.payment_status}
                            </Badge>{" "}
                            • Booked: {new Date(booking.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {booking.booking_status === "pending_admin_confirmation" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => openDialog(booking, "confirm")}
                                disabled={confirmMutation.isPending}
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" /> Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDialog(booking, "reschedule")}
                              >
                                Reschedule
                              </Button>
                            </>
                          )}
                          {booking.booking_status === "confirmed" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => openDialog(booking, "complete")}
                                disabled={completeMutation.isPending}
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" /> Mark Completed
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDialog(booking, "noShow")}
                                disabled={noShowMutation.isPending}
                              >
                                <UserX className="mr-1 h-4 w-4" /> No Show
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDialog(booking, "reschedule")}
                              >
                                Reschedule
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <Eye className="mr-1 h-4 w-4" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleCancel(booking)}
                            disabled={cancelMutation.isPending}
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Cancel
                          </Button>
                        </div>
                      </div>

                      {selectedBooking?.id === booking.id && (
                        <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
                          <div className="text-sm">
                            <div className="font-medium mb-1">Student Details</div>
                            <div className="text-muted-foreground">
                              {student ? (
                                <div className="space-y-1">
                                  <div>{student.full_name}</div>
                                  <div>{student.email}</div>
                                  <div>{student.phone || "No phone"}</div>
                                  <div>Level: {student.current_level || "—"}</div>
                                  <div>Native: {student.native_language || "—"}</div>
                                  <div>Goal: {student.learning_goal || "—"}</div>
                                </div>
                              ) : (
                                "Unavailable"
                              )}
                            </div>
                          </div>
                          <div className="text-sm">
                            <div className="font-medium mb-1">Booking Details</div>
                            <div className="text-muted-foreground space-y-1">
                              <div>Preferred: {booking.booking_date} {booking.booking_time_start}</div>
                              <div>Language: {booking.language}</div>
                              {booking.notes ? <div>Notes: {booking.notes}</div> : null}
                              {booking.meeting_link ? (
                                <div>
                                  Meeting:{" "}
                                  <a
                                    href={booking.meeting_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary underline"
                                  >
                                    {booking.meeting_link}
                                  </a>
                                </div>
                              ) : null}
                              {booking.admin_notes ? (
                                <div>Admin notes: {booking.admin_notes}</div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={dialog === "confirm"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Demo Session</DialogTitle>
            <DialogDescription>
              Set the meeting details. The student will be notified with the link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Language</Label>
                <Input value={selectedBooking?.language || ""} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={editTimeStart}
                  onChange={(e) => setEditTimeStart(e.target.value)}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={editTimeEnd}
                  onChange={(e) => setEditTimeEnd(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Video className="h-3.5 w-3.5" /> Meeting Link (Google Meet / Zoom)
              </Label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>
            <div>
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={confirmMutation.isPending}>
                {confirmMutation.isPending ? "Confirming..." : "Confirm Booking"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={dialog === "reschedule"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Demo Session</DialogTitle>
            <DialogDescription>Pick a new date and time for this demo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={editTimeStart}
                  onChange={(e) => setEditTimeStart(e.target.value)}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={editTimeEnd}
                  onChange={(e) => setEditTimeEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleReschedule} disabled={rescheduleMutation.isPending}>
                {rescheduleMutation.isPending ? "Rescheduling..." : "Reschedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={dialog === "complete"} onOpenChange={() => setDialog(null)}>
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
                placeholder="Session summary, areas covered, etc."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleComplete} disabled={completeMutation.isPending}>
                {completeMutation.isPending ? "Saving..." : "Mark Completed"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* No Show Dialog */}
      <Dialog open={dialog === "noShow"} onOpenChange={() => setDialog(null)}>
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
              <Button variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleNoShow} disabled={noShowMutation.isPending}>
                {noShowMutation.isPending ? "Saving..." : "Mark No-Show"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
