/**
 * Canonical timezone utilities for the booking engine.
 *
 * THE TIMEZONE CONTRACT (single source of truth):
 *  - All DB-stored timestamps are absolute UTC (timestamptz). They are NEVER
 *    re-converted as if they were local wall-clock times, and the pipeline never
 *    chains UTC -> local -> UTC -> local.
 *  - A recurring availability slot is stored as (weekday, local start time,
 *    local end time, timezone). A concrete *occurrence* is produced by
 *    converting the mentor's LOCAL wall-clock for the matching weekday into
 *    ONE canonical UTC instant, using the mentor's timezone (DST-aware via
 *    `Intl.DateTimeFormat`, no external dependency required).
 *  - The student's browser timezone is used ONLY to (a) define the calendar
 *    date range the student is browsing and (b) format the display label.
 *    The slot's canonical value is always a UTC ISO string, identical for the
 *    backend, the hold, and the booking.
 */
import { safeParseTime } from "@/lib/safe-date";

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}::${JSON.stringify(options)}`;
  const existing = formatterCache.get(key);
  if (existing) return existing;
  const f = new Intl.DateTimeFormat("en-GB", { timeZone, ...options });
  formatterCache.set(key, f);
  return f;
}

interface WallClock {
  hour: number;
  minute: number;
}

function wallClockAt(instant: number, timeZone: string): WallClock {
  const parts = getFormatter(timeZone, {
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(instant));
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === "hour") hour = Number(p.value);
    else if (p.type === "minute") minute = Number(p.value);
  }
    return { hour, minute };
}

const WEEKDAY_INDEX: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

/**
 * Offset from UTC in minutes for `timeZone` at the given instant.
 *
 * Computed as (wall-clock minutes in target zone) - (wall-clock minutes in UTC)
 * for the SAME instant. Correct sign convention (IST returns +330),
 * locale-independent (24h format — no AM/PM "Z" string parsing that silently
 * returned 0).
 */
export function getOffsetMinutes(timeZone: string | null | undefined, instant: Date | number): number {
  if (!timeZone || timeZone === "UTC") return 0;
  const epoch = typeof instant === "number" ? instant : instant.getTime();
  if (Number.isNaN(epoch)) return 0;
  try {
    const target = wallClockAt(epoch, timeZone);
    const utc = wallClockAt(epoch, "UTC");
    let diff = target.hour * 60 + target.minute - (utc.hour * 60 + utc.minute);
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    return diff;
  } catch {
    return 0;
  }
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

/** Calendar date (y, m, d) as it appears in `timeZone` at the given UTC instant. */
export function localDateAt(utcMs: number, timeZone: string): DateParts | null {
  if (Number.isNaN(utcMs)) return null;
  try {
    const parts = getFormatter(timeZone, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(utcMs));
    const dp: Partial<DateParts> = {};
    for (const p of parts) {
      if (p.type === "year") dp.year = Number(p.value);
      else if (p.type === "month") dp.month = Number(p.value);
      else if (p.type === "day") dp.day = Number(p.value);
    }
    if (dp.year == null || dp.month == null || dp.day == null) return null;
    return { year: dp.year, month: dp.month, day: dp.day };
  } catch {
    return null;
  }
}

/** Lowercase full weekday name ("tuesday") for a UTC instant in `timeZone`. */
export function weekdayLongLower(utcMs: number, timeZone: string): string {
  if (Number.isNaN(utcMs)) return "";
  try {
    const parts = getFormatter(timeZone, { weekday: "long" }).formatToParts(new Date(utcMs));
        const raw = parts.find((p) => p.type === "weekday")?.value ?? "";
    return raw.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Monday-based weekday index (0 = Mon ... 6 = Sun) for a calendar date in
 * `timeZone`. Computed from local noon to avoid date-boundary ambiguity.
 */
export function weekdayIndexMon0(year: number, month: number, day: number, timeZone: string): number {
  const noonMs = localToUtcInstant(year, month, day, 12, 0, timeZone);
  if (noonMs == null) return 0;
  return WEEKDAY_INDEX[weekdayLongLower(noonMs, timeZone)] ?? 0;
}

/**
 * Convert a LOCAL wall-clock (y, mo, d, hour, minute) in `timeZone` to a UTC
 * instant (ms). Re-resolves the offset at the candidate instant to handle DST
 * transitions that fall within the same local time.
 */
export function localToUtcInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number | null {
  if (!timeZone || timeZone === "UTC") {
    const t = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    return Number.isNaN(t) ? null : t;
  }
  try {
    const assumed = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    if (Number.isNaN(assumed)) return null;
    const off1 = getOffsetMinutes(timeZone, assumed);
    let utc = assumed - off1 * 60_000;
    const off2 = getOffsetMinutes(timeZone, utc);
    if (off2 !== off1) utc = assumed - off2 * 60_000;
    return Number.isNaN(utc) ? null : utc;
  } catch {
    return null;
  }
}

/**
 * UTC ms range [start, end) for the student's calendar date `dateStr`
 * (yyyy-MM-dd) interpreted in the student's browser timezone.
 */
export function studentDateRange(
  dateStr: string,
  studentTimezone: string,
): { start: number; end: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateStr ?? "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) return null;
  const start = localToUtcInstant(y, mo, d, 0, 0, studentTimezone);
  const end = localToUtcInstant(y, mo, d + 1, 0, 0, studentTimezone);
  if (start == null || end == null) return null;
  return { start, end };
}

/**
 * Distinct mentor-local calendar dates spanning the UTC range [startMs, endMs).
 * Samples a handful of instants to be robust against DST date-boundary edges.
 */
export function localDatesInRange(startMs: number, endMs: number, timeZone: string): DateParts[] {
  const samples = [
    startMs,
    startMs + 1,
    startMs + 6 * 3600_000,
    startMs + 12 * 3600_000,
    startMs + 18 * 3600_000,
    endMs - 1,
  ];
  const seen = new Map<string, DateParts>();
  for (const ms of samples) {
    if (ms < startMs || ms >= endMs) continue;
    const dp = localDateAt(ms, timeZone);
    if (!dp) continue;
    seen.set(`${dp.year}-${dp.month}-${dp.day}`, dp);
  }
  return Array.from(seen.values());
}

/** "HH:mm" wall-clock of a UTC instant in `timeZone` (24h). */
export function formatLocalTime(utcMs: number, timeZone: string): string | null {
  if (Number.isNaN(utcMs)) return null;
  try {
    const c = wallClockAt(utcMs, timeZone);
    return `${String(c.hour).padStart(2, "0")}:${String(c.minute).padStart(2, "0")}`;
  } catch {
    return null;
  }
}

/** 24h hour/min -> "h:mm AM/PM", e.g. (21,0)->"9:00 PM", (0,0)->"12:00 AM". */
export function h24ToH12(hour: number, minute: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${period}`;
}

/** Parse a "HH:mm" / "HH:mm:ss" string into {hour,minute}, or null. */
export function parseTime24(timeStr: string | null | undefined): { hour: number; minute: number } | null {
  const r = safeParseTime(timeStr);
  if (!r) return null;
  return { hour: r.hours, minute: r.minutes };
}

