import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Attention / Operational Alerts
// ---------------------------------------------------------------------------

export interface AttentionAlert {
  id: string;
  label: string;
  count: number;
  severity: "high" | "medium" | "low";
  href: string;
}

export function useAdminAttention() {
  return useQuery<{ alerts: AttentionAlert[] }>({
    queryKey: ["admin", "attention"],
    queryFn: async () => {
      const res = await fetch("/api/admin/attention");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Unable to load attention alerts");
      }
      return res.json();
    },
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mentor Workload
// ---------------------------------------------------------------------------

export interface MentorWorkload {
  user_id: string;
  full_name: string;
  status: "light" | "balanced" | "busy" | "overloaded";
  todayCount: number;
  weekCount: number;
  pendingRequests: number;
  details: string[];
}

export function useMentorWorkload(mentorId?: string) {
  return useQuery<{ workloads: MentorWorkload[] }>({
    queryKey: ["admin", "mentor-workload", mentorId],
    queryFn: async () => {
      const url = mentorId
        ? `/api/admin/mentor-workload?mentorId=${encodeURIComponent(mentorId)}`
        : "/api/admin/mentor-workload";
      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Unable to load mentor workload");
      }
      return res.json();
    },
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Student Risk Signals
// ---------------------------------------------------------------------------

export interface StudentRisk {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  signals: string[];
  risk_level: "low" | "medium" | "high";
  subscription_status: string | null;
  sessions_remaining: number;
  last_session_at: string | null;
  days_since_last_session: number | null;
}

export function useStudentRisks() {
  return useQuery<{ risks: StudentRisk[] }>({
    queryKey: ["admin", "student-risks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/student-risks");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Unable to load student risks");
      }
      return res.json();
    },
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Booking Mutations
// ---------------------------------------------------------------------------

export function useRescheduleBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      bookingId: string;
      scheduledTime: string;
      durationMins: number;
      reason?: string;
    }) => {
      const res = await fetch("/api/admin/booking/reschedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Reschedule failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-session-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      toast.success("Booking rescheduled");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Unable to reschedule booking");
    },
  });
}

export function useMarkNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { bookingId: string; actor: "student" | "mentor"; notes?: string }) => {
      const res = await fetch("/api/admin/booking/no-show", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No-show failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-session-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      toast.success("No-show recorded");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Unable to record no-show");
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { bookingId: string; reason?: string }) => {
      const res = await fetch("/api/admin/booking/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Cancel failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-session-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      toast.success("Booking cancelled");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Unable to cancel booking");
    },
  });
}

export function useAssignMentor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { bookingId: string; mentorId: string }) => {
      const res = await fetch("/api/admin/booking/assign-mentor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Assign failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-session-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-available-mentors"] });
      toast.success("Mentor assigned");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Unable to assign mentor");
    },
  });
}

export function useAutoMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { bookingId: string }) => {
      const res = await fetch("/api/admin/booking/auto-match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Auto-match failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-session-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      toast.success("Mentor auto-matched");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Unable to auto-match mentor");
    },
  });
}
