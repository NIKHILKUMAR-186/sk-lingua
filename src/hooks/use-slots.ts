import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAvailableSlots,
  getSlotsByDate,
  getSlot,
  createSlot,
  bookSlot,
  cancelSlotBooking,
  getUserSlotBookings,
  type SessionSlot,
  type SlotBooking,
} from "@/lib/slots";
import { toast } from "sonner";

export function useAvailableSlots(startDate: string | null, endDate: string | null, language?: string) {
  return useQuery({
    queryKey: ["available-slots", startDate, endDate, language],
    queryFn: () =>
      startDate && endDate ? getAvailableSlots(startDate, endDate, language) : [],
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useSlotsByDate(date: string | null, language?: string) {
  return useQuery({
    queryKey: ["slots-by-date", date, language],
    queryFn: () => (date ? getSlotsByDate(date, language) : []),
    enabled: !!date,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useSlot(slotId: string | null) {
  return useQuery({
    queryKey: ["slot", slotId],
    queryFn: () => (slotId ? getSlot(slotId) : null),
    enabled: !!slotId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useBookSlot() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      slotId: string;
      userId: string;
      bookingId: string;
      bookingType: "demo" | "session";
    }) => {
      return await bookSlot(data.slotId, data.userId, data.bookingId, data.bookingType);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["slot", variables.slotId] });
      qc.invalidateQueries({ queryKey: ["available-slots"] });
      qc.invalidateQueries({ queryKey: ["slots-by-date"] });
      qc.invalidateQueries({ queryKey: ["user-slot-bookings", variables.userId] });
      toast.success("Slot booked successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to book slot");
    },
  });
}

export function useCancelSlotBooking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { slotBookingId: string; userId: string }) => {
      return await cancelSlotBooking(data.slotBookingId);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["user-slot-bookings", variables.userId] });
      qc.invalidateQueries({ queryKey: ["available-slots"] });
      qc.invalidateQueries({ queryKey: ["slots-by-date"] });
      toast.success("Slot booking cancelled");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel booking");
    },
  });
}

export function useUserSlotBookings(userId: string | null, bookingType?: "demo" | "session") {
  return useQuery({
    queryKey: ["user-slot-bookings", userId, bookingType],
    queryFn: () => (userId ? getUserSlotBookings(userId, bookingType) : []),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}
