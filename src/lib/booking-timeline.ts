import { supabase } from "@/integrations/supabase/client";
import type { BookingTimelineEntry } from "@/types/booking";

export async function addBookingTimelineEntry(
  bookingId: string,
  actorId: string | null,
  actorRole: string | null,
  action: string,
  description: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  await (supabase as any).from("booking_timeline").insert({
    booking_id: bookingId,
    actor_id: actorId,
    actor_role: actorRole,
    action,
    description,
    metadata,
  });
}

export async function getBookingTimeline(bookingId: string): Promise<BookingTimelineEntry[]> {
  const { data, error } = await (supabase as any)
    .from("booking_timeline")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BookingTimelineEntry[];
}