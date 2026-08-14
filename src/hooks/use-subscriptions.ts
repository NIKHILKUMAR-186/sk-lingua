import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getDemoPlan,
  getRemainingSlots,
  getStudentSubscription,
  getStudentSubscriptionHistory,
  getSubscriptionPlans,
  listAllPlansForAdmin,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  setPlanActive,
  purchaseSubscription,
  renewSubscription,
  cancelSubscription,
  canBookSession,
} from "@/lib/subscriptions";
import type {
  SubscriptionPlan,
  SubscriptionPlanInput,
  StudentSubscription,
} from "@/lib/subscriptions";

export function useSubscriptionPlans() {
  return useQuery<SubscriptionPlan[]>({
    queryKey: ["subscription-plans"],
    queryFn: getSubscriptionPlans,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDemoPlan() {
  return useQuery<SubscriptionPlan | null>({
    queryKey: ["demo-plan"],
    queryFn: getDemoPlan,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useStudentSubscription(userId: string | null) {
  return useQuery<StudentSubscription | null>({
    queryKey: ["student-subscription", userId],
    queryFn: () => (userId ? getStudentSubscription(userId) : null),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export const useCurrentStudentSubscription = useStudentSubscription;

export function useStudentSubscriptionHistory(userId: string | null) {
  return useQuery<StudentSubscription[]>({
    queryKey: ["subscription-history", userId],
    queryFn: () => (userId ? getStudentSubscriptionHistory(userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRemainingSlots(userId: string | null) {
  return useQuery<number>({
    queryKey: ["remaining-slots", userId],
    queryFn: () => (userId ? getRemainingSlots(userId) : 0),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCanBookSession(userId: string | null) {
  return useQuery<{ canBook: boolean; reason?: string; slotsRemaining?: number }>({
    queryKey: ["can-book-session", userId],
    queryFn: () => (userId ? canBookSession(userId) : { canBook: false, reason: "Not logged in" }),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function usePurchaseSubscription() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; planId: string; paymentOrderId: string }) => {
      return await purchaseSubscription(data.userId, data.planId, data.paymentOrderId);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["student-subscription", variables.userId] });
      qc.invalidateQueries({ queryKey: ["subscription-history", variables.userId] });
      qc.invalidateQueries({ queryKey: ["remaining-slots", variables.userId] });
      toast.success("Subscription purchased successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to purchase subscription");
    },
  });
}

export function useRenewSubscription() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; planId: string; paymentOrderId: string }) => {
      return await renewSubscription(data.userId, data.planId, data.paymentOrderId);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["student-subscription", variables.userId] });
      qc.invalidateQueries({ queryKey: ["remaining-slots", variables.userId] });
      toast.success("Subscription renewed successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to renew subscription");
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { subscriptionId: string; userId: string; reason?: string }) => {
      return await cancelSubscription(data.subscriptionId, data.reason);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["student-subscription", variables.userId] });
      qc.invalidateQueries({ queryKey: ["subscription-history", variables.userId] });
      toast.success("Subscription cancelled");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel subscription");
    },
  });
}

// ------------------------------------------------------------------
// ADMIN plan management hooks
// ------------------------------------------------------------------

// List ALL plans (active + inactive) for the admin management screen.
export function useAdminPlans() {
  return useQuery<SubscriptionPlan[]>({
    queryKey: ["admin-subscription-plans"],
    queryFn: listAllPlansForAdmin,
    staleTime: 1000 * 60,
  });
}

// Create a new plan (admin only).
export function useCreatePlan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: SubscriptionPlanInput) => createSubscriptionPlan(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      qc.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Plan created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create plan");
    },
  });
}

// Edit an existing plan (admin only).
export function useUpdatePlan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, input }: { planId: string; input: Partial<SubscriptionPlanInput> }) =>
      updateSubscriptionPlan(planId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      qc.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Plan updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update plan");
    },
  });
}

// Activate / deactivate a plan (admin only).
export function useSetPlanActive() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, isActive }: { planId: string; isActive: boolean }) =>
      setPlanActive(planId, isActive),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      qc.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success(`Plan ${data.is_active ? "activated" : "deactivated"}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update plan status");
    },
  });
}
