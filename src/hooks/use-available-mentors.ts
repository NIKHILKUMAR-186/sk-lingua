import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { DAY_KEYS } from "@/lib/booking";
import { safeDate as safeDateResult } from "@/lib/safe-datetime";
import { useBookingRules } from "@/hooks/use-booking-rules";
import {
  localToUtcInstant,
  studentDateRange,
  localDatesInRange,
  weekdayLongLower,
  formatLocalTime,
  h24ToH12,
  parseTime24,
} from "@/lib/timezone-utils";

export type TimeGroup = "morning" | "afternoon" | "evening" | "night";

export interface SlotOption {
  value: string;
  label: string;
  disabled: boolean;
  startTime: string;
  endTime: string;
  group: TimeGroup;
}

export interface AvailableMentor {
  user_id: string;
  headline: string | null;
  bio: string | null;
  rating_avg: number;
  total_reviews: number;
  total_students: number;
  total_sessions: number;
  languages_taught: string[];
  years_experience: number;
  is_verified: boolean;
  demo_lesson_url: string | null;
  teaching_style: string | null;
  cover_url: string | null;
  timezone: string | null;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    state: string | null;
  } | null;
  slotOptions: SlotOption[];
  availableSlots: SlotOption[];
  earliestSlot: SlotOption | null;
  totalAvailable: number;
}

function dateFromString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getDateDayKey(dateStr: string): string {
  const dt = dateFromString(dateStr);
  return DAY_KEYS[(dt.getDay() + 6) % 7];
}

function getTimeGroup(hour: number): TimeGroup {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function safeDate(value: unknown): Date | null {
  const result = safeDateResult(value);
  return result.valid ? result.value : null;
}


interface SlotWithMentor {
  slot: any;
  mentor: any;
  sessions: any[];
  holds: any[];
  durationMins: number;
  studentTimezone: string;
  selectedDate: string;
  now: number;
  minNoticeMs: number;
  maxWindowMs: number;
}

function computeSlotsForMentorDate(params: SlotWithMentor[]): SlotOption[] {
  const results: SlotOption[] = [];
  const seen = new Set<string>();

  for (const {
    slot,
    mentor,
    sessions,
    holds,
    durationMins,
    studentTimezone,
    selectedDate,
    now,
    minNoticeMs,
    maxWindowMs,
  } of params) {
    const tz = mentor?.timezone || slot?.timezone || "UTC";

    // --- 1. Student's local calendar day as a UTC window ---
    const range = studentDateRange(selectedDate, studentTimezone);
    if (!range) continue;

    // --- 2. Mentor-local dates overlapping this student day ---
    const localDates = localDatesInRange(range.start, range.end, tz);

    // --- 3. Parse the slot's local time window ---
    const startT = parseTime24(slot.start_time);
    const endT = parseTime24(slot.end_time);
    if (!startT || !endT) continue;
    const startMin = startT.hour * 60 + startT.minute;
    const endMin = endT.hour * 60 + endT.minute;
    if (endMin <= startMin || endMin - startMin < durationMins) continue;

    // --- 4. Match weekday in the MENTOR's timezone (single UTC conversion) ---
    const slotDay = (slot.day_of_week || "").toLowerCase().trim();
    if (!slotDay) continue;

    for (const ld of localDates) {
      const noonMs = localToUtcInstant(ld.year, ld.month, ld.day, 12, 0, tz) ?? 0;
      if (weekdayLongLower(noonMs, tz) !== slotDay) continue;

      const occStart = localToUtcInstant(
        ld.year, ld.month, ld.day, startT.hour, startT.minute, tz,
      );
      const occEnd = localToUtcInstant(
        ld.year, ld.month, ld.day, endT.hour, endT.minute, tz,
      );
      if (occStart == null || occEnd == null) continue;
      if (occEnd - occStart < durationMins * 60_000) continue;

      const proposedStart = occStart;
      const proposedEnd = proposedStart + durationMins * 60_000;

      // --- 5. Exclude past / out-of-window occurrences ---
      if (proposedStart <= now) continue;
      if (proposedStart < now + minNoticeMs) continue;
      if (proposedStart > now + maxWindowMs) continue;

      // --- 6. Exclude booked occurrences ---
      const hasBookingConflict = sessions.some((s) => {
        if (s.status === "cancelled" || s.status === "rejected") return false;
        const es = safeDate(s.scheduled_time);
        if (!es) return false;
        const existingEnd = es.getTime() + s.duration_mins * 60_000;
        return proposedStart < existingEnd && proposedEnd > es.getTime();
      });

      // --- 7. Exclude actively-held occurrences ---
      const hasHoldConflict = holds.some((h) => {
        if (h.status !== "active") return false;
        const hs = safeDate(h.scheduled_time);
        if (!hs) return false;
        const holdEnd = hs.getTime() + h.duration_mins * 60_000;
        return proposedStart < holdEnd && proposedEnd > hs.getTime();
      });

      if (hasBookingConflict || hasHoldConflict) continue; // gone for this student

      // --- 8. Dedup identical slots (same UTC instant) ---
      const value = new Date(proposedStart).toISOString();
      if (seen.has(value)) continue;
      seen.add(value);

      // Display label is the slot start/end rendered in the student's tz.
      const startDisplay = parseTime24(formatLocalTime(proposedStart, studentTimezone));
      const endDisplay = parseTime24(formatLocalTime(proposedEnd, studentTimezone));
      const label = `${h24ToH12(startDisplay!.hour, startDisplay!.minute)} – ${h24ToH12(endDisplay!.hour, endDisplay!.minute)}`;

      results.push({
        value,
        label,
        disabled: false,
        startTime: slot.start_time,
        endTime: slot.end_time,
        group: getTimeGroup(startDisplay!.hour),
      });
    }
  }

  return results;
}

function buildMentorSlotParams(
  daySlots: any[],
  mentor: any,
  mentorSessions: any[],
  mentorHolds: any[],
  selectedDate: string,
  durationMins: number,
  studentTimezone: string,
  now: number,
  minNoticeMs: number,
  maxWindowMs: number,
) {
  return daySlots.map((slot) => ({
    slot,
    mentor,
    sessions: mentorSessions,
    holds: mentorHolds,
    durationMins,
    selectedDate,
    studentTimezone,
    now,
    minNoticeMs,
    maxWindowMs,
  }));
}

export function useAvailableMentors(date?: string) {
  const selectedDate = date || format(new Date(), "yyyy-MM-dd");
  const dayKey = useMemo(() => getDateDayKey(selectedDate), [selectedDate]);
  const { data: rulesData } = useBookingRules();
  const durationMins = rulesData?.session_duration_minutes ?? 30;

  const { data: mentors = [], isLoading: mentorsLoading } = useQuery({
    queryKey: ["available-mentors-list"],
    queryFn: async () => {
      const { data: mps } = await supabase
        .from("mentor_profiles")
        .select(
          "user_id, headline, bio, rating_avg, total_reviews, total_students, total_sessions, languages_taught, years_experience, is_verified, demo_lesson_url, teaching_style, cover_url, timezone",
        )
        .eq("is_active", true);

      if (!mps?.length) return [];

      const ids = mps.map((x: any) => x.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, state")
        .in("id", ids);

      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));

      return mps.map((x: any) => ({
        ...x,
        profile: byId.get(x.user_id) || null,
      })) as AvailableMentor[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const { data: allSlots = [] } = useQuery({
    queryKey: ["availability-slots-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("is_available", true);
      return data ?? [];
    },
    staleTime: 1000 * 30,
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ["sessions-date-range"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const future = format(addDays(new Date(), 14), "yyyy-MM-dd");
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .gte("scheduled_time", `${today}T00:00:00`)
        .lte("scheduled_time", `${future}T23:59:59`)
        .neq("status", "cancelled")
        .neq("status", "rejected");
      return data ?? [];
    },
    staleTime: 1000 * 30,
  });

  const { data: allHolds = [] } = useQuery({
    queryKey: ["booking-holds-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_holds")
        .select("*")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString());
      return data ?? [];
    },
    staleTime: 1000 * 15,
  });

    const availableMentors = useMemo(() => {
    if (!mentors.length || !allSlots.length) return [];

    const studentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = Date.now();
    const minNoticeMs = (rulesData?.minimum_booking_notice_minutes ?? 30) * 60 * 1000;
    const maxWindowMs = (rulesData?.maximum_booking_days ?? 30) * 24 * 60 * 60 * 1000;

    // Group slots by mentor ONLY (all of the mentor's slots). Weekday matching
    // is performed in the mentor's timezone inside computeSlotsForMentorDate —
    // never by the student's local weekday, which caused Tuesday IST slots to
    // vanish for students in other timezones.
    const slotsByMentor = new Map<string, any[]>();
    for (const slot of allSlots) {
      const list = slotsByMentor.get(slot.mentor_id) || [];
      list.push(slot);
      slotsByMentor.set(slot.mentor_id, list);
    }

    // Conflict detection uses absolute UTC instants, so sessions/holds are
    // grouped by mentor only — no student-local date keying, which caused
    // off-by-one date-boundary mismatches across timezones.
    const sessionsByMentor = new Map<string, any[]>();
    for (const session of allSessions) {
      const list = sessionsByMentor.get(session.mentor_id) || [];
      list.push(session);
      sessionsByMentor.set(session.mentor_id, list);
    }
    const holdsByMentor = new Map<string, any[]>();
    for (const hold of allHolds) {
      const list = holdsByMentor.get(hold.mentor_id) || [];
      list.push(hold);
      holdsByMentor.set(hold.mentor_id, list);
    }

    const result: AvailableMentor[] = [];

    for (const mentor of mentors) {
      try {
        const daySlots = slotsByMentor.get(mentor.user_id) || [];
        const mentorSessions = sessionsByMentor.get(mentor.user_id) || [];
        const mentorHolds = holdsByMentor.get(mentor.user_id) || [];

        const slotParams = buildMentorSlotParams(
          daySlots,
          mentor,
          mentorSessions,
          mentorHolds,
          selectedDate,
          durationMins,
          studentTimezone,
          now,
          minNoticeMs,
          maxWindowMs,
        );

        const slotOptions = computeSlotsForMentorDate(slotParams);
        const availableSlots = slotOptions.filter((s) => !s.disabled);

        if (availableSlots.length === 0) continue;

        const earliestSlot = availableSlots[0] || null;

        result.push({
          ...mentor,
          slotOptions,
          availableSlots,
          earliestSlot,
          totalAvailable: availableSlots.length,
        });
      } catch (e) {
        console.warn(`[DiscoverMentors] Failed to compute slots for mentor ${mentor.user_id}:`, e);
      }
    }

    return result;
  }, [mentors, allSlots, allSessions, allHolds, selectedDate, durationMins, rulesData]);

    const dateAvailability = useMemo(() => {
    if (!mentors.length || !allSlots.length) return [];

    // All of each mentor's slots grouped by mentor. Weekday matching for the
    // calendar preview is done in the mentor's timezone (inside
    // computeSlotsForMentorDate), so we must NOT pre-filter by the student's
    // local weekday.
    const slotsByMentor = new Map<string, any[]>();
    for (const slot of allSlots) {
      const list = slotsByMentor.get(slot.mentor_id) || [];
      list.push(slot);
      slotsByMentor.set(slot.mentor_id, list);
    }
    const sessionsByMentor = new Map<string, any[]>();
    for (const session of allSessions) {
      const list = sessionsByMentor.get(session.mentor_id) || [];
      list.push(session);
      sessionsByMentor.set(session.mentor_id, list);
    }
    const holdsByMentor = new Map<string, any[]>();
    for (const hold of allHolds) {
      const list = holdsByMentor.get(hold.mentor_id) || [];
      list.push(hold);
      holdsByMentor.set(hold.mentor_id, list);
    }

    const studentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = Date.now();
    const minNoticeMs = (rulesData?.minimum_booking_notice_minutes ?? 30) * 60 * 1000;
    const maxWindowMs = (rulesData?.maximum_booking_days ?? 30) * 24 * 60 * 60 * 1000;
    const today = new Date();
    const dates: { dateStr: string; dayKey: string; count: number }[] = [];

    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      const ds = format(d, "yyyy-MM-dd");
      const dk = getDateDayKey(ds); // label only; matching is done cross-tz in computeSlotsForMentorDate

      let count = 0;
      for (const mentor of mentors) {
        try {
          const daySlots = slotsByMentor.get(mentor.user_id) || [];
          const mentorSessions = sessionsByMentor.get(mentor.user_id) || [];
          const mentorHolds = holdsByMentor.get(mentor.user_id) || [];

          const slotParams = buildMentorSlotParams(
            daySlots,
            mentor,
            mentorSessions,
            mentorHolds,
            ds,
            durationMins,
            studentTimezone,
            now,
            minNoticeMs,
            maxWindowMs,
          );

          const slots = computeSlotsForMentorDate(slotParams);
          const available = slots.filter((s) => !s.disabled);
          if (available.length > 0) count++;
        } catch (e) {
          console.warn(
            `[DiscoverMentors] Failed to compute preview for mentor ${mentor.user_id} on ${ds}:`,
            e,
          );
        }
      }

      dates.push({ dateStr: ds, dayKey: dk, count });
    }

    return dates;
  }, [mentors, allSessions, allHolds, allSlots, durationMins, rulesData]);

  // Realtime sync: when a mentor changes availability (or a slot is booked/held
  // by another student), refresh the cached slots/sessions/holds so the student
  // booking page reflects the change instantly.
  useEffect(() => {
    const queryClient = useQueryClient();
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["availability-slots-all"] });
      queryClient.invalidateQueries({ queryKey: ["sessions-date-range"] });
      queryClient.invalidateQueries({ queryKey: ["booking-holds-active"] });
      queryClient.invalidateQueries({ queryKey: ["available-mentors-list"] });
    };

    const channel = supabase.channel("student-booking-realtime");

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "availability_slots" },
      () => invalidate(),
    );
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "sessions" },
      () => invalidate(),
    );
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "booking_holds" },
      () => invalidate(),
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

    return {
    availableMentors,
    mentorsLoading,
    dateAvailability,
    selectedDate,
    dayKey,
  };
}