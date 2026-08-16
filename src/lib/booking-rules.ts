import { supabase } from "@/integrations/supabase/client";

export interface BookingRules {
  session_duration_minutes: number;
  minimum_booking_notice_minutes: number;
  maximum_booking_days: number;
  slot_hold_minutes: number;
  cancellation_window_minutes: number;
  same_day_booking_enabled: boolean;
}

const DEFAULT_RULES: BookingRules = {
  session_duration_minutes: 30,
  minimum_booking_notice_minutes: 30,
  maximum_booking_days: 30,
  slot_hold_minutes: 10,
  cancellation_window_minutes: 60,
  same_day_booking_enabled: true,
};

let cachedRules: BookingRules | null = null;
let lastFetch = 0;
const CACHE_TTL = 60_000;

export async function getBookingRules(): Promise<BookingRules> {
  const now = Date.now();
  if (cachedRules && now - lastFetch < CACHE_TTL) {
    return cachedRules;
  }

  try {
    const { data, error } = await supabase.from("booking_rules").select("key, value");

    if (error || !data) {
      return DEFAULT_RULES;
    }

    const rules: BookingRules = { ...DEFAULT_RULES };
    for (const row of data) {
      const key = row.key as keyof BookingRules;
      if (key in rules) {
        const val = row.value;
        if (key === "same_day_booking_enabled") {
          rules[key] = val === "true";
        } else {
          const num = Number(val);
          rules[key] = Number.isFinite(num) ? num : (DEFAULT_RULES as BookingRules)[key];
        }
      }
    }

    cachedRules = rules;
    lastFetch = now;
    return rules;
  } catch {
    return DEFAULT_RULES;
  }
}

export async function getBookingRule(key: keyof BookingRules): Promise<string | number | boolean> {
  const rules = await getBookingRules();
  return rules[key];
}

export function resetBookingRulesCache() {
  cachedRules = null;
  lastFetch = 0;
}
