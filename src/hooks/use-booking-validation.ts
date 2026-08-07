import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  validateBookingEligibility,
  bookSessionWithSlotDeduction,
  completeSessionWithSlotDeduction,
  cancelSessionWithSlotRelease,
  quickBookingCheck,
  type BookingValidationResult,
} from "@/lib/booking-validation";

// Booking Validation Queries
export function useBookingValidation(
  userId: string | null,
  scheduledTime: string | null,
  durationMins: number | null,
  mentorId: string | null,
) {
  return useQuery({
    queryKey: ["booking-validation", userId, scheduledTime, durationMins, mentorId],
    queryFn: async () => {
      if (!userId || !scheduledTime || !durationMins || !mentorId) {
        return null;
      }
      return await validateBookingEligibility(userId, scheduledTime, durationMins, mentorId);
    },
    enabled: !!userId && !!scheduledTime && !!durationMins && !!mentorId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Refetch every 30 seconds for real-time updates
  });
}

export function useQuickBookingCheck(userId: string | null) {
  return useQuery({
    queryKey: ["quick-booking-check", userId],
    queryFn: async () => {
      if (!userId) return { canBook: false, slotsRemaining: 0 };
      return await quickBookingCheck(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Booking Mutations
export function useBookSessionWithSlotDeduction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      mentor_id: string;
      scheduled_time: string;
      duration_mins: number;
      language: string;
      topic?: string;
      student_message?: string;
    }) => {
      return await bookSessionWithSlotDeduction(data.userId, data);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        qc.invalidateQueries({ queryKey: ["quick-booking-check", variables.userId] });
        qc.invalidateQueries({ queryKey: ["upcoming-sessions", variables.userId] });
        qc.invalidateQueries({ queryKey: ["available-capacity"] });
        toast.success("Session booked successfully!");
      } else {
        toast.error(data.error || "Failed to book session");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to book session");
    },
  });
}

export function useCompleteSessionWithSlotDeduction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; bookingId: string }) => {
      return await completeSessionWithSlotDeduction(data.userId, data.bookingId);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        qc.invalidateQueries({ queryKey: ["quick-booking-check", variables.userId] });
        qc.invalidateQueries({ queryKey: ["upcoming-sessions", variables.userId] });
        qc.invalidateQueries({ queryKey: ["sessions"] });
        toast.success("Session completed! Slot deducted.");
      } else {
        toast.error(data.error || "Failed to complete session");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete session");
    },
  });
}

export function useCancelSessionWithSlotRelease() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { bookingId: string; userId: string; reason?: string }) => {
      return await cancelSessionWithSlotRelease(data.bookingId, data.userId, data.reason);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        qc.invalidateQueries({ queryKey: ["quick-booking-check", variables.userId] });
        qc.invalidateQueries({ queryKey: ["upcoming-sessions", variables.userId] });
        qc.invalidateQueries({ queryKey: ["available-capacity"] });
        toast.success("Session cancelled. Slot released.");
      } else {
        toast.error(data.error || "Failed to cancel session");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel session");
    },
  });
}
