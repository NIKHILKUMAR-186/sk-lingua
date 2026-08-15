import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * P5 — Student slot booking.
 *
 * The authoritative booking is performed server-side by the Postgres RPC
 * `create_booking_atomic`, which:
 *   - resolves the student from the authenticated session (auth.uid()),
 *   - validates the active subscription, expiry and session balance,
 *   - validates the mentor + slot against P4 availability and the DB clock,
 *   - creates the booking, deducts exactly one session, and writes one ledger
 *     entry — all atomically, guarded by a partial unique index on
 *     (mentor_id, scheduled_time).
 *
 * The browser only supplies mentor_id + the absolute slot timestamp; it can
 * never choose who gets charged, nor bypass the balance/slot checks.
 */

export interface ConfirmBookingInput {
  mentorId: string;
  scheduledStart: string; // absolute ISO timestamp (timestamptz)
  durationMins?: number;
}

/** Friendly, user-safe message mapping (never leak raw DB/stack details). */
export function mapBookingError(message: string | null | undefined): string {
  const msg = (message ?? "").toLowerCase();
  if (msg.includes("no active subscription")) {
    return "You don't have an active subscription.";
  }
  if (msg.includes("has expired")) {
    return "Your subscription has expired.";
  }
  if (msg.includes("no sessions remaining")) {
    return "You have no sessions remaining.";
  }
  if (msg.includes("just booked by another student")) {
    return "This slot was just booked by another student. Please choose another time.";
  }
  if (msg.includes("slot is no longer available")) {
    return "Slot is no longer available.";
  }
  if (msg.includes("not authenticated")) {
    return "Please sign in to continue.";
  }
  if (msg.includes("booking rejected")) {
    return "Booking rejected. Please choose another time.";
  }
  return "Unable to book this session. Please try again.";
}

export function useConfirmBooking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConfirmBookingInput): Promise<any> => {
      const { data, error } = await supabase.rpc("create_booking_atomic", {
        p_mentor_id: input.mentorId,
        p_scheduled_start: input.scheduledStart,
        p_duration_mins: input.durationMins ?? 30,
      });

      if (error) {
        console.error("[P5 booking] rpc error:", error);
        throw new Error(mapBookingError(error.message));
      }
      return data;
    },
    onSuccess: () => {
      // Invalidate the data that must reflect the new booking:
      // available slots (backend state), session balance, upcoming bookings.
      qc.invalidateQueries({ queryKey: ["sessions-date"] });
      qc.invalidateQueries({ queryKey: ["mentor-schedule"] });
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
      qc.invalidateQueries({ queryKey: ["student-subscription"] });
      qc.invalidateQueries({ queryKey: ["remaining-slots"] });
      qc.invalidateQueries({ queryKey: ["can-book-session"] });
      qc.invalidateQueries({ queryKey: ["upcoming-sessions"] });
      qc.invalidateQueries({ queryKey: ["student-sessions"] });
    },
  });
}
