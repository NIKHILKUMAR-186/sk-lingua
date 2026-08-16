/**
 * Safe date/time normalization utility.
 *
 * Rules:
 * - Never call toISOString() on an unvalidated Date.
 * - Treat null/undefined/empty strings/malformed values as invalid.
 * - Return a sentinel for invalid inputs and let callers decide how to handle them.
 */

export type SafeDateResult =
  | { valid: true; value: Date }
  | { valid: false; reason: string; raw: unknown };

export type SafeTimeResult =
  | { valid: true; hours: number; minutes: number }
  | { valid: false; reason: string; raw: unknown };

const SENTINEL_ISO = "0001-01-01T00:00:00.000Z";
const SENTINEL_DATE = new Date("0001-01-01T00:00:00.000Z");

export function safeDate(value: unknown): SafeDateResult {
  if (value === null || value === undefined) {
    return { valid: false, reason: "null_or_undefined", raw: value };
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return { valid: false, reason: "invalid_date_object", raw: value };
    }
    return { valid: true, value };
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return { valid: false, reason: "unsupported_type", raw: value };
  }

  const str = String(value).trim();
  if (str === "") {
    return { valid: false, reason: "empty_string", raw: value };
  }

  const date = new Date(str);

  if (Number.isNaN(date.getTime())) {
    return { valid: false, reason: "invalid_date_string", raw: value };
  }

  return { valid: true, value: date };
}

export function safeTimeString(value: unknown): SafeTimeResult {
  if (value === null || value === undefined) {
    return { valid: false, reason: "null_or_undefined", raw: value };
  }

  const str = String(value).trim();
  if (str === "") {
    return { valid: false, reason: "empty_string", raw: value };
  }

  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return { valid: false, reason: "malformed_time_format", raw: value };
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return { valid: false, reason: "invalid_time_values", raw: value };
  }

  return { valid: true, hours, minutes };
}

export function safeUTCTimestamp(value: unknown): string {
  const result = safeDate(value);
  if (!result.valid) {
    return SENTINEL_ISO;
  }
  return result.value.toISOString();
}

export function isInvalidUTCTimestamp(value: string): boolean {
  return value === SENTINEL_ISO;
}

export function sentinelDate(): Date {
  return new Date(SENTINEL_DATE);
}