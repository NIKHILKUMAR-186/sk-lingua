import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getStudentDetail,
  addSessions,
  removeSessions,
  activateSubscription,
  deactivateSubscription,
  extendExpiry,
  updateStudentProfile,
  createSubscription,
  replacePlan,
  fetchPlans,
  listStudents,
  getStudentStats,
  type StudentDetail,
  type StudentSubscriptionLite,
  type PlanLite,
  type AdminStudentsList,
  type AdminStudentsStats,
  type StudentFilter,
} from "../services/student-control.service";

const adminKey = ["admin", "students"];

export function useStudentDetail(studentId: string | null, subscriptionId?: string | null) {
  return useQuery({
    queryKey: [...adminKey, "detail", studentId, subscriptionId ?? null],
    queryFn: () =>
      studentId ? getStudentDetail(studentId, subscriptionId ?? undefined) : Promise.resolve(null),
    enabled: !!studentId,
    staleTime: 1000 * 15,
  }) as UseQueryResult<StudentDetail | null>;
}

function useRefreshDetail() {
  const qc = useQueryClient();
  return (studentId: string | null, subscriptionId?: string | null) => {
    qc.invalidateQueries({
      queryKey: [...adminKey, "detail", studentId ?? null, subscriptionId ?? null],
    });
    qc.invalidateQueries({ queryKey: adminKey });
  };
}

/**
 * Persist profile edits from the admin student detail view.
 */
export function useUpdateStudentProfile() {
  const qc = useQueryClient();
  const refresh = useRefreshDetail();
  return useMutation({
    mutationFn: ({
      studentId,
      updates,
    }: {
      studentId: string;
      updates: Parameters<typeof updateStudentProfile>[1];
    }) => updateStudentProfile(studentId, updates),
    onSuccess: (_data, { studentId }) => {
      qc.invalidateQueries({ queryKey: adminKey });
      qc.invalidateQueries({ queryKey: [...adminKey, "list"] });
      toast.success("Student profile updated");
      refresh(studentId, null);
    },
    onError: (error: any) =>
      toast.error(error.message || "Unable to update student profile. Please try again."),
  });
}

export function useAddSessions(studentId: string | null, subscriptionId: string | null) {
  const qc = useQueryClient();
  const refresh = useRefreshDetail();
  return useMutation({
    mutationFn: ({ amount, reason }: { amount: number; reason: string }) =>
      addSessions(subscriptionId as string, amount, reason),
    onSuccess: (data: StudentSubscriptionLite) => {
      qc.invalidateQueries({ queryKey: adminKey });
      toast.success("Sessions added");
      refresh(studentId, data.id);
    },
    onError: (error: any) =>
      toast.error(error.message || "Unable to update subscription. Please try again."),
  });
}

export function useRemoveSessions(studentId: string | null, subscriptionId: string | null) {
  const qc = useQueryClient();
  const refresh = useRefreshDetail();
  return useMutation({
    mutationFn: ({ amount, reason }: { amount: number; reason: string }) =>
      removeSessions(subscriptionId as string, amount, reason),
    onSuccess: (data: StudentSubscriptionLite) => {
      qc.invalidateQueries({ queryKey: adminKey });
      toast.success("Sessions removed");
      refresh(studentId, data.id);
    },
    onError: (error: any) =>
      toast.error(error.message || "Unable to update subscription. Please try again."),
  });
}

export function useExtendExpiry(studentId: string | null, subscriptionId: string | null) {
  const qc = useQueryClient();
  const refresh = useRefreshDetail();
  return useMutation({
    mutationFn: ({ days, reason }: { days: number; reason: string }) =>
      extendExpiry(subscriptionId as string, days, reason),
    onSuccess: (data: StudentSubscriptionLite) => {
      qc.invalidateQueries({ queryKey: adminKey });
      toast.success("Expiry extended");
      refresh(studentId, data.id);
    },
    onError: (error: any) =>
      toast.error(error.message || "Unable to update subscription. Please try again."),
  });
}

export function useActivateSubscription(studentId: string | null) {
  const qc = useQueryClient();
  const refresh = useRefreshDetail();
  return useMutation({
    mutationFn: ({ subscriptionId, reason }: { subscriptionId: string; reason: string }) =>
      activateSubscription(subscriptionId, reason),
    onSuccess: (data: StudentSubscriptionLite) => {
      qc.invalidateQueries({ queryKey: adminKey });
      toast.success("Subscription activated");
      refresh(studentId, data.id);
    },
    onError: (error: any) =>
      toast.error(error.message || "Unable to update subscription. Please try again."),
  });
}

export function useDeactivateSubscription(studentId: string | null) {
  const qc = useQueryClient();
  const refresh = useRefreshDetail();
  return useMutation({
    mutationFn: ({ subscriptionId, reason }: { subscriptionId: string; reason: string }) =>
      deactivateSubscription(subscriptionId, reason),
    onSuccess: (data: StudentSubscriptionLite) => {
      qc.invalidateQueries({ queryKey: adminKey });
      toast.success("Subscription deactivated");
      refresh(studentId, data.id);
    },
    onError: (error: any) =>
      toast.error(error.message || "Unable to update subscription. Please try again."),
  });
}

export function useCreateSubscription(studentId: string | null) {
  const qc = useQueryClient();
  const refresh = useRefreshDetail();
  return useMutation({
    mutationFn: ({ planId, reason }: { planId: string; reason: string }) =>
      createSubscription(studentId!, planId, reason),
    onSuccess: (data: StudentSubscriptionLite) => {
      qc.invalidateQueries({ queryKey: adminKey });
      toast.success("Subscription created");
      refresh(studentId, data.id);
    },
    onError: (error: any) =>
      toast.error(error.message || "Unable to create subscription. Please try again."),
  });
}

export function useReplacePlan(studentId: string | null) {
  const qc = useQueryClient();
  const refresh = useRefreshDetail();
  return useMutation({
    mutationFn: ({
      subscriptionId,
      newPlanId,
      reason,
    }: {
      subscriptionId: string;
      newPlanId: string;
      reason: string;
    }) => replacePlan(subscriptionId, newPlanId, reason),
    onSuccess: (data: StudentSubscriptionLite) => {
      qc.invalidateQueries({ queryKey: adminKey });
      toast.success("Plan replaced");
      refresh(studentId, data.id);
    },
    onError: (error: any) =>
      toast.error(error.message || "Unable to replace plan. Please try again."),
  });
}

export function usePlans() {
  return useQuery<PlanLite[]>({
    queryKey: [...adminKey, "plans"],
    queryFn: fetchPlans,
    staleTime: 1000 * 60,
  });
}

// ------------------------------------------------------------------
// Admin Students list + statistics (server-side, role-filtered)
// ------------------------------------------------------------------

export function useAdminStudentList(params: {
  search: string;
  filter: StudentFilter;
}) {
  return useQuery<AdminStudentsList>({
    queryKey: [...adminKey, "list", params.search, params.filter],
    queryFn: () => listStudents({ search: params.search, filter: params.filter }),
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  });
}

export function useAdminStudentStats() {
  return useQuery<AdminStudentsStats>({
    queryKey: [...adminKey, "stats"],
    queryFn: getStudentStats,
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  });
}
