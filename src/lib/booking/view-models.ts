import type { AvailableMentor, SlotOption } from "@/hooks/use-available-mentors";
import type { TimeGroup } from "@/hooks/use-available-mentors";
import { safeDayLabel, safeDateFromString } from "@/lib/safe-date";
import { format } from "date-fns";

/**
 * booking/view-models
 *
 * Normalized, defensive read-models for the student booking flow.
 *
 * PRINCIPLE: UI components consume these normalized shapes — never raw,
 * possibly-null DB rows. Every optional field on a mentor / slot is mapped to
 * a graceful fallback (null name → "Mentor", null rating → hidden, no video →
 * hidden, etc.) so a partially incomplete mentor can never crash a component.
 */

export type TimePreference = "morning" | "afternoon" | "evening" | "any";

export type Intent = "today" | "tomorrow" | "week" | "flexible";

export interface BookingSlotViewModel {
  /** Stable key = the absolute start timestamp (UTC ISO). */
  id: string;
  mentorId: string;
  startIso: string;
  /** Human range label, e.g. "7:00 PM – 7:30 PM". */
  label: string;
  /** Human start-only label, e.g. "7:00 PM". */
  startLabel: string;
  disabled: boolean;
  group: TimeGroup;
}

export interface BookingMentorViewModel {
  id: string;
  name: string;
  nameInitial: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  languages: string[];
  primaryLanguage: string;
  yearsExperience: number;
  /** Real rating only — null when there are genuinely no reviews. */
  rating: number | null;
  totalReviews: number;
  isVerified: boolean;
  teachingStyle: string | null;
  introVideoUrl: string | null;
  timezone: string | null;
  slotOptions: BookingSlotViewModel[];
  availableSlots: BookingSlotViewModel[];
  totalAvailable: number;
  earliestSlot: BookingSlotViewModel | null;
  reasons: string[];
  score: number;
  raw: AvailableMentor;
}

export interface RecommendationCriteria {
  intent: Intent;
  timePreference: TimePreference;
  selectedDate: string;
  language?: string | null;
}

const TIME_GROUP_LABEL: Record<TimeGroup, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

export const TIME_PREFERENCE_LABEL: Record<TimePreference, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  any: "Anytime",
};

/** Does a slot fall within the student's time preference band? */
function slotMatchesPreference(slot: BookingSlotViewModel, prefs: TimePreference): boolean {
  if (prefs === "any") return true;
  // "night" belongs to evening band for a relaxed interpretation.
  if (prefs === "evening") return slot.group === "evening" || slot.group === "night";
  return slot.group === prefs;
}

export function toSlotViewModel(mentorId: string, slot: SlotOption): BookingSlotViewModel {
  return {
    id: slot.value,
    mentorId,
    startIso: slot.value,
    label: slot.label,
    startLabel: slotStartLabel(slot),
    disabled: slot.disabled,
    group: slot.group,
  } as BookingSlotViewModel;
}

/** Derive a start-only label (e.g. "7:00 PM") from a slot's range label or ISO. */
export function slotStartLabel(slot: SlotOption): string {
  const fromLabel = slot.label?.split("–")[0]?.trim();
  if (fromLabel) return fromLabel;
  const d = safeParseSlotDate(slot.value);
  return d ? safeFormatSlotTime(d) : slot.label;
}

export function safeParseSlotDate(value: string): Date | null {
  return safeDateFromString(value) ?? parseSlotIso(value);
}

function parseSlotIso(value: string): Date | null {
  if (!value) return null;
  try {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function safeFormatSlotTime(date: Date): string {
  try {
    return format(date, "h:mm a");
  } catch {
    return "";
  }
}

/**
 * Deterministic, explainable recommendation score. Never invents data; every
 * signal is read from real mentor rows. Kept modular so a future ML engine can
 * replace `getRecommendedMentors` without touching the UI.
 */
function scoreMentor(mentor: AvailableMentor, criteria: RecommendationCriteria): number {
  let score = mentor.totalAvailable * 10;

  const timeMatch = mentor.availableSlots.some((s) =>
    slotMatchesPreference(toSlotViewModel(mentor.user_id, s), criteria.timePreference),
  );
  if (timeMatch) score += 15;

  if (criteria.language && mentor.languages_taught?.includes(criteria.language)) {
    score += 20;
  }

  const exp = Math.min(mentor.years_experience || 0, 10);
  score += exp * 1.5;

  const rating = mentor.total_reviews > 0 ? Number(mentor.rating_avg) || 0 : 0;
  const reviewBias = 1 + Math.min(mentor.total_reviews, 50) / 50;
  score += rating * reviewBias * 2;

  if (mentor.is_verified) score += 5;

  return score;
}

function buildReasons(mentor: AvailableMentor, criteria: RecommendationCriteria): string[] {
  const reasons: string[] = [];
  const dateLabel = safeDayLabel(criteria.selectedDate, criteria.selectedDate);

  if (mentor.totalAvailable > 0) {
    reasons.push(`Available on ${dateLabel}`);
  }

  const matchingSlots = mentor.availableSlots.filter((s) =>
    slotMatchesPreference(toSlotViewModel(mentor.user_id, s), criteria.timePreference),
  );
  if (criteria.timePreference !== "any" && matchingSlots.length > 0) {
    reasons.push(`Offers ${TIME_GROUP_LABEL[matchingSlots[0].group]} times around your preference`);
  }

  if (criteria.language && mentor.languages_taught?.includes(criteria.language)) {
    reasons.push(`Teaches ${criteria.language}`);
  }

  if (mentor.years_experience && mentor.years_experience > 0) {
    reasons.push(
      `${mentor.years_experience} year${mentor.years_experience !== 1 ? "s" : ""} of teaching experience`,
    );
  }

  if (mentor.is_verified) {
    reasons.push("Verified mentor");
  }

  return reasons;
}

/** Normalize a single available mentor into a UI-safe view model. */
export function normalizeMentor(
  mentor: AvailableMentor,
  criteria: RecommendationCriteria,
): BookingMentorViewModel {
  const slotOptions = mentor.slotOptions.map((s) => toSlotViewModel(mentor.user_id, s));
  const availableSlots = mentor.availableSlots
    .map((s) => toSlotViewModel(mentor.user_id, s))
    .filter((s) => !s.disabled);

  // Order available slots so preferred times surface first (adaptive, honest).
  if (criteria.timePreference !== "any") {
    availableSlots.sort((a, b) => {
      const aMatch = slotMatchesPreference(a, criteria.timePreference) ? 0 : 1;
      const bMatch = slotMatchesPreference(b, criteria.timePreference) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return (
        (safeParseSlotDate(a.startIso)?.getTime() ?? 0) -
        (safeParseSlotDate(b.startIso)?.getTime() ?? 0)
      );
    });
  }

  const name = mentor.profile?.full_name || "Mentor";
  const languages = Array.isArray(mentor.languages_taught) ? mentor.languages_taught : [];
  const rating = mentor.total_reviews > 0 ? Number(mentor.rating_avg) || 0 : null;

  return {
    id: mentor.user_id,
    name,
    nameInitial: name.charAt(0).toUpperCase() || "M",
    avatarUrl: mentor.profile?.avatar_url || null,
    headline: mentor.headline || null,
    bio: mentor.bio || null,
    languages,
    primaryLanguage: languages[0] || "English",
    yearsExperience: Number(mentor.years_experience) || 0,
    rating,
    totalReviews: Number(mentor.total_reviews) || 0,
    isVerified: !!mentor.is_verified,
    teachingStyle: mentor.teaching_style || null,
    introVideoUrl: mentor.demo_lesson_url || null,
    timezone: mentor.timezone || null,
    slotOptions,
    availableSlots,
    totalAvailable: availableSlots.length,
    earliestSlot: availableSlots[0] ?? null,
    reasons: buildReasons(mentor, criteria),
    score: scoreMentor(mentor, criteria),
    raw: mentor,
  };
}

/**
 * Rank available mentors for the given criteria. `[]` when no real availability
 * exists for the criteria — callers render the empty state with real
 * alternatives rather than inventing options.
 */
export function getRecommendedMentors(
  mentors: AvailableMentor[],
  criteria: RecommendationCriteria,
): BookingMentorViewModel[] {
  return mentors.map((m) => normalizeMentor(m, criteria)).sort((a, b) => b.score - a.score);
}

/**
 * Real, closest alternatives for race-condition recovery:
 * the nearest available times of the same mentor, excluding a specific slot.
 * Returns up to `limit` slots sorted by start time.
 */
export function closestAlternatives(
  mentor: BookingMentorViewModel | null,
  excludeValue?: string | null,
  limit = 3,
): BookingSlotViewModel[] {
  if (!mentor) return [];
  return mentor.availableSlots.filter((s) => s.id !== excludeValue).slice(0, limit);
}

/** Human label for a date string: "Today" / "Tomorrow" / "Tue, Aug 18". */
export function dateLabel(dateStr: string): string {
  return safeDayLabel(dateStr, dateStr);
}

/** Human label for an ISO timestamp: "Today · 7:00 PM". */
export function timestampLabel(iso: string): string {
  const d = parseSlotIso(iso);
  if (!d) return iso;
  const datePart = safeDayLabel(d.toISOString().slice(0, 10), "");
  const timePart = safeFormatSlotTime(d);
  return `${datePart}${timePart ? ` · ${timePart}` : ""}`;
}
