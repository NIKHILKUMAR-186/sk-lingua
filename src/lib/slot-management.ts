import { supabase } from "@/integrations/supabase/client";

export interface BookingCapacity {
  id: string;
  scheduled_time: string;
  duration_mins: number;
  total_capacity: number;
  booked_count: number;
  available_count: number;
  created_at: string;
  updated_at: string;
}

export interface SlotRestorationRequest {
  id: string;
  user_id: string;
  subscription_id: string;
  booking_id: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface SlotRestorationAudit {
  id: string;
  restoration_request_id: string;
  user_id: string;
  subscription_id: string;
  slots_restored: number;
  reason: string;
  performed_by: string;
  created_at: string;
}

// Initialize booking capacity for a time slot
export async function initializeBookingCapacity(
  scheduledTime: string,
  durationMins: number,
  totalCapacity: number,
): Promise<BookingCapacity> {
  const { data, error } = await (supabase.from("booking_capacity" as any) as any)
    .upsert({
      scheduled_time: scheduledTime,
      duration_mins: durationMins,
      total_capacity: totalCapacity,
      booked_count: 0,
      available_count: totalCapacity,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BookingCapacity;
}

// Get available capacity for a time slot
export async function getAvailableCapacity(
  scheduledTime: string,
  durationMins: number,
): Promise<number> {
  const { data, error } = await (supabase.from("booking_capacity" as any) as any)
    .select("available_count")
    .eq("scheduled_time", scheduledTime)
    .eq("duration_mins", durationMins)
    .maybeSingle();

  if (error) throw error;
  return data?.available_count ?? 0;
}

// Book a slot (decrement available count)
export async function bookSlot(scheduledTime: string, durationMins: number): Promise<boolean> {
  // First get current capacity
  const { data: current, error: fetchError } = await (
    supabase.from("booking_capacity" as any) as any
  )
    .select("booked_count, available_count, total_capacity")
    .eq("scheduled_time", scheduledTime)
    .eq("duration_mins", durationMins)
    .maybeSingle();

  if (fetchError || !current || current.available_count <= 0) {
    return false;
  }

  // Update with computed values
  const newBookedCount = current.booked_count + 1;
  const newAvailableCount = current.total_capacity - newBookedCount;

  const { data, error } = await (supabase.from("booking_capacity" as any) as any)
    .update({
      booked_count: newBookedCount,
      available_count: Math.max(newAvailableCount, 0),
    })
    .eq("scheduled_time", scheduledTime)
    .eq("duration_mins", durationMins)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Failed to book slot", error);
    return false;
  }

  return !!data;
}

// Release a slot (increment available count)
export async function releaseSlot(scheduledTime: string, durationMins: number): Promise<boolean> {
  // First get current capacity
  const { data: current, error: fetchError } = await (
    supabase.from("booking_capacity" as any) as any
  )
    .select("booked_count, available_count, total_capacity")
    .eq("scheduled_time", scheduledTime)
    .eq("duration_mins", durationMins)
    .maybeSingle();

  if (fetchError || !current) {
    return false;
  }

  // Update with computed values
  const newBookedCount = Math.max(current.booked_count - 1, 0);
  const newAvailableCount = Math.min(
    current.total_capacity - newBookedCount,
    current.total_capacity,
  );

  const { data, error } = await (supabase.from("booking_capacity" as any) as any)
    .update({
      booked_count: newBookedCount,
      available_count: newAvailableCount,
    })
    .eq("scheduled_time", scheduledTime)
    .eq("duration_mins", durationMins)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Failed to release slot", error);
    return false;
  }

  return !!data;
}

// Get all capacity for a date range
export async function getCapacityForDateRange(
  startDate: string,
  endDate: string,
): Promise<BookingCapacity[]> {
  const { data, error } = await (supabase.from("booking_capacity" as any) as any)
    .select("*")
    .gte("scheduled_time", startDate)
    .lte("scheduled_time", endDate)
    .order("scheduled_time");

  if (error) throw error;
  return (data ?? []) as BookingCapacity[];
}

// Create slot restoration request
export async function createSlotRestorationRequest(
  userId: string,
  subscriptionId: string,
  bookingId: string | null,
  reason: string,
): Promise<SlotRestorationRequest> {
  const { data, error } = await (supabase.from("slot_restoration_requests" as any) as any)
    .insert({
      user_id: userId,
      subscription_id: subscriptionId,
      booking_id: bookingId,
      reason: reason,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as SlotRestorationRequest;
}

// Get slot restoration requests for user
export async function getSlotRestorationRequests(
  userId: string,
): Promise<SlotRestorationRequest[]> {
  const { data, error } = await (supabase.from("slot_restoration_requests" as any) as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SlotRestorationRequest[];
}

// Approve slot restoration request (admin only)
export async function approveSlotRestoration(
  requestId: string,
  reviewedBy: string,
  reviewNotes?: string,
): Promise<SlotRestorationRequest> {
  const { data: request, error: fetchError } = await (
    supabase.from("slot_restoration_requests" as any) as any
  )
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError) throw fetchError;

  // Update request status
  const { data: updatedRequest, error: updateError } = await (
    supabase.from("slot_restoration_requests" as any) as any
  )
    .update({
      status: "approved",
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Restore slot to subscription
  // First get current subscription
  const { data: sub, error: subFetchError } = await (
    supabase.from("student_subscriptions" as any) as any
  )
    .select("current_session_slots, used_session_slots")
    .eq("id", request.subscription_id)
    .single();

  if (subFetchError || !sub) {
    console.error("Failed to fetch subscription", subFetchError);
    throw new Error("Subscription not found");
  }

  const { error: restoreError } = await (supabase.from("student_subscriptions" as any) as any)
    .update({
      current_session_slots: sub.current_session_slots + 1,
      used_session_slots: Math.max((sub.used_session_slots ?? 0) - 1, 0),
    })
    .eq("id", request.subscription_id);

  if (restoreError) {
    console.error("Failed to restore slot", restoreError);
    throw restoreError;
  }

  // Create audit record
  const { error: auditError } = await (
    supabase.from("slot_restoration_audit" as any) as any
  ).insert({
    restoration_request_id: requestId,
    user_id: request.user_id,
    subscription_id: request.subscription_id,
    slots_restored: 1,
    reason: request.reason,
    performed_by: reviewedBy,
  });

  if (auditError) console.error("Failed to create audit record", auditError);

  return updatedRequest as SlotRestorationRequest;
}

// Reject slot restoration request (admin only)
export async function rejectSlotRestoration(
  requestId: string,
  reviewedBy: string,
  reviewNotes?: string,
): Promise<SlotRestorationRequest> {
  const { data, error } = await (supabase.from("slot_restoration_requests" as any) as any)
    .update({
      status: "rejected",
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw error;
  return data as SlotRestorationRequest;
}

// Get slot restoration audit for user
export async function getSlotRestorationAudit(userId: string): Promise<SlotRestorationAudit[]> {
  const { data, error } = await (supabase.from("slot_restoration_audit" as any) as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SlotRestorationAudit[];
}

// Get all pending slot restoration requests (admin)
export async function getPendingSlotRestorationRequests(): Promise<SlotRestorationRequest[]> {
  const { data, error } = await (supabase.from("slot_restoration_requests" as any) as any)
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SlotRestorationRequest[];
}
