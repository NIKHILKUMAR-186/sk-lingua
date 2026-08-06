import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WorkspaceMessage {
  id: string;
  workspace_id: string;
  sender_id: string;
  body: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface TypingUser {
  userId: string;
  isTyping: boolean;
  at: string;
}

export function useWorkspaceRealtime(
  workspaceId: string | undefined,
  currentUserId: string | undefined,
) {
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [presence, setPresence] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<any>(null);

  const startTyping = useCallback(() => {
    if (!workspaceId || !currentUserId) return;
    fetch("/api/workspace/typing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, user_id: currentUserId, is_typing: true }),
    }).catch(() => {});
  }, [workspaceId, currentUserId]);

  const stopTyping = useCallback(() => {
    if (!workspaceId || !currentUserId) return;
    fetch("/api/workspace/typing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, user_id: currentUserId, is_typing: false }),
    }).catch(() => {});
  }, [workspaceId, currentUserId]);

  const sendMessage = useCallback(
    async (text: string, metadata?: Record<string, unknown>) => {
      if (!workspaceId || !currentUserId || !text.trim()) return;
      const res = await fetch("/api/workspace/post-message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          sender_id: currentUserId,
          body: text.trim(),
          metadata,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to send message");
        throw new Error(json?.error || "Failed to send message");
      }
      return json.message as WorkspaceMessage;
    },
    [workspaceId, currentUserId],
  );

  useEffect(() => {
    if (!workspaceId) return;

    // Initial load of messages
    (async () => {
      const res = await fetch(`/api/workspace/messages?workspace_id=${workspaceId}`);
      const json = await res.json();
      if (json.messages) {
        setMessages(json.messages);
      }
    })();

    // Subscribe to workspace_messages
    const channel = supabase
      .channel(`workspace-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workspace_messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const newMessage = payload.new as WorkspaceMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        },
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      setConnected(false);
      setTypingUsers([]);
    };
  }, [workspaceId]);

  // Track typing users from messages with typing metadata
  useEffect(() => {
    const recentTyping = messages
      .filter((m) => m.metadata && (m.metadata as any).type === "typing")
      .slice(-20)
      .map((m) => ({
        userId: m.sender_id,
        isTyping: !!(m.metadata as any).is_typing,
        at: (m.metadata as any).at || m.created_at,
      }));

    // Deduplicate by user, last one wins
    const map = new Map<string, TypingUser>();
    for (const t of recentTyping) {
      map.set(t.userId, t);
    }

    // Filter out typing events older than 5 seconds
    const now = Date.now();
    const activeTyping = Array.from(map.values()).filter(
      (t) => t.isTyping && now - new Date(t.at).getTime() < 5000,
    );

    setTypingUsers(activeTyping);
  }, [messages]);

  // Track presence using Supabase presence channel
  useEffect(() => {
    if (!workspaceId || !currentUserId) return;

    const presenceChannel = supabase.channel(`presence-${workspaceId}`, {
      config: { presence: { key: currentUserId } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const userIds = Object.keys(state ?? {});
        setPresence(userIds);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        setPresence((prev) => (prev.includes(key as string) ? prev : [...prev, key as string]));
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setPresence((prev) => prev.filter((id) => id !== key));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [workspaceId, currentUserId]);

  return {
    messages,
    typingUsers,
    presence,
    connected,
    sendMessage,
    startTyping,
    stopTyping,
  };
}
