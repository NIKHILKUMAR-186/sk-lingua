import { describe, it, expect } from "vitest";
import {
  safeDate,
  safeTimeString,
  safeUTCTimestamp,
  isInvalidUTCTimestamp,
} from "@/lib/safe-datetime";

describe("safeDate", () => {
  it("accepts valid ISO string", () => {
    const result = safeDate("2024-01-15T10:30:00Z");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value.toISOString()).toBe("2024-01-15T10:30:00.000Z");
    }
  });

  it("accepts valid Date object", () => {
    const date = new Date("2024-01-15T10:30:00Z");
    const result = safeDate(date);
    expect(result.valid).toBe(true);
  });

  it("rejects null", () => {
    const result = safeDate(null);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("null_or_undefined");
  });

  it("rejects undefined", () => {
    const result = safeDate(undefined);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("null_or_undefined");
  });

  it("rejects empty string", () => {
    const result = safeDate("");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("empty_string");
  });

  it("rejects malformed string", () => {
    const result = safeDate("not-a-date");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("invalid_date_string");
  });

  it("rejects invalid Date object", () => {
    const date = new Date("invalid");
    const result = safeDate(date);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("invalid_date_object");
  });
});

describe("safeTimeString", () => {
  it("accepts valid HH:MI format", () => {
    const result = safeTimeString("14:30");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.hours).toBe(14);
      expect(result.minutes).toBe(30);
    }
  });

  it("accepts valid HH:MI:SS format", () => {
    const result = safeTimeString("09:05:30");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.hours).toBe(9);
      expect(result.minutes).toBe(5);
    }
  });

  it("rejects null", () => {
    const result = safeTimeString(null);
    expect(result.valid).toBe(false);
  });

  it("rejects undefined", () => {
    const result = safeTimeString(undefined);
    expect(result.valid).toBe(false);
  });

  it("rejects empty string", () => {
    const result = safeTimeString("");
    expect(result.valid).toBe(false);
  });

  it("rejects malformed format", () => {
    const result = safeTimeString("25:00");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("invalid_time_values");
  });

  it("rejects invalid hours", () => {
    const result = safeTimeString("25:00");
    expect(result.valid).toBe(false);
  });

  it("rejects invalid minutes", () => {
    const result = safeTimeString("12:60");
    expect(result.valid).toBe(false);
  });

  it("rejects negative hours", () => {
    const result = safeTimeString("-1:00");
    expect(result.valid).toBe(false);
  });
});

describe("safeUTCTimestamp", () => {
  it("returns ISO string for valid date", () => {
    const result = safeUTCTimestamp("2024-01-15T10:30:00Z");
    expect(result).toBe("2024-01-15T10:30:00.000Z");
  });

  it("returns sentinel for invalid date", () => {
    const result = safeUTCTimestamp("invalid");
    expect(result).toBe("0001-01-01T00:00:00.000Z");
  });

  it("returns sentinel for null", () => {
    const result = safeUTCTimestamp(null);
    expect(result).toBe("0001-01-01T00:00:00.000Z");
  });
});

describe("isInvalidUTCTimestamp", () => {
  it("detects sentinel value", () => {
    expect(isInvalidUTCTimestamp("0001-01-01T00:00:00.000Z")).toBe(true);
  });

  it("accepts valid timestamp", () => {
    expect(isInvalidUTCTimestamp("2024-01-15T10:30:00.000Z")).toBe(false);
  });
});