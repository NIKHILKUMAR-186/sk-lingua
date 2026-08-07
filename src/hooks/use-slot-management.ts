import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAvailableCapacity,
  bookSlot,
  releaseSlot,
  getCapacityForDateRange,
  createSlotRestorationRequest,
  getSlotRestorationRequests,
  approveSlotRestoration,
  rejectSlotRestoration,
  getSlotRestorationAudit,
  getPendingSlotRestorationRequests,
  type BookingCapacity,
  type SlotRestorationRequest,
  type SlotRestorationAudit,
} from "@/lib/slot-management";

// Capacity Queries
export function useAvailableCapacity(scheduledTime: string | null, durationMins: number | null) {
  return useQuery({
    queryKey: ["available-capacity", scheduledTime, durationMins],
    queryFn: async () => {
      if (!scheduledTime || !durationMins) return 0;
      return await getAvailableCapacity(scheduledTime, durationMins);
    },
    enabled: !!scheduledTime && !!durationMins,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Refetch every 30 seconds for real-time updates
  });
}

export function useCapacityForDateRange(startDate: string | null, endDate: string | null) {
  return useQuery({
    queryKey: ["capacity-date-range", startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      return await getCapacityForDateRange(startDate, endDate);
    },
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Slot Booking Mutations
export function useBookSlot() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { scheduledTime: string; durationMins: number }) => {
      return await bookSlot(data.scheduledTime, data.durationMins);
    },
    onSuccess: (data, variables) => {
      if (data) {
        qc.invalidateQueries({
          queryKey: ["available-capacity", variables.scheduledTime, variables.durationMins],
        });
        toast.success("Slot booked successfully");
      } else {
        toast.error("No slots available");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to book slot");
    },
  });
}

export function useReleaseSlot() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { scheduledTime: string; durationMins: number }) => {
      return await releaseSlot(data.scheduledTime, data.durationMins);
    },
    onSuccess: (data, variables) => {
      if (data) {
        qc.invalidateQueries({
          queryKey: ["available-capacity", variables.scheduledTime, variables.durationMins],
        });
        toast.success("Slot released successfully");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to release slot");
    },
  });
}

// Slot Restoration Queries
export function useSlotRestorationRequests(userId: string | null) {
  return useQuery({
    queryKey: ["slot-restoration-requests", userId],
    queryFn: async () => {
      if (!userId) return [];
      return await getSlotRestorationRequests(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function usePendingSlotRestorationRequests() {
  return useQuery({
    queryKey: ["pending-slot-restoration-requests"],
    queryFn: async () => {
      return await getPendingSlotRestorationRequests();
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });
}

export function useSlotRestorationAudit(userId: string | null) {
  return useQuery({
    queryKey: ["slot-restoration-audit", userId],
    queryFn: async () => {
      if (!userId) return [];
      return await getSlotRestorationAudit(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Slot Restoration Mutations
export function useCreateSlotRestorationRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      subscriptionId: string;
      bookingId?: string;
      reason: string;
    }) => {
      return await createSlotRestorationRequest(
        data.userId,
        data.subscriptionId,
        data.bookingId || null,
        data.reason,
      );
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["slot-restoration-requests", variables.userId] });
      toast.success("Slot restoration request submitted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit request");
    },
  });
}

export function useApproveSlotRestoration() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requestId: string; reviewedBy: string; reviewNotes?: string }) => {
      return await approveSlotRestoration(data.requestId, data.reviewedBy, data.reviewNotes);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-slot-restoration-requests"] });
      qc.invalidateQueries({ queryKey: ["slot-restoration-requests"] });
      qc.invalidateQueries({ queryKey: ["slot-restoration-audit"] });
      toast.success("Slot restoration approved");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve request");
    },
  });
}

export function useRejectSlotRestoration() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requestId: string; reviewedBy: string; reviewNotes?: string }) => {
      return await rejectSlotRestoration(data.requestId, data.reviewedBy, data.reviewNotes);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-slot-restoration-requests"] });
      qc.invalidateQueries({ queryKey: ["slot-restoration-requests"] });
      toast.success("Slot restoration rejected");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject request");
    },
  });
}
