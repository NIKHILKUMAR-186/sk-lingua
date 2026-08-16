import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeSubscriptionOptions {
  channel: string;
  table: string;
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  filter?: string;
  reconnect?: boolean;
  reconnectIntervalMs?: number;
}

type ConnectionState = "connecting" | "open" | "closing" | "closed";

export function useRealtimeSubscription({
  channel,
  table,
  event,
  onInsert,
  onUpdate,
  onDelete,
  filter,
  reconnect = true,
  reconnectIntervalMs = 3000,
}: RealtimeSubscriptionOptions) {
  const channelRef = useRef<any>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");

  useEffect(() => {
    if (!channel) return;

    let isSubscribed = true;

    async function setupSubscription() {
      if (!isSubscribed) return;

      setConnectionState("connecting");

      const supabaseChannel = supabase.channel(channel);

      const subscriptionOptions: any = {
        event: event,
        schema: "public",
        table: table,
      };

      if (filter) {
        subscriptionOptions.filter = filter;
      }

      if (event === "*" || event === "INSERT") {
        supabaseChannel.on(
          "postgres_changes",
          { ...subscriptionOptions, event: "INSERT" },
          (payload) => {
            onInsert?.(payload);
          },
        );
      }

      if (event === "*" || event === "UPDATE") {
        supabaseChannel.on(
          "postgres_changes",
          { ...subscriptionOptions, event: "UPDATE" },
          (payload) => {
            onUpdate?.(payload);
          },
        );
      }

      if (event === "*" || event === "DELETE") {
        supabaseChannel.on(
          "postgres_changes",
          { ...subscriptionOptions, event: "DELETE" },
          (payload) => {
            onDelete?.(payload);
          },
        );
      }

      supabaseChannel.subscribe((status: string) => {
        if (!isSubscribed) return;

        if (status === "SUBSCRIBED") {
          setConnectionState("open");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setConnectionState("closed");
          if (reconnect && isSubscribed) {
            reconnectTimerRef.current = setTimeout(() => {
              supabase.removeChannel(supabaseChannel);
              setupSubscription();
            }, reconnectIntervalMs);
          }
        } else if (status === "TIMED_OUT") {
          setConnectionState("closed");
          if (reconnect && isSubscribed) {
            reconnectTimerRef.current = setTimeout(() => {
              supabase.removeChannel(supabaseChannel);
              setupSubscription();
            }, reconnectIntervalMs);
          }
        }
      });

      channelRef.current = supabaseChannel;
    }

    setupSubscription();

    return () => {
      isSubscribed = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setConnectionState("closed");
    };
  }, [channel, table, event, filter, onInsert, onUpdate, onDelete, reconnect, reconnectIntervalMs]);

  return {
    channel: channelRef.current,
    connectionState,
    isConnected: connectionState === "open",
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
export function useStudentSessionRequestsRealtime(
  studentId: string | undefined,
  refetch: () => void,
) {
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
export function useSessionStatusRealtime(
  onSessionCompleted: (sessionId: string, studentId: string) => void,
) {
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
