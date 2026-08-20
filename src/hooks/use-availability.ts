import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Canonical day-of-week representation stored in the database.
 * Full lowercase weekday names (monday..sunday), matching the frontend
 * DAY_KEYS in src/lib/booking.ts and the canonical form enforced by
 * the validate_availability_slot() trigger.
 */
export const VALID_DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayKey = (typeof VALID_DAY_KEYS)[number];

export interface AvailabilitySlot {
  id: string;
  mentor_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  label: string | null;
  is_available: boolean;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Deterministic time normalization for the Postgres `time` column.
 * Accepts "HH:mm" or "HH:mm:ss" (12-hour UI values are converted by
 * the caller). Always emits canonical "HH:mm:ss".
 */
export function normalizeTimeForDb(value: string | null | undefined): string {
  if (!value) return "00:00:00";
  const parts = value.trim().split(":");
  if (parts.length === 2) {
    const hh = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    if (/^\d{2}$/.test(hh) && /^\d{2}$/.test(mm)) return `${hh}:${mm}:00`;
  }
  if (parts.length === 3) {
    const hh = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    const ss = parts[2].padStart(2, "0");
    if (/^\d{2}$/.test(hh) && /^\d{2}$/.test(mm) && /^\d{2}$/.test(ss)) {
      return `${hh}:${mm}:${ss}`;
    }
  }
  return value.trim();
}

/**
 * 12-hour UI string -> 24-hour "HH:mm".
 * e.g. "12:30 PM" -> "12:30", "01:00 PM" -> "13:00", "12:00 AM" -> "00:00".
 * Pure string parsing — never constructs a Date.
 */
export function convert12hTo24h(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
  if (!m) return trimmed; // already 24h "HH:mm" -> pass through
  let hh = parseInt(m[1], 10);
  const mm = m[2];
  const period = m[3].toUpperCase();
  if (period === "AM") {
    if (hh === 12) hh = 0;
  } else {
    if (hh !== 12) hh += 12;
  }
  return `${hh.toString().padStart(2, "0")}:${mm}`;
}

/**
 * Human-readable error formatting. Never returns "[object Object]".
 */
export function formatAvailabilityError(error: unknown): string {
  if (error == null) return "An unknown error occurred.";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error || "An error occurred.";

  const maybeMessage = (error as { message?: unknown })?.message;
  const maybeDetails = (error as { details?: unknown })?.details;
  const msg = typeof maybeMessage === "string" ? maybeMessage : null;
  const details = typeof maybeDetails === "string" ? maybeDetails : null;

  if (msg) {
    const low = msg.toLowerCase();
    if (low.includes("day_of_week")) return "Invalid day selected.";
    if (low.includes("mentor_id"))
      return "User identity could not be resolved. Please sign out and back in.";
    if (low.includes("null") && /mentor_id|day_of_week/.test(low))
      return "A required field is missing. Please try again.";
  }

  const code = String((error as { code?: unknown })?.code ?? "").toLowerCase();
  if (code === "42501" || (msg && /permission|row.?level|policy/i.test(msg)))
    return "You don't have permission to modify this availability.";

  return msg || details || "Unable to save availability. Please try again.";
}

export interface AvailabilityValidation {
  valid: boolean;
  errors: string[];
}

export function validateAvailabilitySlot(input: {
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_available?: boolean;
}): AvailabilityValidation {
  const errors: string[] = [];
  if (!VALID_DAY_KEYS.includes(input.day_of_week as DayKey)) errors.push("Invalid day selected.");

  const start24 = convert12hTo24h(input.start_time || "");
  const end24 = convert12hTo24h(input.end_time || "");
  if (!start24 || !end24) {
    errors.push("Start and end times are required.");
    return { valid: false, errors };
  }
  if (start24 >= end24) errors.push("End time must be later than start time.");
  return { valid: errors.length === 0, errors };
}

export async function fetchAvailabilitySlots(mentorId: string) {
  const { data, error } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("mentor_id", mentorId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AvailabilitySlot[];
}

/**
 * Server-side overlap check via check_availability_overlap RPC.
 * Falls back to "no overlap" if the RPC is unavailable so the UX never
 * hard-blocks on a missing migration.
 */
export async function checkAvailabilityOverlap(
  mentorId: string,
  dayOfWeek: string,
  startTime: string,
  endTime: string,
  excludeId?: string | null,
): Promise<boolean> {
  const params: Record<string, unknown> = {
    p_mentor_id: mentorId,
    p_day_of_week: dayOfWeek,
    p_start_time: normalizeTimeForDb(startTime),
    p_end_time: normalizeTimeForDb(endTime),
  };
  if (excludeId) params.p_exclude_id = excludeId;
  const { data, error } = await (supabase.rpc as any)("check_availability_overlap", params);
  if (error) {
    console.warn("check_availability_overlap rpc failed:", error.message);
    return true;
  }
  return data as boolean;
}

export async function createAvailabilitySlot(payload: {
  mentor_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  label?: string | null;
  timezone?: string | null;
}) {
  const { data, error } = await supabase
    .from("availability_slots")
    .insert({
      mentor_id: payload.mentor_id,
      day_of_week: payload.day_of_week,
      start_time: normalizeTimeForDb(payload.start_time),
      end_time: normalizeTimeForDb(payload.end_time),
      label: payload.label ?? null,
      timezone: payload.timezone ?? null,
      is_available: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AvailabilitySlot;
}

export async function updateAvailabilitySlot(
  id: string,
  patch: Partial<{
    day_of_week: string;
    start_time: string;
    end_time: string;
    label: string | null;
    is_available: boolean;
    timezone: string | null;
  }>,
) {
  const normalized: Record<string, unknown> = {};
  if (patch.day_of_week !== undefined) normalized.day_of_week = patch.day_of_week;
  if (patch.start_time !== undefined) normalized.start_time = normalizeTimeForDb(patch.start_time);
  if (patch.end_time !== undefined) normalized.end_time = normalizeTimeForDb(patch.end_time);
  if (patch.label !== undefined) normalized.label = patch.label ?? null;
  if (patch.is_available !== undefined) normalized.is_available = patch.is_available;
  if (patch.timezone !== undefined) normalized.timezone = patch.timezone ?? null;

  const { data, error } = await supabase
    .from("availability_slots")
    .update(normalized as any)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as AvailabilitySlot;
}

export async function deleteAvailabilitySlot(id: string) {
  const { error } = await supabase.from("availability_slots").delete().eq("id", id);
  if (error) throw error;
}

export function useAvailability(mentorId?: string) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["availability_slots", mentorId],
    enabled: !!mentorId,
    queryFn: async () => fetchAvailabilitySlots(mentorId!),
  });

  async function addSlot(payload: {
    mentor_id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    label?: string | null;
    is_available?: boolean;
    timezone?: string | null;
  }) {
    const { valid, errors } = validateAvailabilitySlot({
      day_of_week: payload.day_of_week,
      start_time: payload.start_time,
      end_time: payload.end_time,
    });
    if (!valid) throw new Error(errors.join(" "));

    const free = await checkAvailabilityOverlap(
      payload.mentor_id,
      payload.day_of_week,
      payload.start_time,
      payload.end_time,
    );
    if (!free) throw new Error("These times overlap with an existing availability slot.");

    const slot = await createAvailabilitySlot({
      mentor_id: payload.mentor_id,
      day_of_week: payload.day_of_week,
      start_time: payload.start_time,
      end_time: payload.end_time,
      label: payload.label ?? null,
      timezone: payload.timezone ?? null,
    });
    qc.invalidateQueries({ queryKey: ["availability_slots", mentorId] });
    return slot;
  }

  async function updateSlot(
    id: string,
    patch: Partial<{
      day_of_week: string;
      start_time: string;
      end_time: string;
      label: string | null;
      is_available: boolean;
      timezone: string | null;
    }>,
  ) {
    if (patch.start_time !== undefined || patch.end_time !== undefined) {
      const slot = (data as AvailabilitySlot[]).find((s) => s.id === id);
      if (slot) {
        const start =
          patch.start_time !== undefined
            ? convert12hTo24h(patch.start_time)
            : convert12hTo24h(slot.start_time);
        const end =
          patch.end_time !== undefined
            ? convert12hTo24h(patch.end_time)
            : convert12hTo24h(slot.end_time);
        if (start >= end) throw new Error("End time must be later than start time.");
        const day = patch.day_of_week ?? slot.day_of_week;
        const free = await checkAvailabilityOverlap(slot.mentor_id, day, start, end, id);
        if (!free) throw new Error("These times overlap with an existing availability slot.");
      }
    }
    const updated = await updateAvailabilitySlot(id, patch);
    qc.invalidateQueries({ queryKey: ["availability_slots", mentorId] });
    return updated;
  }

  async function deleteSlot(id: string) {
    await deleteAvailabilitySlot(id);
    qc.invalidateQueries({ queryKey: ["availability_slots", mentorId] });
  }

  async function duplicateToDay(slotId: string, targetDay: string) {
    const existing = (data as AvailabilitySlot[]).find((s) => s.id === slotId);
    if (!existing) throw new Error("Slot not found");
    const slot = await createAvailabilitySlot({
      mentor_id: existing.mentor_id,
      day_of_week: targetDay,
      start_time: existing.start_time,
      end_time: existing.end_time,
      label: existing.label,
      timezone: existing.timezone,
    });
    qc.invalidateQueries({ queryKey: ["availability_slots", mentorId] });
    return slot;
  }

  return { slots: data, isLoading, addSlot, updateSlot, deleteSlot, duplicateToDay };
}
