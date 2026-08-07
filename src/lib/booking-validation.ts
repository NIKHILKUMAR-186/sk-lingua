import { supabase } from "@/integrations/supabase/client";
import { canBookSession, getRemainingSlots, deductSubscriptionSlot } from "@/lib/subscriptions";
import { getAvailableCapacity, bookSlot, releaseSlot } from "@/lib/slot-management";

export interface BookingValidationResult {
  canBook: boolean;
  reason?: string;
  details?: {
    slotsRemaining?: number;
    availableCapacity?: number;
    subscriptionExpired?: boolean;
  };
}

// Comprehensive booking validation
export async function validateBookingEligibility(
  userId: string,
  scheduledTime: string,
  durationMins: number,
  mentorId: string,
): Promise<BookingValidationResult> {
  const errors: string[] = [];
  const details: BookingValidationResult["details"] = {};

  // 1. Check subscription status
  const subscriptionCheck = await canBookSession(userId);
  if (!subscriptionCheck.canBook) {
    errors.push(subscriptionCheck.reason || "Cannot book session");
    details.slotsRemaining = subscriptionCheck.slotsRemaining;
  } else {
    details.slotsRemaining = subscriptionCheck.slotsRemaining;
  }

  // 2. Check subscription expiry
  const sub = await getRemainingSlots(userId);
  if (sub <= 0) {
    errors.push("No slots remaining. Please renew your subscription.");
  }

  // 3. Check capacity availability
  const availableCapacity = await getAvailableCapacity(scheduledTime, durationMins);
  details.availableCapacity = availableCapacity;

  if (availableCapacity <= 0) {
    errors.push("This time slot is fully booked. Please choose another time.");
  }

  // 4. Check for duplicate booking
  const { data: existingBookings } = await supabase
    .from("sessions")
    .select("id")
    .eq("student_id", userId)
    .eq("scheduled_time", scheduledTime)
    .in("status", ["pending", "accepted", "confirmed"] as any)
    .maybeSingle();

  if (existingBookings) {
    errors.push("You already have a booking at this time slot.");
  }

  // 5. Check if date is in the past
  const sessionDate = new Date(scheduledTime);
  const now = new Date();
  if (sessionDate < now) {
    errors.push("Cannot book sessions in the past.");
  }

  // 6. Check mentor availability (basic check)
  const { data: mentor } = await supabase
    .from("mentor_profiles")
    .select("availability")
    .eq("user_id", mentorId)
    .maybeSingle();

  if (mentor?.availability) {
    const availability = mentor.availability as any;
    if (availability.vacation_mode) {
      errors.push("Mentor is currently on vacation.");
    }
  }

  if (errors.length > 0) {
    return {
      canBook: false,
      reason: errors[0], // Return first error
      details,
    };
  }

  return {
    canBook: true,
    details,
  };
}

// Book session with slot deduction
export async function bookSessionWithSlotDeduction(
  userId: string,
  bookingData: {
    mentor_id: string;
    scheduled_time: string;
    duration_mins: number;
    language: string;
    topic?: string;
    student_message?: string;
  },
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    // 1. Validate booking eligibility
    const validation = await validateBookingEligibility(
      userId,
      bookingData.scheduled_time,
      bookingData.duration_mins,
      bookingData.mentor_id,
    );

    if (!validation.canBook) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    // 2. Book the capacity slot (atomic operation)
    const slotBooked = await bookSlot(bookingData.scheduled_time, bookingData.duration_mins);
    if (!slotBooked) {
      return {
        success: false,
        error: "Slot was just booked by another student. Please try another time.",
      };
    }

    // 3. Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("sessions")
      .insert({
        student_id: userId,
        mentor_id: bookingData.mentor_id,
        scheduled_time: bookingData.scheduled_time,
        duration_mins: bookingData.duration_mins,
        language: bookingData.language,
        topic: bookingData.topic,
        student_message: bookingData.student_message,
        status: "pending",
      } as any)
      .select()
      .single();

    if (bookingError) {
      // Rollback capacity booking
      await releaseSlot(bookingData.scheduled_time, bookingData.duration_mins);
      return {
        success: false,
        error: "Failed to create booking. Please try again.",
      };
    }

    // 4. Create notifications
    await supabase.from("notifications").insert([
      {
        user_id: bookingData.mentor_id,
        title: "New Session Booking",
        body: `A student has booked a session with you on ${new Date(bookingData.scheduled_time).toLocaleString()}`,
        kind: "booking",
        category: "session",
        related_id: booking.id,
        metadata: { booking_id: booking.id },
      },
      {
        user_id: userId,
        title: "Session Booked",
        body: `Your session has been booked for ${new Date(bookingData.scheduled_time).toLocaleString()}`,
        kind: "booking",
        category: "session",
        related_id: booking.id,
        metadata: { booking_id: booking.id },
      },
    ]);

    return {
      success: true,
      bookingId: booking.id,
    };
  } catch (error) {
    console.error("Error booking session with slot deduction", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

// Complete session with slot deduction
export async function completeSessionWithSlotDeduction(
  userId: string,
  bookingId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get booking details
    const { data: booking, error: fetchError } = await supabase
      .from("sessions")
      .select("scheduled_time, duration_mins, status")
      .eq("id", bookingId)
      .eq("student_id", userId)
      .single();

    if (fetchError || !booking) {
      return {
        success: false,
        error: "Booking not found",
      };
    }

    if (booking.status === "completed") {
      return {
        success: false,
        error: "Session already completed",
      };
    }

    // 2. Deduct subscription slot
    const slotDeducted = await deductSubscriptionSlot(userId, 1);
    if (!slotDeducted) {
      return {
        success: false,
        error: "Failed to deduct slot. Please contact support.",
      };
    }

    // 3. Update booking status
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      } as any)
      .eq("id", bookingId);

    if (updateError) {
      // Rollback slot deduction
      console.error("Failed to update booking status", updateError);
      return {
        success: false,
        error: "Failed to complete session. Please contact support.",
      };
    }

    // 4. Release capacity slot
    await releaseSlot(booking.scheduled_time, booking.duration_mins);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error completing session with slot deduction", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

// Cancel session and release slot
export async function cancelSessionWithSlotRelease(
  bookingId: string,
  userId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get booking details
    const { data: booking, error: fetchError } = await supabase
      .from("sessions")
      .select("scheduled_time, duration_mins, status")
      .eq("id", bookingId)
      .eq("student_id", userId)
      .single();

    if (fetchError || !booking) {
      return {
        success: false,
        error: "Booking not found",
      };
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return {
        success: false,
        error: "Session cannot be cancelled",
      };
    }

    // 2. Update booking status
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      } as any)
      .eq("id", bookingId);

    if (updateError) {
      return {
        success: false,
        error: "Failed to cancel session",
      };
    }

    // 3. Release capacity slot
    await releaseSlot(booking.scheduled_time, booking.duration_mins);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error cancelling session", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

// Check if user can book (quick check without full validation)
export async function quickBookingCheck(userId: string): Promise<{
  canBook: boolean;
  reason?: string;
  slotsRemaining: number;
}> {
  const slotsRemaining = await getRemainingSlots(userId);

  if (slotsRemaining <= 0) {
    return {
      canBook: false,
      reason: "No slots remaining",
      slotsRemaining: 0,
    };
  }

  return {
    canBook: true,
    slotsRemaining,
  };
}
