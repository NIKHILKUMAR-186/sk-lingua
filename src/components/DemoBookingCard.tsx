import type { DemoBooking } from "@/lib/demo-bookings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Video,
  Globe,
  Mail,
  Phone,
  UserPlus,
  UserCheck,
  Eye,
  XCircle,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  UserX,
  Edit3,
} from "lucide-react";

interface DemoBookingCardProps {
  booking: DemoBooking;
  peopleMap: Map<string, any>;
  onSelect: (booking: DemoBooking) => void;
  onAssign: (booking: DemoBooking) => void;
  onTakeSession: (booking: DemoBooking) => void;
  onAddLink: (booking: DemoBooking) => void;
  onComplete: (booking: DemoBooking) => void;
  onNoShow: (booking: DemoBooking) => void;
  onCancel: (booking: DemoBooking) => void;
  isAssigning: boolean;
  isTakingSession: boolean;
  slotConflict?: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    pending_admin_confirmation: { label: "Pending Confirmation", variant: "secondary" },
    confirmed: { label: "Confirmed", variant: "default" },
    completed: { label: "Completed", variant: "default" },
    cancelled: { label: "Cancelled", variant: "destructive" },
    no_show: { label: "No Show", variant: "outline" },
  };
  const c = config[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function AssignmentBadge({ status }: { status: string | null }) {
  if (!status) {
    return <Badge variant="secondary">Unassigned</Badge>;
  }
  const config: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    unassigned: { label: "Unassigned", variant: "secondary" },
    pending_acceptance: { label: "Awaiting Mentor", variant: "outline" },
    accepted: { label: "Mentor Accepted", variant: "default" },
    confirmed: { label: "Confirmed", variant: "default" },
    rejected: { label: "Mentor Rejected", variant: "destructive" },
    needs_reassignment: { label: "Needs Reassignment", variant: "destructive" },
    expired: { label: "Assignment Expired", variant: "destructive" },
    cancelled: { label: "Cancelled", variant: "outline" },
  };
  const c = config[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function CountdownDisplay({ booking }: { booking: DemoBooking }) {
  if (booking.assignment_status !== "pending_acceptance" || !booking.acceptance_deadline)
    return null;

  const remaining = Math.max(
    0,
    Math.floor((new Date(booking.acceptance_deadline).getTime() - Date.now()) / 1000),
  );
  if (remaining <= 0) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  let urgencyClass = "text-green-600";
  if (remaining < 120) urgencyClass = "text-red-600 animate-pulse";
  else if (remaining < 300) urgencyClass = "text-orange-600 font-semibold";

  return (
    <div className={`flex items-center gap-1 text-sm ${urgencyClass} mt-1`}>
      <Clock className="h-3 w-3" />
      <span>
        {minutes}:{seconds.toString().padStart(2, "0")} remaining
      </span>
    </div>
  );
}

function isAttentionRequired(booking: DemoBooking): boolean {
  if (booking.assignment_status === "expired") return true;
  if (booking.assignment_status === "rejected") return true;
  if (booking.assignment_status === "needs_reassignment") return true;
  if (
    (booking.assignment_status === "accepted" || booking.assignment_status === "confirmed") &&
    !booking.meeting_link &&
    booking.booking_status === "confirmed"
  ) {
    const sessionStart = new Date(`${booking.booking_date}T${booking.booking_time_start}`);
    const now = new Date();
    const diffMs = sessionStart.getTime() - now.getTime();
    if (diffMs > 0 && diffMs < 15 * 60 * 1000) return true;
  }
  return false;
}

export function DemoBookingCard({
  booking,
  peopleMap,
  onSelect,
  onAssign,
  onTakeSession,
  onAddLink,
  onComplete,
  onNoShow,
  onCancel,
  isAssigning,
  isTakingSession,
  slotConflict,
}: DemoBookingCardProps) {
  const student = peopleMap.get(booking.user_id || "");
  const mentor = booking.mentor_id ? peopleMap.get(booking.mentor_id) : null;
  const admin = booking.admin_id ? peopleMap.get(booking.admin_id) : null;

  const assignmentStatus = booking.assignment_status || "unassigned";
  const isPreSession = !["completed", "cancelled", "no_show"].includes(booking.booking_status);
  const isPendingAssignment = ["unassigned", "needs_reassignment", "expired", "rejected"].includes(
    assignmentStatus,
  );
  const isAwaitingMentor = assignmentStatus === "pending_acceptance";
  const isAccepted = assignmentStatus === "accepted";
  const hasMeetingLink = !!booking.meeting_link;
  const isConfirmedBooking = booking.booking_status === "confirmed";

  const nextActions: string[] = [];
  if (isPendingAssignment) nextActions.push("Assign Mentor or Take Session");
  if (isAwaitingMentor) nextActions.push("Waiting for mentor response");
  if ((isAccepted || assignmentStatus === "confirmed") && !hasMeetingLink)
    nextActions.push("Add meeting link");
  if (isConfirmedBooking && hasMeetingLink) nextActions.push("Ready to join");

  const conductorName = mentor?.full_name || (admin ? `${admin.full_name} (Admin)` : "Unassigned");

  return (
    <Card className={isAttentionRequired(booking) ? "border-destructive/30 bg-muted/20" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-medium">{student?.full_name || "Unknown student"}</div>
              <StatusBadge status={booking.booking_status} />
              <AssignmentBadge status={booking.assignment_status} />
              {isAttentionRequired(booking) && (
                <Badge variant="destructive" className="text-xs">
                  ⚠ Attention Required
                </Badge>
              )}
            </div>

            {/* Countdown */}
            {isAwaitingMentor && <CountdownDisplay booking={booking} />}

            {/* Slot conflict warning (informational) */}
            {slotConflict && (
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <AlertTriangle className="h-3 w-3" />
                <span>
                  This mentor may have another session around this time (informational only)
                </span>
              </div>
            )}

            {/* Session details */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {booking.booking_date
                  ? new Date(booking.booking_date).toDateString()
                  : "TBD"} • {booking.booking_time_start || "TBD"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {booking.duration_mins} min
              </span>
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" /> {booking.language}
              </span>
            </div>

            {/* Conductor info */}
            <div className="text-sm">
              <span className="text-muted-foreground">Conducted by: </span>
              <span className="font-medium">{conductorName}</span>
              {assignmentStatus === "confirmed" && !booking.mentor_id && (
                <span className="text-muted-foreground"> (Admin)</span>
              )}
              {assignmentStatus === "pending_acceptance" && booking.mentor_id && (
                <Badge variant="outline" className="ml-1 text-xs">
                  Pending response...
                </Badge>
              )}
              {assignmentStatus === "rejected" && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  Rejected
                </Badge>
              )}
              {assignmentStatus === "expired" && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  Expired
                </Badge>
              )}
            </div>

            {/* Next action */}
            {nextActions.length > 0 && (
              <div className="text-xs text-muted-foreground">Next: {nextActions.join(" → ")}</div>
            )}

            {/* Student details */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {student?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {student.email}
                </span>
              )}
              {student?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {student.phone}
                </span>
              )}
              {student?.current_level && <span>Level: {student.current_level}</span>}
            </div>

            {/* Meeting link */}
            {hasMeetingLink && (
              <div className="flex items-center gap-1 text-xs">
                <Video className="h-3 w-3 text-green-600" />
                <span className="text-green-600">Meeting link added</span>
              </div>
            )}

            {/* Booking metadata */}
            <div className="text-xs text-muted-foreground">
              Booked: {new Date(booking.created_at).toLocaleString()} • Payment:{" "}
              <Badge variant="outline" className="text-[10px]">
                {booking.payment_status}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isPendingAssignment && (
              <>
                <Button size="sm" onClick={() => onAssign(booking)} disabled={isAssigning}>
                  <UserPlus className="mr-1 h-4 w-4" />
                  {assignmentStatus === "expired" ||
                  assignmentStatus === "rejected" ||
                  assignmentStatus === "needs_reassignment"
                    ? "Reassign"
                    : "Assign Mentor"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTakeSession(booking)}
                  disabled={isTakingSession}
                >
                  <UserCheck className="mr-1 h-4 w-4" /> Take Session
                </Button>
              </>
            )}

            {isAwaitingMentor && (
              <Button size="sm" variant="outline" onClick={() => onAssign(booking)}>
                <RefreshCw className="mr-1 h-4 w-4" /> Reassign
              </Button>
            )}

            {(isAccepted || assignmentStatus === "confirmed") &&
              !hasMeetingLink &&
              isPreSession && (
                <Button size="sm" onClick={() => onAddLink(booking)}>
                  <Edit3 className="mr-1 h-4 w-4" /> Add Meeting Link
                </Button>
              )}

            {isConfirmedBooking && hasMeetingLink && (
              <>
                <Button size="sm" onClick={() => onComplete(booking)}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Mark Completed
                </Button>
                <Button size="sm" variant="outline" onClick={() => onNoShow(booking)}>
                  <UserX className="mr-1 h-4 w-4" /> No Show
                </Button>
                <Button size="sm" variant="outline" onClick={() => onCancel(booking)}>
                  <XCircle className="mr-1 h-4 w-4" /> Cancel
                </Button>
              </>
            )}

            {!isConfirmedBooking && isPreSession && (
              <Button size="sm" variant="outline" onClick={() => onCancel(booking)}>
                <XCircle className="mr-1 h-4 w-4" /> Cancel
              </Button>
            )}

            <Button size="sm" variant="ghost" onClick={() => onSelect(booking)}>
              <Eye className="mr-1 h-4 w-4" /> View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
