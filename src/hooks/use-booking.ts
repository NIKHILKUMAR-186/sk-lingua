import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DAY_KEYS } from "@/lib/booking";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

export type TimeGroup = "morning" | "afternoon" | "evening" | "night";

export interface SlotOption {
  value: string;
  label: string;
  disabled: boolean;
  startTime: string;
  endTime: string;
  group: TimeGroup;
}

export interface BookingSummary {
  mentorName: string;
  gigTitle: string;
  gigPrice: number;
  gigDuration: number;
  date: string;
  slotLabel: string;
  total: number;
  mentorId: string;
  gigId: string;
  scheduledTime: string;
  studentMessage: string;
}

function getTimeGroup(hour: number): TimeGroup {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

export const TIME_GROUP_LABELS: Record<TimeGroup, { label: string; icon: string }> = {
  morning: { label: "Morning", icon: "🌅" },
  afternoon: { label: "Afternoon", icon: "☀️" },
  evening: { label: "Evening", icon: "🌆" },
  night: { label: "Night", icon: "🌙" },
};

/**
 * Build a local-timezone Date from "yyyy-MM-dd".
 * parseISO gives UTC midnight — calling .getDay() then returns
 * the weekday in LOCAL timezone, which can misalign by ±1 day
 * for UTC-negative timezones (Americas).
 * Using new Date(y, m-1, d) ensures local midnight so getDay() is correct.
 */
function dateFromString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Compute database day key (monday–sunday) from a date string.
 * Always uses local timezone, matching how mentors store availability_slots.
 */
function getDateDayKey(dateStr: string): string {
  const dt = dateFromString(dateStr);
  return DAY_KEYS[(dt.getDay() + 6) % 7];
}

export function useMentorSchedule(mentorId?: string) {
  return useQuery({
    queryKey: ["mentor-schedule", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      console.log("🔍 [useMentorSchedule] mentorId:", mentorId);
      const { data: slots, error } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("mentor_id", mentorId!)
        .eq("is_available", true);
      console.log("🔍 [useMentorSchedule] rows:", slots?.length ?? 0, "error:", error);
      console.log("🔍 [useMentorSchedule] day_of_week values:", (slots ?? []).map((s: any) => s.day_of_week));
      return slots ?? [];
    },
  });
}

export function useSessionsForDate(mentorId?: string, _selectedDate?: string) {
  return useQuery({
    queryKey: ["sessions-date", mentorId, _selectedDate],
    enabled: !!mentorId && !!_selectedDate,
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("mentor_id", mentorId!)
        .neq("status", "rejected")
        .neq("status", "cancelled");
      return data ?? [];
    },
  });
}

export function useAvailableSlots(
  mentorId?: string,
  selectedDate?: string,
  durationMins: number = 30,
) {
  const { data: slots = [] } = useMentorSchedule(mentorId);
  const { data: sessions = [] } = useSessionsForDate(mentorId, selectedDate);

  if (!selectedDate || !mentorId) {
    return {
      slotOptions: [] as SlotOption[],
      groupedSlots: {} as Record<TimeGroup, SlotOption[]>,
      isLoading: false,
    };
  }

  console.group("🕐 [useAvailableSlots]");
  console.log("mentorId:", mentorId);
  console.log("selectedDate string:", selectedDate);
  console.log("durationMins:", durationMins);
  console.log("Total slots from DB:", slots.length);
  console.log("Slot day_of_week values:", (slots as any[]).map((s) => s.day_of_week));

  // ---- Build local date & compute weekday ----
  const dt = dateFromString(selectedDate);
  console.log("Local date object:", dt.toString());
  console.log("Local getDay():", dt.getDay(), "(0=Sun, 1=Mon … 6=Sat)");

  const dayKey = getDateDayKey(selectedDate);
  console.log("Computed dayKey for filter:", dayKey);

  // ---- Filter slots by day ----
  const candidates = (slots as any[]).filter((s) => {
    const match = s.day_of_week === dayKey;
    console.log(`  Slot day=${s.day_of_week} start=${s.start_time} → ${match ? "✅" : "❌"}`);
    return match;
  });
  console.log("Candidates after day filter:", candidates.length);

  if (candidates.length === 0) {
    console.log("⚠️ No candidates — possible reasons:");
    console.log("  1. Mentor has no availability_slots for this day_of_week");
    console.log("  2. day_of_week stored differs from computed key (e.g. 'mon' vs 'monday')");
    console.log("  3. is_available = false on all matching slots");
    console.log("  4. mentor_id mismatch between URL param and DB");
  }

  // ---- Build slot options with time grouping ----
  const options: SlotOption[] = candidates.flatMap((slot: any) => {
    const [sh, sm] = (slot.start_time ?? "00:00").split(":").map(Number);
    const [eh, em] = (slot.end_time ?? "00:00").split(":").map(Number);

    const slotStart = dateFromString(selectedDate);
    slotStart.setHours(sh, sm, 0, 0);

    const slotEnd = dateFromString(selectedDate);
    slotEnd.setHours(eh, em, 0, 0);

    if (slotEnd.getTime() - slotStart.getTime() < durationMins * 60_000) {
      console.log(`  ⏱️ Slot ${slot.start_time}–${slot.end_time} too short (need ${durationMins}min)`);
      return [];
    }

    const startIso = slotStart.toISOString();
    const conflict = (sessions as any[]).some((s) => {
      const existingStart = new Date(s.scheduled_time).getTime();
      const existingEnd = existingStart + s.duration_mins * 60_000;
      const proposedStart = new Date(startIso).getTime();
      const proposedEnd = proposedStart + durationMins * 60_000;
      const hasConflict = proposedStart < existingEnd && proposedEnd > existingStart;
      if (hasConflict) console.log(`  ⚔️ Conflict with session ${s.id}`);
      return hasConflict;
    });

    const group = getTimeGroup(sh);
    return [
      {
        value: startIso,
        label: `${format(slotStart, "h:mm a")} – ${format(slotEnd, "h:mm a")}`,
        disabled: conflict,
        startTime: slot.start_time,
        endTime: slot.end_time,
        group,
      },
    ];
  });

  console.log("Final slot options:", options.length);
  console.groupEnd();

  const groupedSlots: Record<TimeGroup, SlotOption[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };
  options.forEach((opt) => {
    groupedSlots[opt.group].push(opt);
  });

  return { slotOptions: options, groupedSlots, isLoading: false };
}

export function useBookingRequest(mentorId?: string) {
  const qc = useQueryClient();
  const { data: auth } = useAuth();

  return useMutation({
    mutationFn: async (summary: BookingSummary) => {
      if (!auth?.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("sessions").insert({
        student_id: auth.user.id,
        mentor_id: summary.mentorId,
        gig_id: summary.gigId,
        scheduled_time: summary.scheduledTime,
        duration_mins: summary.gigDuration,
        student_message: summary.studentMessage,
      });
      if (error) throw error;

      // Create notification for mentor
      await supabase.from("notifications").insert({
        user_id: summary.mentorId,
        title: "New booking request",
        body: `${auth.profile?.full_name || "A student"} booked "${summary.gigTitle}" on ${summary.date} at ${summary.slotLabel}`,
        category: "booking",
        kind: "booking_request",
        related_id: summary.gigId,
        metadata: { mentor_id: summary.mentorId, gig_id: summary.gigId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-sessions"] });
      qc.invalidateQueries({ queryKey: ["sessions-date"] });
    },
  });
}

export function calculateAvailableDates(
  slots: Array<{ day_of_week: string; is_available: boolean }>,
  monthStart: Date,
  monthEnd: Date,
): Date[] {
  const available: Date[] = [];
  const current = new Date(monthStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.group("📅 [calculateAvailableDates]");
  console.log("Total slots:", slots.length);
  console.log("Month:", monthStart.toLocaleString("default", { month: "long", year: "numeric" }));

  while (current <= monthEnd) {
    const dayIndex = current.getDay();
    const dayKey = DAY_KEYS[(dayIndex + 6) % 7];
    const hasSlots = slots.some(
      (s) => s.day_of_week === dayKey && s.is_available !== false,
    );
    if (hasSlots && current >= today) {
      available.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  console.log("Available dates count:", available.length);
  if (available.length > 0) {
    console.log("Sample:", available.slice(0, 5).map((d) => d.toDateString()));
  }
  console.groupEnd();

  return available;
}
