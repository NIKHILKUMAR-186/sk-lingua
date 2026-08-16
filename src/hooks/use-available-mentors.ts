import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState, useEffect } from "react";
import { format, addDays, startOfDay, isSameDay, parseISO } from "date-fns";
import { DAY_KEYS } from "@/lib/booking";
import {
  safeDate,
  safeTimeString,
  safeUTCTimestamp,
  isInvalidUTCTimestamp,
} from "@/lib/safe-datetime";
import { useBookingRules } from "@/hooks/use-booking-rules";

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
  hourly_rate: number;
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
  if (value == null) return null;
  try {
    const d = new Date(value as string);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function getUTCOffsetMinutes(timeZone: string, date: Date): number {
  if (!timeZone || timeZone === "UTC") return 0;
  try {
    const localDate = new Date(date.toISOString());
    const tzStr = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(localDate);
    const tzAsUTC = safeDate(tzStr + "Z");
    if (!tzAsUTC) return 0;
    return Math.round((localDate.getTime() - tzAsUTC.getTime()) / 60_000);
  } catch {
    return 0;
  }
}

function convertSlotTimeToStudentTimezone(
  timeStr: string,
  mentorTimezone: string | null,
  studentTimezone: string,
  selectedDate: Date
): { displayTime: string; utcTimestamp: string } | null {
  const timeResult = safeTimeString(timeStr);
  if (!timeResult.valid) {
    console.warn("[use-available-mentors] Invalid slot time, skipping", {
      rawTime: timeStr,
      reason: timeResult.reason,
    });
    return null;
  }

  const { hours, minutes } = timeResult;
  const mentorOffset = getUTCOffsetMinutes(mentorTimezone || "UTC", selectedDate);
  const studentOffset = getUTCOffsetMinutes(studentTimezone, selectedDate);
  selectedDate: Date,
): { displayTime: string; utcTimestamp: string } | null {
  const parts = timeStr.split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  try {
    const mentorOffset = getUTCOffsetMinutes(mentorTimezone || "UTC", selectedDate);
    const studentOffset = getUTCOffsetMinutes(studentTimezone, selectedDate);

    const utcTotalMinutes = hours * 60 + minutes - mentorOffset;
    const studentTotalMinutes = utcTotalMinutes + studentOffset;

    const normalizedMinutes = ((studentTotalMinutes % 1440) + 1440) % 1440;
    const studentHours = Math.floor(normalizedMinutes / 60);
    const studentMinutes = normalizedMinutes % 60;

    const period = studentHours >= 12 ? "PM" : "AM";
    const displayHours = studentHours % 12 || 12;
    const displayTime = `${displayHours}:${String(studentMinutes).padStart(2, "0")} ${period}`;

    const utcDate = new Date(selectedDate);
    utcDate.setUTCHours(0, 0, 0, 0);
    utcDate.setUTCMinutes(utcDate.getUTCMinutes() + Math.round(utcTotalMinutes));
    const utcTimestamp = utcDate.toISOString();

  return { displayTime, utcTimestamp };
}

function computeMentorSlots(
  slots: any[],
  sessions: any[],
  selectedDate: string,
  durationMins: number,
  mentorTimezone: string | null
): SlotOption[] {
  const dayKey = getDateDayKey(selectedDate);
  const candidates = slots.filter(
    (s) => s.day_of_week === dayKey && s.is_available !== false
  );

  const baseDate = dateFromString(selectedDate);
  const studentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return candidates.flatMap((slot) => {
    const startResult = convertSlotTimeToStudentTimezone(
    return { displayTime, utcTimestamp };
  } catch {
    return null;
  }
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
    const baseDate = dateFromString(selectedDate);
    const startResult = convertSlotTimeToStudentTimezone(
      slot.start_time,
      mentor.timezone,
      studentTimezone,
      baseDate,
    );
    if (!startResult) continue;

    const endResult = convertSlotTimeToStudentTimezone(
    const endResult = convertSlotTimeToStudentTimezone(
      slot.end_time,
      mentor.timezone,
      studentTimezone,
      baseDate,
    );
    if (!endResult) continue;

    const { displayTime, utcTimestamp } = startResult;
    const { displayTime: endDisplayTime } = endResult;

    if (!startResult || !endResult) {
      console.warn("[use-available-mentors] Skipping slot due to invalid time", {
        mentorId: slot.mentor_id,
        slotId: slot.id,
        day: slot.day_of_week,
        startTime: slot.start_time,
        endTime: slot.end_time,
      });
      return [];
    }

    const slotStart = new Date(startResult.utcTimestamp);
    const slotEnd = new Date(endResult.utcTimestamp);

    if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime())) {
      console.warn("[use-available-mentors] Invalid computed slot dates", {
        mentorId: slot.mentor_id,
        slotId: slot.id,
        startUtc: startResult.utcTimestamp,
        endUtc: endResult.utcTimestamp,
      });
      return [];
    }
    const slotStart = safeDate(utcTimestamp);
    if (!slotStart) continue;

    const slotEnd = safeDate(utcTimestamp);
    if (!slotEnd) continue;

    const [eh, em] = slot.end_time.split(":").map(Number);
    const mentorOffset = getUTCOffsetMinutes(mentor.timezone || "UTC", baseDate);
    slotEnd.setUTCHours(eh, em - mentorOffset, 0, 0);

    if (slotEnd.getTime() - slotStart.getTime() < durationMins * 60_000) {
      continue;
    }

    const proposedStart = slotStart.getTime();
    const proposedEnd = proposedStart + durationMins * 60_000;

    if (proposedStart <= now) continue;
    if (proposedStart < now + minNoticeMs) continue;
    if (proposedStart > now + maxWindowMs) continue;

    const hasBookingConflict = sessions.some((s) => {
      if (s.status === "cancelled" || s.status === "rejected") return false;
      const existingStartResult = safeDate(s.scheduled_time);
      if (!existingStartResult.valid) {
        console.warn("[use-available-mentors] Invalid session time, ignoring session", {
          sessionId: s.id,
          scheduled_time: s.scheduled_time,
        });
        return false;
      }
      const existingStart = existingStartResult.value.getTime();
      const existingStart = safeDate(s.scheduled_time)?.getTime();
      if (existingStart == null) return false;
      const existingEnd = existingStart + s.duration_mins * 60_000;
      const proposedStart = slotStart.getTime();
      const proposedEnd = proposedStart + durationMins * 60_000;
      return proposedStart < existingEnd && proposedEnd > existingStart;
    });

    return [
      {
        value: startResult.utcTimestamp,
        label: `${startResult.displayTime} – ${endResult.displayTime}`,
        disabled: conflict,
        startTime: slot.start_time,
        endTime: slot.end_time,
        group: getTimeGroup(slotStart.getUTCHours()),
      },
    ];
  });
    const hasHoldConflict = holds.some((h) => {
      if (h.status !== "active") return false;
      const holdStart = safeDate(h.scheduled_time);
      if (!holdStart) return false;
      const holdEnd = holdStart.getTime() + h.duration_mins * 60_000;
      return proposedStart < holdEnd && proposedEnd > holdStart.getTime();
    });

    const disabled = hasBookingConflict || hasHoldConflict;

    results.push({
      value: utcTimestamp,
      label: `${displayTime} – ${endDisplayTime}`,
      disabled,
      startTime: slot.start_time,
      endTime: slot.end_time,
      group: getTimeGroup(slotStart.getUTCHours()),
    });
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
    slot: { ...slot, _selectedDate: selectedDate },
    mentor,
    sessions: mentorSessions,
    holds: mentorHolds,
    durationMins,
    studentTimezone,
    selectedDate,
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
          "user_id, headline, bio, hourly_rate, rating_avg, total_reviews, total_students, total_sessions, languages_taught, years_experience, is_verified, demo_lesson_url, teaching_style, cover_url, timezone",
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

    const slotsByMentorDay = new Map<string, any[]>();
    for (const slot of allSlots) {
      const key = `${slot.mentor_id}|${slot.day_of_week}`;
      const list = slotsByMentorDay.get(key) || [];
      list.push(slot);
      slotsByMentorDay.set(key, list);
    }

    const sessionsByMentorDate = new Map<string, any[]>();
    for (const session of allSessions) {
      const sessionDate = safeDate(session.scheduled_time);
      if (!sessionDate) continue;
      const ds = format(sessionDate, "yyyy-MM-dd");
      const key = `${session.mentor_id}|${ds}`;
      const list = sessionsByMentorDate.get(key) || [];
      list.push(session);
      sessionsByMentorDate.set(key, list);
    }

    const holdsByMentorDate = new Map<string, any[]>();
    for (const hold of allHolds) {
      const holdDate = safeDate(hold.scheduled_time);
      if (!holdDate) continue;
      const ds = format(holdDate, "yyyy-MM-dd");
      const key = `${hold.mentor_id}|${ds}`;
      const list = holdsByMentorDate.get(key) || [];
      list.push(hold);
      holdsByMentorDate.set(key, list);
    }

    const result: AvailableMentor[] = mentors
      .map((mentor) => {
        const mentorSlots = slotsByMentor.get(mentor.user_id) || [];
        const mentorSessions = sessionsByMentor.get(mentor.user_id) || [];

        let slotOptions: SlotOption[] = [];
        try {
          slotOptions = computeMentorSlots(
            mentorSlots,
            mentorSessions,
            selectedDate,
            25,
            mentor.timezone
          );
        } catch (error) {
          console.warn("[use-available-mentors] Failed to compute mentor slots, returning empty set", {
            mentorId: mentor.user_id,
            error,
          });
          slotOptions = [];
        }

    const result: AvailableMentor[] = [];

    for (const mentor of mentors) {
      try {
        const daySlots = slotsByMentorDay.get(`${mentor.user_id}|${dayKey}`) || [];
        const mentorSessions = sessionsByMentorDate.get(`${mentor.user_id}|${selectedDate}`) || [];
        const mentorHolds = holdsByMentorDate.get(`${mentor.user_id}|${selectedDate}`) || [];

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
  }, [mentors, allSlots, allSessions, allHolds, selectedDate, dayKey, durationMins, rulesData]);

  const dateAvailability = useMemo(() => {
    if (!mentors.length || !allSlots.length) return [];

    const slotsByMentorDay = new Map<string, any[]>();
    for (const slot of allSlots) {
      const key = `${slot.mentor_id}|${slot.day_of_week}`;
      const list = slotsByMentorDay.get(key) || [];
      list.push(slot);
      slotsByMentorDay.set(key, list);
    }

    const sessionsByMentorDate = new Map<string, any[]>();
    for (const session of allSessions) {
      const sessionDate = safeDate(session.scheduled_time);
      if (!sessionDate) continue;
      const ds = format(sessionDate, "yyyy-MM-dd");
      const key = `${session.mentor_id}|${ds}`;
      const list = sessionsByMentorDate.get(key) || [];
      list.push(session);
      sessionsByMentorDate.set(key, list);
    }

    const holdsByMentorDate = new Map<string, any[]>();
    for (const hold of allHolds) {
      const holdDate = safeDate(hold.scheduled_time);
      if (!holdDate) continue;
      const ds = format(holdDate, "yyyy-MM-dd");
      const key = `${hold.mentor_id}|${ds}`;
      const list = holdsByMentorDate.get(key) || [];
      list.push(hold);
      holdsByMentorDate.set(key, list);
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
      const dk = getDateDayKey(ds);

      let count = 0;
      for (const mentor of mentors) {
        try {
          const daySlots = slotsByMentorDay.get(`${mentor.user_id}|${dk}`) || [];
          if (daySlots.length === 0) continue;

          const mentorSessions = sessionsByMentorDate.get(`${mentor.user_id}|${ds}`) || [];
          const mentorHolds = holdsByMentorDate.get(`${mentor.user_id}|${ds}`) || [];

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
  }, [mentors, allSlots, allSessions, allHolds, durationMins, rulesData]);

  return {
    availableMentors,
    mentorsLoading,
    dateAvailability,
    selectedDate,
    dayKey,
  };
}