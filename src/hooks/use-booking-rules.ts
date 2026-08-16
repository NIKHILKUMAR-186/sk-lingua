import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getBookingRules } from "@/lib/booking-rules";

export interface BookingRulesFrontend {
  session_duration_minutes: number;
  minimum_booking_notice_minutes: number;
  maximum_booking_days: number;
  slot_hold_minutes: number;
  cancellation_window_minutes: number;
  same_day_booking_enabled: boolean;
}

export function useBookingRules() {
  return useQuery({
    queryKey: ["booking-rules"],
    queryFn: async (): Promise<BookingRulesFrontend> => {
      const rules = await getBookingRules();
      return rules as BookingRulesFrontend;
    },
    staleTime: 1000 * 60 * 5,
  });
}
