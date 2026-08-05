import { supabase } from "@/integrations/supabase/client";

export interface SessionSlot {
  id: string;
  slot_date: string;
  slot_time_start: string;
  slot_time_end: string;
  capacity: number;
  booked_count: number;
  status: "available" | "limited" | "full";
  languages: string[];
  mentor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlotBooking {
  id: string;
  slot_id: string;
  user_id: string;
  booking_id: string | null;
  booking_type: "demo" | "session";
  status: "confirmed" | "cancelled" | "completed";
  created_at: string;
  updated_at: string;
}

// Get available slots for a date range
export async function getAvailableSlots(
  startDate: string,
  endDate: string,
  language?: string
): Promise<SessionSlot[]> {
  let query = supabase
    .from("session_slots")
    .select("*")
    .gte("slot_date", startDate)
    .lte("slot_date", endDate)
    .in("status", ["available", "limited"])
    .order("slot_date")
    .order("slot_time_start");

  if (language) {
    query = query.contains("languages", [language]);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

// Get slots for specific date
export async function getSlotsByDate(date: string, language?: string): Promise<SessionSlot[]> {
  let query = supabase
    .from("session_slots")
    .select("*")
    .eq("slot_date", date)
    .in("status", ["available", "limited"])
    .order("slot_time_start");

  if (language) {
    query = query.contains("languages", [language]);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

// Get single slot
export async function getSlot(id: string): Promise<SessionSlot | null> {
  const { data, error } = await supabase
    .from("session_slots")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Create a slot
export async function createSlot(data: {
  slot_date: string;
  slot_time_start: string;
  slot_time_end: string;
  capacity?: number;
  languages?: string[];
}): Promise<SessionSlot> {
  const { data: slot, error } = await supabase
    .from("session_slots")
    .insert({
      slot_date: data.slot_date,
      slot_time_start: data.slot_time_start,
      slot_time_end: data.slot_time_end,
      capacity: data.capacity ?? 1,
      languages: data.languages ?? [],
      status: "available",
      booked_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return slot;
}

// Check if slot can be booked
export async function canBookSlot(slotId: string): Promise<{
  canBook: boolean;
  reason?: string;
  remainingCapacity?: number;
}> {
  const slot = await getSlot(slotId);

  if (!slot) {
    return { canBook: false, reason: "Slot not found" };
  }

  if (slot.status === "full") {
    return { canBook: false, reason: "Slot is full" };
  }

  const remainingCapacity = slot.capacity - slot.booked_count;

  if (remainingCapacity <= 0) {
    return { canBook: false, reason: "No capacity remaining" };
  }

  // Check if slot is in the future
  const slotDateTime = new Date(`${slot.slot_date}T${slot.slot_time_start}`);
  if (slotDateTime < new Date()) {
    return { canBook: false, reason: "Slot is in the past" };
  }

  return { canBook: true, remainingCapacity };
}

// Book a slot
export async function bookSlot(
  slotId: string,
  userId: string,
  bookingId: string,
  bookingType: "demo" | "session"
): Promise<SlotBooking> {
  // Check if can book
  const canBook = await canBookSlot(slotId);
  if (!canBook.canBook) {
    throw new Error(canBook.reason);
  }

  // Check for duplicate booking
  const { data: existing } = await supabase
    .from("slot_bookings")
    .select("id")
    .eq("slot_id", slotId)
    .eq("user_id", userId)
    .eq("booking_type", bookingType)
    .maybeSingle();

  if (existing) {
    throw new Error("Already booked this slot");
  }

  // Create booking in transaction
  const { data: booking, error: bookingError } = await supabase
    .from("slot_bookings")
    .insert({
      slot_id: slotId,
      user_id: userId,
      booking_id: bookingId,
      booking_type: bookingType,
      status: "confirmed",
    })
    .select()
    .single();

  if (bookingError) throw bookingError;

  // Update slot capacity
  const slot = await getSlot(slotId);
  if (!slot) throw new Error("Slot not found");

  const newBookedCount = slot.booked_count + 1;
  const newStatus =
    newBookedCount >= slot.capacity
      ? "full"
      : newBookedCount > Math.ceil(slot.capacity * 0.8)
        ? "limited"
        : "available";

  const { error: slotError } = await supabase
    .from("session_slots")
    .update({
      booked_count: newBookedCount,
      status: newStatus,
    })
    .eq("id", slotId);

  if (slotError) {
    // Rollback booking if slot update fails
    await supabase.from("slot_bookings").delete().eq("id", booking.id);
    throw slotError;
  }

  return booking;
}

// Cancel slot booking
export async function cancelSlotBooking(slotBookingId: string): Promise<SlotBooking> {
  // Get booking details first
  const { data: booking, error: fetchError } = await supabase
    .from("slot_bookings")
    .select("*")
    .eq("id", slotBookingId)
    .single();

  if (fetchError) throw fetchError;

  // Update booking status
  const { data: updated, error: updateError } = await supabase
    .from("slot_bookings")
    .update({ status: "cancelled" })
    .eq("id", slotBookingId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Update slot capacity
  const slot = await getSlot(booking.slot_id);
  if (slot) {
    const newBookedCount = Math.max(0, slot.booked_count - 1);
    const newStatus = newBookedCount === 0 ? "available" : "limited";

    await supabase
      .from("session_slots")
      .update({
        booked_count: newBookedCount,
        status: newStatus,
      })
      .eq("id", slot.id);
  }

  return updated;
}

// Get user's slot bookings
export async function getUserSlotBookings(
  userId: string,
  bookingType?: "demo" | "session"
): Promise<SlotBooking[]> {
  let query = supabase
    .from("slot_bookings")
    .select("*")
    .eq("user_id", userId);

  if (bookingType) {
    query = query.eq("booking_type", bookingType);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Get slot bookings
export async function getSlotBookings(slotId: string): Promise<SlotBooking[]> {
  const { data, error } = await supabase
    .from("slot_bookings")
    .select("*")
    .eq("slot_id", slotId)
    .eq("status", "confirmed");

  if (error) throw error;
  return data ?? [];
}

// Get slot availability status
export function getSlotAvailabilityStatus(slot: SessionSlot): {
  status: "available" | "limited" | "full";
  label: string;
  color: string;
} {
  if (slot.status === "full") {
    return {
      status: "full",
      label: "FULL",
      color: "text-red-600",
    };
  }

  if (slot.status === "limited") {
    const remaining = slot.capacity - slot.booked_count;
    return {
      status: "limited",
      label: `${remaining} spot${remaining !== 1 ? "s" : ""} left`,
      color: "text-yellow-600",
    };
  }

  return {
    status: "available",
    label: "Available",
    color: "text-green-600",
  };
}

// Format slot time
export function formatSlotTime(slot: SessionSlot): string {
  const start = new Date(`${slot.slot_date}T${slot.slot_time_start}`);
  const end = new Date(`${slot.slot_date}T${slot.slot_time_end}`);

  return `${start.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
}

// Get remaining slots in a capacity
export function getRemainingCapacity(slot: SessionSlot): number {
  return Math.max(0, slot.capacity - slot.booked_count);
}
