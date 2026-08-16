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

function getUTCOffsetMinutes(timeZone: string, date: Date): number {
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
  const tzAsUTC = new Date(tzStr + "Z");
  return Math.round((localDate.getTime() - tzAsUTC.getTime()) / (60_000));
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
      slot.start_time,
      mentorTimezone,
      studentTimezone,
      baseDate
    );

    const endResult = convertSlotTimeToStudentTimezone(
      slot.end_time,
      mentorTimezone,
      studentTimezone,
      baseDate
    );

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

    if (slotEnd.getTime() - slotStart.getTime() < durationMins * 60_000) {
      return [];
    }

    const conflict = sessions.some((s) => {
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
}

export function useAvailableMentors(date?: string) {
  const selectedDate = date || format(new Date(), "yyyy-MM-dd");
  const dayKey = useMemo(() => getDateDayKey(selectedDate), [selectedDate]);

  const { data: mentors = [], isLoading: mentorsLoading } = useQuery({
    queryKey: ["available-mentors-list"],
    queryFn: async () => {
      const { data: mps } = await supabase
        .from("mentor_profiles")
        .select(
          "user_id, headline, bio, hourly_rate, rating_avg, total_reviews, total_students, total_sessions, languages_taught, years_experience, is_verified, demo_lesson_url, teaching_style, cover_url, timezone"
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
    queryKey: ["availability-slots-day", dayKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("day_of_week", dayKey)
        .eq("is_available", true);
      return data ?? [];
    },
    staleTime: 1000 * 30,
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ["sessions-date-all", selectedDate],
    queryFn: async () => {
      const startOfDayStr = `${selectedDate}T00:00:00`;
      const endOfDayStr = `${selectedDate}T23:59:59`;
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .gte("scheduled_time", startOfDayStr)
        .lte("scheduled_time", endOfDayStr)
        .neq("status", "cancelled")
        .neq("status", "rejected");
      return data ?? [];
    },
    staleTime: 1000 * 30,
  });

  const availableMentors = useMemo(() => {
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

        const availableSlots = slotOptions.filter((s) => !s.disabled);
        const earliestSlot = availableSlots[0] || null;

        return {
          ...mentor,
          slotOptions,
          availableSlots,
          earliestSlot,
          totalAvailable: availableSlots.length,
        };
      })
      .filter((m) => m.totalAvailable > 0);

    return result;
  }, [mentors, allSlots, allSessions, selectedDate]);

  const { data: dateAvailability = [] } = useQuery({
    queryKey: ["date-availability-preview"],
    queryFn: async () => {
      const { data: slots } = await supabase
        .from("availability_slots")
        .select("day_of_week, mentor_id")
        .eq("is_available", true);

      if (!slots?.length) return [];

      const mentorIds = [...new Set(slots.map((s: any) => s.mentor_id))];
      const { data: activeMentors } = await supabase
        .from("mentor_profiles")
        .select("user_id")
        .eq("is_active", true)
        .in("user_id", mentorIds);

      const activeIds = new Set((activeMentors ?? []).map((m: any) => m.user_id));

      const byDay = new Map<string, Set<string>>();
      for (const slot of slots) {
        if (!activeIds.has(slot.mentor_id)) continue;
        const set = byDay.get(slot.day_of_week) || new Set<string>();
        set.add(slot.mentor_id);
        byDay.set(slot.day_of_week, set);
      }

      const today = new Date();
      const dates: { dateStr: string; dayKey: string; count: number }[] = [];
      for (let i = 0; i < 14; i++) {
        const d = addDays(today, i);
        const ds = format(d, "yyyy-MM-dd");
        const dk = getDateDayKey(ds);
        const count = byDay.get(dk)?.size || 0;
        dates.push({ dateStr: ds, dayKey: dk, count });
      }
      return dates;
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    availableMentors,
    mentorsLoading,
    dateAvailability,
    selectedDate,
    dayKey,
  };
}