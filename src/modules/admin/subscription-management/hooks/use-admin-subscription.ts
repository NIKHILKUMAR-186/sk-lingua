import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAllStudentSubscriptions,
  getStudentSubscriptionSummary,
  adjustStudentSlots,
  getStudentAdjustmentHistory,
  getStudentUsageLogs,
  getAllRecentAdjustments,
  getAdminDashboardStats,
  extendSubscriptionExpiry,
  replaceSubscriptionPlan,
} from "../services/admin-subscription.service";
import type { StudentSubscriptionInfo, AdminSlotAdjustmentData } from "@/types/subscription-management";

// ============================================================
// Admin Subscription Hooks
// ============================================================

/**
 * Get all students with their subscription information
 */
export function useAllStudentSubscriptions() {
  return useQuery<StudentSubscriptionInfo[]>({
    queryKey: ["admin", "all-student-subscriptions"],
    queryFn: getAllStudentSubscriptions,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

/**
 * Get subscription summary for a specific student
 */
export function useStudentSubscriptionSummary(studentId: string | null) {
  return useQuery({
    queryKey: ["admin", "student-subscription-summary", studentId],
    queryFn: () => (studentId ? getStudentSubscriptionSummary(studentId) : null),
    enabled: !!studentId,
    staleTime: 1000 * 30,
  });
}

/**
 * Adjust student slots (main mutation for all admin adjustments)
 */
export function useAdjustStudentSlots() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: adjustStudentSlots,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Slots adjusted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to adjust slots");
    },
  });
}

/**
 * Get adjustment history for a specific student
 */
export function useStudentAdjustmentHistory(studentId: string | null) {
  return useQuery({
    queryKey: ["admin", "student-adjustment-history", studentId],
    queryFn: () => (studentId ? getStudentAdjustmentHistory(studentId) : []),
    enabled: !!studentId,
    staleTime: 1000 * 30,
  });
}

/**
 * Get usage logs for a specific student
 */
export function useStudentUsageLogs(studentId: string | null) {
  return useQuery({
    queryKey: ["admin", "student-usage-logs", studentId],
    queryFn: () => (studentId ? getStudentUsageLogs(studentId) : []),
    enabled: !!studentId,
    staleTime: 1000 * 30,
  });
}

/**
 * Get all recent adjustments across all students
 */
export function useAllRecentAdjustments(limit: number = 100) {
  return useQuery({
    queryKey: ["admin", "all-recent-adjustments", limit],
    queryFn: () => getAllRecentAdjustments(limit),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

/**
 * Get admin dashboard statistics
 */
export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: getAdminDashboardStats,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

/**
 * Extend subscription expiry
 */
export function useExtendSubscriptionExpiry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ subscriptionId, daysToAdd, adminId, reason }: {
      subscriptionId: string;
      daysToAdd: number;
      adminId: string;
      reason: string;
    }) => extendSubscriptionExpiry(subscriptionId, daysToAdd, adminId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Subscription expiry extended successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to extend subscription expiry");
    },
  });
}

/**
 * Replace subscription plan
 */
export function useReplaceSubscriptionPlan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ subscriptionId, newPlanId, adminId, reason }: {
      subscriptionId: string;
      newPlanId: string;
      adminId: string;
      reason: string;
    }) => replaceSubscriptionPlan(subscriptionId, newPlanId, adminId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Subscription plan replaced successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to replace subscription plan");
    },
  });
}

/**
 * Helper hook to perform slot adjustment with proper data preparation
 */
export function usePerformSlotAdjustment() {
  const adjustMutation = useAdjustStudentSlots();

  const performAdjustment = async (
    data: Omit<AdminSlotAdjustmentData, "admin_id"> & { adminId: string }
  ) => {
    return adjustMutation.mutateAsync(data);
  };

  return {
    performAdjustment,
    isPending: adjustMutation.isPending,
    error: adjustMutation.error,
  };
}