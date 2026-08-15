import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  bookDemoSession,
  getDemoBooking,
  getUserDemoBookings,
  getAdminDemoBookings,
  getAdminPendingDemoBookings,
  getUpcomingDemoBooking,
  cancelDemoBooking,
  confirmDemoBooking,
  rescheduleDemoBooking,
  completeDemoSession,
  markDemoNoShow,
  createDemoWorkspace,
  getDemoWorkspaceByBooking,
  submitDemoFeedback,
  hasUsedDemoSession,
  type DemoBooking,
  type DemoWorkspace,
  type DemoFeedback,
} from "@/lib/demo-bookings";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Demo Booking Queries
export function useDemoBooking(bookingId: string | null) {
  return useQuery({
    queryKey: ["demo-booking", bookingId],
    queryFn: () => (bookingId ? getDemoBooking(bookingId) : null),
    enabled: !!bookingId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useUserDemoBookings(userId: string | null) {
  return useQuery({
    queryKey: ["user-demo-bookings", userId],
    queryFn: () => (userId ? getUserDemoBookings(userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// One-lifetime-demo eligibility hook (student dashboard / booking gate)
export function useHasUsedDemoSession(userId: string | null) {
  return useQuery({
    queryKey: ["has-used-demo", userId],
    queryFn: () => (userId ? hasUsedDemoSession(userId) : { used: false }),
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
}

// Admin query: all demo bookings with live refresh (realtime + interval fallback)
export function useAdminDemoBookings() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("admin-demo-bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demo_session_bookings" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
          qc.invalidateQueries({ queryKey: ["admin-pending-demo-bookings"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["admin-demo-bookings"],
    queryFn: () => getAdminDemoBookings(),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 15, // fallback live refresh
  });
}

// Admin query: pending demo bookings (confirmation queue)
export function useAdminPendingDemoBookings() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("admin-pending-demo-bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demo_session_bookings" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-pending-demo-bookings"] });
          qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["admin-pending-demo-bookings"],
    queryFn: () => getAdminPendingDemoBookings(),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 15,
  });
}

export function useUpcomingDemoBooking(userId: string | null) {
  return useQuery({
    queryKey: ["upcoming-demo-booking", userId],
    queryFn: () => (userId ? getUpcomingDemoBooking(userId) : null),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Demo Booking Mutations
export function useBookDemoSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      booking_date: string;
      booking_time_start: string;
      booking_time_end: string;
      language: string;
      duration_mins?: number;
      notes?: string;
      learning_goal?: string;
      price?: number;
    }) => {
      const { userId, ...bookingData } = data;
      return await bookDemoSession(userId, bookingData);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["user-demo-bookings", variables.userId] });
      qc.invalidateQueries({ queryKey: ["upcoming-demo-booking", variables.userId] });
      qc.invalidateQueries({ queryKey: ["has-used-demo", variables.userId] });
      toast.success("Demo session booked! Awaiting admin confirmation.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to book demo session");
    },
  });
}

export function useCancelDemoBooking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { bookingId: string; userId: string; adminId?: string }) => {
      return await cancelDemoBooking(data.bookingId, data.adminId);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["user-demo-bookings", variables.userId] });
      qc.invalidateQueries({ queryKey: ["upcoming-demo-booking", variables.userId] });
      qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-demo-bookings"] });
      toast.success("Demo booking cancelled");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel booking");
    },
  });
}

// Admin Mutations
export function useConfirmDemoBooking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      bookingId: string;
      adminId: string;
      booking_date: string;
      booking_time_start: string;
      booking_time_end: string;
      meeting_link: string;
      admin_notes?: string;
    }) => {
      return await confirmDemoBooking(data.bookingId, data.adminId, data);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-demo-bookings"] });
      qc.invalidateQueries({ queryKey: ["user-demo-bookings", data.user_id] });
      qc.invalidateQueries({ queryKey: ["upcoming-demo-booking", data.user_id] });
      toast.success("Demo session confirmed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to confirm demo session");
    },
  });
}

export function useRescheduleDemoBooking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      bookingId: string;
      adminId: string;
      booking_date: string;
      booking_time_start: string;
      booking_time_end: string;
    }) => {
      return await rescheduleDemoBooking(data.bookingId, data.adminId, data);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-demo-bookings"] });
      qc.invalidateQueries({ queryKey: ["user-demo-bookings", data.user_id] });
      qc.invalidateQueries({ queryKey: ["upcoming-demo-booking", data.user_id] });
      toast.success("Demo session rescheduled");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reschedule demo session");
    },
  });
}

export function useCompleteDemoBooking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { bookingId: string; adminId: string; adminNotes?: string }) => {
      return await completeDemoSession(data.bookingId, data.adminId, data.adminNotes);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-demo-bookings"] });
      qc.invalidateQueries({ queryKey: ["user-demo-bookings", data.user_id] });
      qc.invalidateQueries({ queryKey: ["upcoming-demo-booking", data.user_id] });
      qc.invalidateQueries({ queryKey: ["has-used-demo", data.user_id] });
      toast.success("Demo session completed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete demo session");
    },
  });
}

export function useMarkDemoNoShow() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { bookingId: string; adminId: string; adminNotes?: string }) => {
      return await markDemoNoShow(data.bookingId, data.adminId, data.adminNotes);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-demo-bookings"] });
      qc.invalidateQueries({ queryKey: ["user-demo-bookings", data.user_id] });
      qc.invalidateQueries({ queryKey: ["upcoming-demo-booking", data.user_id] });
      qc.invalidateQueries({ queryKey: ["has-used-demo", data.user_id] });
      toast.success("Demo marked as no-show");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to mark demo as no-show");
    },
  });
}

// Demo Workspace Mutations
export function useCreateDemoWorkspace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { bookingId: string; adminId: string; studentId: string }) => {
      return await createDemoWorkspace(data.bookingId, data.adminId, data.studentId);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["demo-workspace", variables.bookingId] });
      toast.success("Demo workspace created");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create workspace");
    },
  });
}

export function useDemoWorkspace(bookingId: string | null) {
  return useQuery({
    queryKey: ["demo-workspace", bookingId],
    queryFn: () => (bookingId ? getDemoWorkspaceByBooking(bookingId) : null),
    enabled: !!bookingId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Demo Feedback Mutations
export function useSubmitDemoFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      bookingId: string;
      studentId: string;
      rating: number;
      feedback_text?: string;
      would_recommend?: boolean;
    }) => {
      return await submitDemoFeedback(data.bookingId, data.studentId, data);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["demo-booking", variables.bookingId] });
      qc.invalidateQueries({ queryKey: ["user-demo-bookings", data.student_id] });
      toast.success("Thank you for your feedback!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit feedback");
    },
  });
}

// Demo Feedback Query
export function useDemoFeedback(bookingId: string | null) {
  return useQuery({
    queryKey: ["demo-feedback", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const { data, error } = await supabase
        .from("demo_feedback" as any)
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// ============================================================
// DEMO ASSIGNMENT HOOKS
// ============================================================

// Admin: assign mentor to demo
export function useAssignMentorToDemo() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { bookingId: string; mentorId: string }) => {
      const res = await fetch("/api/admin/demo/assign-mentor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "assign failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-demo-bookings"] });
      toast.success("Mentor assigned successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Unable to assign mentor. Please try again.");
    },
  });
}

// Admin: take demo session themselves
export function useAdminTakeDemoSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { bookingId: string }) => {
      const res = await fetch("/api/admin/demo/take-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "take session failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-demo-bookings"] });
      toast.success("Demo session taken");
    },
    onError: (error: any) => {
      toast.error(error.message || "Unable to take session. Please try again.");
    },
  });
}

// Mentor: respond to demo assignment (accept/reject)
export function useMentorRespondDemoAssignment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { bookingId: string; mentorId: string; action: "accept" | "reject" }) => {
      const res = await fetch("/api/mentor/respond-demo-assignment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "response failed");
      return json;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["mentor-demo-requests", variables.mentorId] });
      qc.invalidateQueries({ queryKey: ["admin-demo-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-demo-bookings"] });
      toast.success(variables.action === "accept" ? "Demo accepted!" : "Demo rejected");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to respond to demo assignment");
    },
  });
}

// Mentor: query demo requests assigned to mentor
export function useMentorDemoRequests(mentorId: string | null) {
  return useQuery({
    queryKey: ["mentor-demo-requests", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      if (!mentorId) return [];
      const { data, error } = await supabase
        .from("demo_session_bookings")
        .select("*")
        .eq("mentor_id", mentorId)
        .eq("assignment_status", "pending_mentor")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as DemoBooking[];
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 15,
  });
}

// Admin: fetch available mentors for a demo time slot
export function useAvailableMentorsForDemo(bookingDate: string | null, bookingTimeStart: string | null) {
  return useQuery({
    queryKey: ["available-mentors-for-demo", bookingDate, bookingTimeStart],
    enabled: !!bookingDate && !!bookingTimeStart,
    queryFn: async () => {
      if (!bookingDate || !bookingTimeStart) return [];

      const date = new Date(bookingDate);
      const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

      // Fetch mentors with availability for this day/time
      const { data: slots, error: slotsError } = await supabase
        .from("availability_slots")
        .select("mentor_id, start_time, end_time, day_of_week")
        .eq("day_of_week", dayOfWeek)
        .eq("is_available", true)
        .gte("start_time", bookingTimeStart);

      if (slotsError) throw slotsError;
      if (!slots || slots.length === 0) return [];

      const mentorIds = [...new Set(slots.map((s: any) => s.mentor_id))];

      // Fetch mentor profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, bio, avatar_url")
        .in("id", mentorIds);

      if (profilesError) throw profilesError;

      // Verify mentor role and active status
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", mentorIds)
        .eq("role", "mentor");

      const activeMentorIds = new Set((roles ?? []).map((r: any) => r.user_id));

      const { data: mentorProfiles, error: mpError } = await supabase
        .from("mentor_profiles")
        .select("user_id, is_active")
        .in("user_id", mentorIds)
        .eq("is_active", true);

      const activeProfileIds = new Set((mentorProfiles ?? []).map((m: any) => m.user_id));

      return (profiles ?? []).filter((p: any) => activeMentorIds.has(p.id) && activeProfileIds.has(p.id));
    },
    staleTime: 1000 * 60, // 1 minute
  });
}
