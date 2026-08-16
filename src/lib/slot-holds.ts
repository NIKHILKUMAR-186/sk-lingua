import { supabase } from "@/integrations/supabase/client";
import { getBookingRules } from "@/lib/booking-rules";

export interface BookingHold {
  id: string;
  mentor_id: string;
  student_id: string;
  scheduled_time: string;
  duration_mins: number;
  status: string;
  expires_at: string;
  created_at: string;
  released_at: string | null;
  booking_id: string | null;
}

export interface CreateHoldInput {
  mentorId: string;
  scheduledStart: string;
  durationMins?: number;
}

export interface CreateHoldResult {
  success: boolean;
  hold?: BookingHold;
  error?: string;
  expiresAt?: string;
}

function mapHoldError(message: string | null | undefined): string {
  const msg = (message ?? "").toLowerCase();
  if (msg.includes("not authenticated")) {
    return "Please sign in to continue.";
  }
  if (msg.includes("slot is no longer available")) {
    return "This slot is no longer available. Please choose another time.";
  }
  if (msg.includes("slot_hold_expired") || msg.includes("slot hold expired")) {
    return "Your hold on this slot has expired. Please select the slot again.";
  }
  if (msg.includes("just booked by another student")) {
    return "This slot was just booked by another student. Please choose another time.";
  }
  if (msg.includes("just held by another student")) {
    return "This slot was just reserved by another student. Please choose another time.";
  }
  if (msg.includes("mentor_inactive") || msg.includes("inactive")) {
    return "This mentor is no longer available.";
  }
  if (msg.includes("booking rejected")) {
    return "This booking is no longer valid. Please try again.";
  }
  if (msg.includes("booking_notice_violation")) {
    return "This slot is too soon. Please choose a later time.";
  }
  if (msg.includes("booking_window_exceeded")) {
    return "This slot is too far in the future. Please choose an earlier time.";
  }
  return "Unable to reserve this slot. Please try again.";
}

export async function createSlotHold(input: CreateHoldInput): Promise<CreateHoldResult> {
  try {
    const rules = await getBookingRules();
    const holdMinutes = rules.slot_hold_minutes;

    const { data, error } = await (supabase.rpc as any)("create_slot_hold", {
      p_mentor_id: input.mentorId,
      p_scheduled_start: input.scheduledStart,
      p_duration_mins: input.durationMins ?? rules.session_duration_minutes,
      p_hold_minutes: holdMinutes,
    });

    if (error) {
      console.error("[hold] create_slot_hold error:", error);
      return {
        success: false,
        error: mapHoldError(error.message),
      };
    }

    return {
      success: true,
      hold: data as BookingHold,
      expiresAt: data.expires_at,
    };
  } catch (e) {
    console.error("[hold] createSlotHold unexpected error:", e);
    return {
      success: false,
      error: "Unable to reserve this slot. Please try again.",
    };
  }
}

export async function releaseSlotHold(holdId: string): Promise<boolean> {
  try {
    const { data, error } = await (supabase.rpc as any)("release_slot_hold", {
      p_hold_id: holdId,
    });

    if (error || !data) {
      console.error("[hold] release_slot_hold error:", error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("[hold] releaseSlotHold unexpected error:", e);
    return false;
  }
}

export async function cleanupExpiredHolds(): Promise<number> {
  try {
    const { data, error } = await (supabase.rpc as any)("cleanup_expired_holds");
    if (error) {
      console.error("[hold] cleanup_expired_holds error:", error);
      return 0;
    }
    return data ?? 0;
  } catch (e) {
    console.error("[hold] cleanupExpiredHolds unexpected error:", e);
    return 0;
  }
}

export function getHoldRemainingSeconds(expiresAt: string): number {
  const expires = new Date(expiresAt).getTime();
  const now = Date.now();
  const diff = Math.round((expires - now) / 1000);
  return Math.max(0, diff);
}

export function formatHoldRemaining(expiresAt: string): string {
  const seconds = getHoldRemainingSeconds(expiresAt);
  if (seconds <= 0) return "Expired";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
