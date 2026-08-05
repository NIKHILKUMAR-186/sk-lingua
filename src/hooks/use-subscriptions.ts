import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSubscriptionPlans,
  getStudentSubscription,
  getStudentSubscriptionHistory,
  purchaseSubscription,
  renewSubscription,
  cancelSubscription,
  getRemainingSlots,
  canBookSession,
  getDemoPlan,
  type SubscriptionPlan,
  type StudentSubscription,
} from "@/lib/subscriptions";
import { toast } from "sonner";

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: getSubscriptionPlans,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDemoPlan() {
  return useQuery({
    queryKey: ["demo-plan"],
    queryFn: getDemoPlan,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useStudentSubscription(userId: string | null) {
  return useQuery({
    queryKey: ["student-subscription", userId],
    queryFn: () => (userId ? getStudentSubscription(userId) : null),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useStudentSubscriptionHistory(userId: string | null) {
  return useQuery({
    queryKey: ["subscription-history", userId],
    queryFn: () => (userId ? getStudentSubscriptionHistory(userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRemainingSlots(userId: string | null) {
  return useQuery({
    queryKey: ["remaining-slots", userId],
    queryFn: () => (userId ? getRemainingSlots(userId) : 0),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCanBookSession(userId: string | null) {
  return useQuery({
    queryKey: ["can-book-session", userId],
    queryFn: () =>
      userId ? canBookSession(userId) : { canBook: false, reason: "Not logged in" },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function usePurchaseSubscription() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      planId: string;
      paymentOrderId: string;
    }) => {
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
    mutationFn: async (data: {
      userId: string;
      planId: string;
      paymentOrderId: string;
    }) => {
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
