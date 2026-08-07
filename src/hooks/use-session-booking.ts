import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  bookSession,
  cancelSession,
  getSession,
  getStudentSessions,
  getMentorSessions,
  getUpcomingSessions,
  completeSession,
  type SessionBooking,
} from "@/lib/session-booking";

// Session Queries
export function useSession(sessionId: string | null) {
  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      return await getSession(sessionId);
    },
    enabled: !!sessionId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useStudentSessions(studentId: string | null) {
  return useQuery({
    queryKey: ["student-sessions", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      return await getStudentSessions(studentId);
    },
    enabled: !!studentId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useMentorSessions(mentorId: string | null) {
  return useQuery({
    queryKey: ["mentor-sessions", mentorId],
    queryFn: async () => {
      if (!mentorId) return [];
      return await getMentorSessions(mentorId);
    },
    enabled: !!mentorId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUpcomingSessions(userId: string | null, role: "student" | "mentor") {
  return useQuery({
    queryKey: ["upcoming-sessions", userId, role],
    queryFn: async () => {
      if (!userId) return [];
      return await getUpcomingSessions(userId, role);
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Refetch every 30 seconds for real-time updates
  });
}

// Session Mutations
export function useBookSession() {
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
      return await bookSession(data.userId, data);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        qc.invalidateQueries({ queryKey: ["student-sessions", variables.userId] });
        qc.invalidateQueries({ queryKey: ["upcoming-sessions"] });
        toast.success("Session booked successfully! Waiting for mentor assignment.");
      } else {
        toast.error(data.error || "Failed to book session");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to book session");
    },
  });
}

export function useCancelSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { bookingId: string; userId: string; reason?: string }) => {
      return await cancelSession(data.bookingId, data.userId, data.reason);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        qc.invalidateQueries({ queryKey: ["student-sessions", variables.userId] });
        qc.invalidateQueries({ queryKey: ["mentor-sessions"] });
        qc.invalidateQueries({ queryKey: ["upcoming-sessions"] });
        toast.success("Session cancelled successfully");
      } else {
        toast.error(data.error || "Failed to cancel session");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel session");
    },
  });
}

export function useCompleteSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { sessionId: string; mentorId: string; sessionNotes?: string }) => {
      return await completeSession(data.sessionId, data.mentorId, data.sessionNotes);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        qc.invalidateQueries({ queryKey: ["mentor-sessions"] });
        qc.invalidateQueries({ queryKey: ["upcoming-sessions"] });
        qc.invalidateQueries({ queryKey: ["session", variables.sessionId] });
        toast.success("Session completed successfully!");
      } else {
        toast.error(data.error || "Failed to complete session");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete session");
    },
  });
}
