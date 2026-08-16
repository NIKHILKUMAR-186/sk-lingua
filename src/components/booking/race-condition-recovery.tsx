import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock } from "lucide-react";
import {
  type BookingMentorViewModel,
  type BookingSlotViewModel,
  closestAlternatives,
} from "@/lib/booking/view-models";

/**
 * RaceConditionRecovery
 *
 * When a selected slot is consumed by another student at the moment of
 * confirmation, do NOT show a generic "Something went wrong." Instead, tell the
 * user "That time was just booked" and offer REAL closest alternatives with
 * one-click replacement — so they never restart the whole flow.
 */
interface RaceConditionRecoveryProps {
  open: boolean;
  mentor: BookingMentorViewModel | null;
  failedSlotValue?: string | null;
  onSelectAlternative: (slot: BookingSlotViewModel) => void;
  onDismiss: () => void;
}

export function RaceConditionRecovery({
  open,
  mentor,
  failedSlotValue,
  onSelectAlternative,
  onDismiss,
}: RaceConditionRecoveryProps) {
  const alternatives = closestAlternatives(mentor, failedSlotValue, 3);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            That time was just booked
          </DialogTitle>
          <DialogDescription>
            Another student snagged it a moment ago. Here are the closest available times with{" "}
            {mentor?.name || "this mentor"} — pick one to continue, no need to start over.
          </DialogDescription>
        </DialogHeader>

        {alternatives.length > 0 ? (
          <div className="space-y-2">
            {alternatives.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => onSelectAlternative(slot)}
                className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium">{slot.startLabel}</span>
                <span className="ml-auto text-xs text-muted-foreground">Select · one click</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No other times are open with this mentor right now. Try another time or browse other
            mentors.
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onDismiss}>
            Keep browsing
          </Button>
          {alternatives.length > 0 && (
            <Button variant="ghost" className="flex-1" onClick={onDismiss}>
              Not now
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
