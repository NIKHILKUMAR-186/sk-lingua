import { format, parseISO, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export type AvailabilitySlot = {
  start: string;
  end: string;
  label?: string | null;
  is_blocked?: boolean;
};

export type AvailabilityValue = {
  timezone?: string | null;
  vacation_mode?: boolean;
  weekly?: Record<string, AvailabilitySlot[]>;
};

export type BookingSlotOption = {
  value: string;
  label: string;
  disabled: boolean;
  start: string;
  end: string;
};

export const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function normalizeAvailability(
  value?: Partial<AvailabilityValue> | null,
): AvailabilityValue {
  const weekly = value?.weekly ?? {};
  return {
    timezone: value?.timezone ?? null,
    vacation_mode: value?.vacation_mode ?? false,
    weekly: Object.fromEntries(
      DAY_KEYS.map((key) => [key, Array.isArray(weekly[key]) ? weekly[key] : []]),
    ),
  };
}

export function getDayKey(date: Date) {
  return DAY_KEYS[(date.getDay() + 6) % 7];
}

export function buildBookingSlotOptions({
  availability,
  selectedDate,
  sessions,
  durationMins,
}: {
  availability?: Partial<AvailabilityValue> | null;
  selectedDate: string;
  sessions: Array<{ id: string; scheduled_time: string; duration_mins: number; status: string }>;
  durationMins: number;
}): BookingSlotOption[] {
  const normalized = normalizeAvailability(availability);
  if (normalized.vacation_mode) return [];

  const dayKey = getDayKey(startOfDay(parseISO(selectedDate)));
  const slots = normalized.weekly?.[dayKey] ?? [];
  const dateStart = parseISO(selectedDate);

  return slots.flatMap((slot) => {
    if (slot.is_blocked) return [];
    const [startHour, startMinute] = slot.start.split(":").map(Number);
    const [endHour, endMinute] = slot.end.split(":").map(Number);
    const slotStart = new Date(dateStart);
    slotStart.setHours(startHour, startMinute, 0, 0);
    const slotEnd = new Date(dateStart);
    slotEnd.setHours(endHour, endMinute, 0, 0);
    if (slotEnd.getTime() - slotStart.getTime() < durationMins * 60_000) return [];

    const startIso = slotStart.toISOString();
    const endIso = slotEnd.toISOString();
    const conflict = sessions.some((item) => {
      if (item.status === "rejected" || item.status === "cancelled") return false;
      const existingStart = new Date(item.scheduled_time).getTime();
      const existingEnd = existingStart + item.duration_mins * 60_000;
      const proposedStart = new Date(startIso).getTime();
      const proposedEnd = proposedStart + durationMins * 60_000;
      return proposedStart < existingEnd && proposedEnd > existingStart;
    });

    return [
      {
        value: startIso,
        label: `${format(slotStart, "p")} – ${format(slotEnd, "p")}`,
        disabled: conflict,
        start: slot.start,
        end: slot.end,
      },
    ];
  });
}

export async function insertNotification(payload: {
  user_id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  kind?: string;
  category?: string;
  related_id?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const { error } = await supabase.from("notifications").insert({
    user_id: payload.user_id,
    title: payload.title,
    body: payload.body ?? null,
    link: payload.link ?? null,
    kind: payload.kind ?? "booking",
    category: payload.category ?? "booking",
    related_id: payload.related_id ?? null,
    metadata: (payload.metadata ?? null) as any,
  });

  if (error) throw error;
}

export async function createBookingNotifications({
  bookingId,
  mentorId,
  studentId,
  title,
  body,
  link,
  kind,
  category,
}: {
  bookingId: string;
  mentorId: string;
  studentId: string;
  title: string;
  body: string;
  link?: string;
  kind: string;
  category: string;
}) {
  await Promise.all([
    insertNotification({
      user_id: mentorId,
      title,
      body: `${body} (${title})`,
      link,
      kind,
      category,
      related_id: bookingId,
      metadata: { booking_id: bookingId },
    }),
    insertNotification({
      user_id: studentId,
      title,
      body: `${body} (${title})`,
      link,
      kind,
      category,
      related_id: bookingId,
      metadata: { booking_id: bookingId },
    }),
  ]);
}

export async function insertBookingHistory(payload: {
  booking_id: string;
  actor_id: string;
  action: string;
  details?: string | null;
}) {
  const { error } = await supabase.from("booking_history").insert({
    booking_id: payload.booking_id,
    actor_id: payload.actor_id,
    action: payload.action,
    details: payload.details ?? null,
  });

  if (error) throw error;
}
