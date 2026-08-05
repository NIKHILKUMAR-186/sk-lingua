import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  demo_updates: boolean;
  subscription_updates: boolean;
  account_updates: boolean;
  system_announcements: boolean;
  marketing_emails: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
}

// Get notification preferences
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  // If no preferences exist, create default ones
  if (!data) {
    return createDefaultPreferences(userId);
  }

  return data;
}

// Create default preferences
async function createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .insert({
      user_id: userId,
      email_notifications: true,
      demo_updates: true,
      subscription_updates: true,
      account_updates: true,
      system_announcements: true,
      marketing_emails: false,
      sms_notifications: false,
      push_notifications: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update notification preferences
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// React Hook
export function useNotificationPreferences(userId: string | null) {
  return useQuery({
    queryKey: ["notification-preferences", userId],
    queryFn: () => (userId ? getNotificationPreferences(userId) : null),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      updates: Partial<NotificationPreferences>;
    }) => {
      return await updateNotificationPreferences(data.userId, data.updates);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["notification-preferences", variables.userId] });
      toast.success("Notification preferences updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update preferences");
    },
  });
}
