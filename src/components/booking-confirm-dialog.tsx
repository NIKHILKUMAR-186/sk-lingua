import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Languages, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useConfirmBooking, mapBookingError } from "@/hooks/use-student-booking";
import { toast } from "sonner";

interface BookingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mentorId: string;
  mentorName: string;
  slot: { value: string; label: string };
  date: string;
  durationMins?: number;
  language?: string;
  /** Invoked when the selected slot was just taken by another student. */
  onRaceConflict?: (message: string) => void;
}

export function BookingConfirmDialog({
  open,
  onOpenChange,
  mentorId,
  mentorName,
  slot,
  date,
  durationMins = 30,
  language = "English",
  onRaceConflict,
}: BookingConfirmDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const confirmMutation = useConfirmBooking();

  function isRaceConflict(message: string): boolean {
    const msg = (message || "").toLowerCase();
    return (
      msg.includes("just booked") ||
      msg.includes("no longer available") ||
      msg.includes("just reserved") ||
      msg.includes("rejected")
    );
  }

  async function handleConfirm() {
    if (!slot.value) return;

    setIsPending(true);
    try {
      const result = await confirmMutation.mutateAsync({
        mentorId,
        scheduledStart: slot.value,
        durationMins,
      });

      toast.success("Session booked successfully");
      onOpenChange(false);
      confirmMutation.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : mapBookingError(null);
      toast.error(message);
      if (isRaceConflict(message)) {
        onRaceConflict?.(message);
      }
    } finally {
      setIsPending(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      confirmMutation.reset();
      setIsPending(false);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Confirm Booking
          </DialogTitle>
          <DialogDescription>
            Please review your session details before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Mentor</span>
            <span className="font-medium">{mentorName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-4 w-4" /> Date
            </span>
            <span className="font-medium">{format(new Date(date), "d MMMM yyyy")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" /> Time
            </span>
            <span className="font-medium">{slot.label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" /> Duration
            </span>
            <span className="font-medium">{durationMins} minutes</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Languages className="h-4 w-4" /> Language
            </span>
            <span className="font-medium">{language}</span>
          </div>
        </div>

        {confirmMutation.isError && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {confirmMutation.error instanceof Error
                ? confirmMutation.error.message
                : "Unable to book. Please try again."}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Booking..." : "Confirm Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
