import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";
import type { MentorDetail } from "@/lib/mentor-domain";
import {
  getMentorDetail,
  setMentorStatus,
  setMentorVerification,
  updateMentorProfile,
  type SetMentorStatusInput,
} from "../services/mentor-service";

export function useMentorDetail(mentorId: string | null) {
  return useQuery<MentorDetail | null>({
    queryKey: ["admin", "mentors", "detail", mentorId],
    queryFn: () => (mentorId ? getMentorDetail(mentorId) : Promise.resolve(null)),
    enabled: !!mentorId,
    staleTime: 1000 * 15,
  }) as UseQueryResult<MentorDetail | null>;
}

export function useSetMentorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetMentorStatusInput) => setMentorStatus(input),
    onSuccess: (_data, { mentorId }) => {
      qc.invalidateQueries({ queryKey: ["admin", "mentors"] });
      toast.success("Mentor status updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Unable to update mentor status. Please try again.");
    },
  });
}

export function useSetMentorVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mentorId, status }: { mentorId: string; status: string }) =>
      setMentorVerification(mentorId, status as any),
    onSuccess: (_data, { mentorId }) => {
      qc.invalidateQueries({ queryKey: ["admin", "mentors"] });
      toast.success("Verification status updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Unable to update verification status.");
    },
  });
}

export function useUpdateMentorProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mentorId, updates }: { mentorId: string; updates: Record<string, unknown> }) =>
      updateMentorProfile(mentorId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "mentors"] });
      toast.success("Mentor profile updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Unable to update mentor profile.");
    },
  });
}
