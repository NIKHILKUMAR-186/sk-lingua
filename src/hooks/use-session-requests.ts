import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SessionRequest {
  id: string;
  student_id: string;
  assigned_mentor: string | null;
  session_id: string | null;
  scheduled_time: string;
  duration_mins: number;
  topic: string | null;
  language: string | null;
  status: string;
  confirmed_at: string | null;
  mentor_response_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch session requests for admin (all)
export function useAdminSessionRequests() {
  return useQuery({
    queryKey: ["admin-session-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("session_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SessionRequest[];
    },
    // Fallback polling so the admin queue always stays fresh even if
    // realtime is unavailable. Realtime is the primary mechanism; this
    // is a safety net.
    refetchInterval: 15_000,
  });
}

// Fetch session requests for a student
export function useStudentSessionRequests(studentId: string | undefined) {
  return useQuery({
    queryKey: ["session-requests", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("session_requests")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SessionRequest[];
    },
    // Fallback polling so the student's request list stays fresh.
    refetchInterval: 15_000,
  });
}

// Fetch incoming requests for a mentor
export function useMentorSessionRequests(mentorId: string | undefined) {
  return useQuery({
    queryKey: ["mentor-requests", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("session_requests")
        .select("*")
        .eq("assigned_mentor", mentorId)
        .eq("status", "pending_mentor_response")
        .order("created_at", { ascending: false });
      return (data ?? []) as SessionRequest[];
    },
  });
}

// Fetch assignment history for a request
export function useAssignmentHistory(requestId: string | undefined) {
  return useQuery({
    queryKey: ["assignment-history", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("assignment_history")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

// Create a session request
export function useCreateSessionRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      student_id: string;
      scheduled_time: string;
      duration_mins: number;
      topic?: string;
      language?: string;
      notes?: string;
      status?: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from("session_requests")
        .insert([payload])
        .select("*")
        .single();
      if (error) throw error;
      return data as SessionRequest;
    },
    onSuccess: () => {
      // Invalidate both student and admin queries
      qc.invalidateQueries({ queryKey: ["session-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-session-requests"] });
    },
  });
}

// Assign mentor to a request (admin)
export function useAssignMentor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { request_id: string; mentor_id: string; assigned_by: string }) => {
      const res = await fetch("/api/admin/assign-mentor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "assign failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-session-requests"] });
      qc.invalidateQueries({ queryKey: ["mentor-requests"] });
    },
  });
}

// Mentor respond to assignment
export function useRespondAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      request_id: string;
      mentor_id: string;
      action: "accept" | "reject";
    }) => {
      const res = await fetch("/api/mentor/respond-assignment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentor-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-session-requests"] });
      qc.invalidateQueries({ queryKey: ["session-requests"] });
    },
  });
}
