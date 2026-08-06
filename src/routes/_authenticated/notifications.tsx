import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { StudentRouteGuard } from "@/components/student-route-guard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NotificationList } from "@/components/notification-list";
import { useDeleteNotification } from "@/hooks/use-notifications";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: Notifications,
});

function Notifications() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications", auth?.user?.id],
    enabled: !!auth?.user,
    queryFn: async () =>
      (
        await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", auth!.user!.id)
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  });

  async function markAll() {
    if (!auth?.user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", auth.user.id)
      .eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications", auth.user.id] });
    qc.invalidateQueries({ queryKey: ["notifications-unread", auth.user.id] });
  }

  const deleteNotification = useDeleteNotification();

  async function markOne(id: string) {
    if (!auth?.user) return;
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", auth.user.id] });
    qc.invalidateQueries({ queryKey: ["notifications-unread", auth.user.id] });
  }

  async function deleteOne(id: string) {
    if (!auth?.user) return;
    await deleteNotification.mutateAsync({ userId: auth.user.id, notificationId: id });
  }

  const variant = auth?.role === "mentor" ? "mentor" : "student";
  const unreadCount = items.filter((item) => !item.read).length;

  return (
    <StudentRouteGuard>
      <AppShell variant={variant}>
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <NotificationList
            items={items}
            unreadCount={unreadCount}
            onMarkAll={markAll}
            onMarkOne={markOne}
            onDelete={deleteOne}
          />
        </div>
      </AppShell>
    </StudentRouteGuard>
  );
}
