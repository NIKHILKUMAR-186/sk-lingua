/**
 * Safe date/time utilities.
 *
 * These helpers guarantee that malformed, null, or undefined inputs never
 * reach date-fns / Date constructors in a way that produces an `Invalid Date`
 * or a runtime TypeError. Every function returns a safe sentinel (null /
 * fallback string) instead of throwing.
 *
 * Design principle: validate *before* convert.  Never call `.toISOString()`,
 * `.toLocaleString()`, `format()`, or `parseISO()` on untrusted input without
 * a preceding guard from this module.
 */
import { format as fnsFormat, type FormatOptions } from "date-fns";

export interface ParsedTime24 {
  hours: number;
  minutes: number;
}

/** Type guard — narrows `unknown` to a real, non-Invalid `Date`. */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Parse *any* value into a `Date`, returning `null` on failure.
 * Handles ISO strings, date strings, numbers (epoch ms), Date objects,
 * and rejects everything else without throwing.
 */
export function safeParseDate(value: unknown): Date | null {
  if (value == null) return null;

  if (value instanceof Date) {
    return isValidDate(value) ? new Date(value) : null;
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return isValidDate(d) ? d : null;
  }

  if (typeof value !== "string") return null;
  if (value.trim() === "") return null;

  try {
    const d = new Date(value);
    return isValidDate(d) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Parse an ISO 8601 date-time string safely.
 * Returns `null` for empty/undefined/invalid values.
 */
export function safeParseISO(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  try {
    const d = new Date(dateStr);
    return isValidDate(d) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Parse a `yyyy-MM-dd` date string into a **local-midnight** `Date`.
 *
 * `new Date(y, m-1, d)` is used (not `parseISO`) so that `.getDay()` returns
 * the weekday in the *local* timezone — matching how mentor availability
 * slots are stored and displayed.
 *
 * Returns `null` for malformed input (e.g. `"2026-13-45"`, `""`, `undefined`).
 */
export function safeDateFromString(dateStr: string | null | undefined): Date | null {
  if (typeof dateStr !== "string") return null;
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) return null;

  const [yStr, mStr, dStr] = parts;
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const dt = new Date(y, m - 1, d);
  return isValidDate(dt) ? dt : null;
}

/**
 * Format a date safely.  If the date is `null` / `undefined` / invalid the
 * `fallback` string is returned instead of throwing or rendering "Invalid Date".
 */
export function safeFormatDate(
  date: Date | null | undefined,
  formatStr: string,
  fallback: string = "—",
  options?: FormatOptions,
): string {
  if (!isValidDate(date)) return fallback;
  try {
    return fnsFormat(date as Date, formatStr, options);
  } catch {
    return fallback;
  }
}

/**
 * Format a raw date string (ISO or `yyyy-MM-dd`) safely.
 * Combines `safeParseDate` + `safeFormatDate`.
 */
export function safeFormatString(
  dateStr: string | null | undefined,
  formatStr: string,
  fallback: string = "—",
  options?: FormatOptions,
): string {
  return safeFormatDate(safeParseDate(dateStr), formatStr, fallback, options);
}

/**
 * Convert any value to an ISO timestamp string safely.
 * Returns `null` if the input cannot be parsed.
 */
export function safeToISO(value: unknown): string | null {
  const d = safeParseDate(value);
  return isValidDate(d) ? d.toISOString() : null;
}

/**
 * Parse a 24-hour `HH:MM` (or `HH:MM:SS`) time string safely.
 * Returns `null` on malformed input.
 *
 * Accepts leading-zero or non-zero-padded values: `"9:30"`, `"09:30"`,
 * `"09:30:00"`.
 */
export function safeParseTime(timeStr: string | null | undefined): ParsedTime24 | null {
  if (typeof timeStr !== "string") return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
}

/**
 * Build a local-midnight Date from a `yyyy-MM-dd` string, safely.
 * Returns `null` if the string is malformed.
 */
export function safeLocalDate(dateStr: string | null | undefined): Date | null {
  return safeDateFromString(dateStr);
}

/**
 * Format a `yyyy-MM-dd` date string (local timezone) into a human label,
 * e.g. `"Today"`, `"Tomorrow"`, `"Mon, 3 Mar"`.
 * Returns the `fallback` string on invalid input.
 */
export function safeDayLabel(
  dateStr: string | null | undefined,
  fallback: string = "—",
): string {
  const date = safeDateFromString(dateStr);
  if (!isValidDate(date)) return fallback;

  const today = new Date();
  const diffDays = Math.round(
    (date.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 0) return safeFormatDate(date, "d MMM", fallback);
  return safeFormatDate(date, "EEE, d MMM", fallback);
}

/**
 * Validate that a `Date` falls within a sensible booking range
 * (not in the past, not beyond `maxDaysAhead`).
 */
export function isBookableDate(
  date: Date | null | undefined,
  maxDaysAhead: number = 30,
): boolean {
  if (!isValidDate(date)) return false;
  const now = Date.now();
  const maxMs = now + maxDaysAhead * 24 * 60 * 60 * 1000;
  return date.getTime() > now && date.getTime() <= maxMs;
}

/**
 * Validate that a time slot (start + end) is well-formed and long enough.
 */
export function isValidTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  minDurationMins: number = 0,
): boolean {
  const start = safeParseTime(startTime);
  const end = safeParseTime(endTime);
  if (!start || !end) return false;
  const startMins = start.hours * 60 + start.minutes;
  const endMins = end.hours * 60 + end.minutes;
  if (endMins <= startMins) return false;
  if (minDurationMins > 0 && endMins - startMins < minDurationMins) return false;
  return true;
}