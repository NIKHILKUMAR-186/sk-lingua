import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeSubscriptionOptions {
  channel: string;
  table: string;
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  filter?: string;
}

/**
 * Generic hook for Supabase Realtime subscriptions
 * Automatically handles channel cleanup on unmount
 */
export function useRealtimeSubscription({
  channel,
  table,
  event,
  onInsert,
  onUpdate,
  onDelete,
  filter,
}: RealtimeSubscriptionOptions) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!channel) return;

    // Create channel
    const supabaseChannel = supabase.channel(channel);

    // Build subscription options
    const subscriptionOptions: any = {
      event: event,
      schema: "public",
      table: table,
    };

    if (filter) {
      subscriptionOptions.filter = filter;
    }

    // Add event handlers
    if (event === "*" || event === "INSERT") {
      supabaseChannel.on("postgres_changes", { ...subscriptionOptions, event: "INSERT" }, (payload) => {
        console.log(`[Realtime] INSERT on ${table}:`, payload);
        onInsert?.(payload);
      });
    }

    if (event === "*" || event === "UPDATE") {
      supabaseChannel.on("postgres_changes", { ...subscriptionOptions, event: "UPDATE" }, (payload) => {
        console.log(`[Realtime] UPDATE on ${table}:`, payload);
        onUpdate?.(payload);
      });
    }

    if (event === "*" || event === "DELETE") {
      supabaseChannel.on("postgres_changes", { ...subscriptionOptions, event: "DELETE" }, (payload) => {
        console.log(`[Realtime] DELETE on ${table}:`, payload);
        onDelete?.(payload);
      });
    }

    // Subscribe
    supabaseChannel.subscribe((status) => {
      console.log(`[Realtime] Channel ${channel} status:`, status);
    });

    channelRef.current = supabaseChannel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channel, table, event, filter, onInsert, onUpdate, onDelete]);

  return {
    channel: channelRef.current,
  };
}

/**
 * Hook for admin booking queue realtime updates
 * Automatically refetches when session_requests change
 */
export function useAdminBookingQueueRealtime(refetch: () => void) {
  return useRealtimeSubscription({
    channel: "admin-booking-queue",
    table: "session_requests",
    event: "*",
    onInsert: () => {
      console.log("New session request received (realtime)");
      refetch();
    },
    onUpdate: () => {
      console.log("Session request updated (realtime)");
      refetch();
    },
    onDelete: () => {
      console.log("Session request deleted (realtime)");
      refetch();
    },
    filter: undefined, // Admin can see all requests
  });
}

/**
 * Hook for student session requests realtime updates
 */
export function useStudentSessionRequestsRealtime(studentId: string | undefined, refetch: () => void) {
  return useRealtimeSubscription({
    channel: `student-session-requests-${studentId}`,
    table: "session_requests",
    event: "*",
    onInsert: () => {
      console.log("New session request created (realtime)");
      refetch();
    },
    onUpdate: () => {
      console.log("Session request updated (realtime)");
      refetch();
    },
    onDelete: () => {
      console.log("Session request deleted (realtime)");
      refetch();
    },
    filter: studentId ? `student_id=eq.${studentId}` : undefined,
  });
}

/**
 * Hook for session status changes (for slot consumption)
 */
export function useSessionStatusRealtime(onSessionCompleted: (sessionId: string, studentId: string) => void) {
  return useRealtimeSubscription({
    channel: "session-status-changes",
    table: "sessions",
    event: "UPDATE",
    onUpdate: (payload) => {
      const newStatus = payload.new?.status;
      const oldStatus = payload.old?.status;
      
      // Only trigger when status changes to "completed"
      if (newStatus === "completed" && oldStatus !== "completed") {
        console.log("Session completed (realtime):", payload.new);
        onSessionCompleted(payload.new.id, payload.new.student_id);
      }
    },
    filter: undefined,
  });
}