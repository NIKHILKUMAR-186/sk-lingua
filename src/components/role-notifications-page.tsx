import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { NotificationList } from "@/components/notification-list";
import { type TabConfig } from "@/components/notification-filters";
import { STUDENT_TABS, MENTOR_TABS, ADMIN_TABS } from "@/components/notification-types";

export type Role = "student" | "mentor" | "admin";

interface NotificationsPageProps {
  role: Role;
  children?: React.ReactNode;
}

export function NotificationsPage({ role, children }: NotificationsPageProps) {
  const { data: auth } = useAuth();
  const qc = useQueryClient();

  const tabs: readonly TabConfig[] =
    role === "admin" ? ADMIN_TABS : role === "mentor" ? MENTOR_TABS : STUDENT_TABS;

  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ["notifications", auth?.user?.id, role],
    enabled: !!auth?.user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", auth!.user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", auth!.user!.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["notifications", auth?.user?.id] });
  }

  async function markAllAsRead() {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", auth!.user!.id)
      .eq("read", false);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["notifications", auth?.user?.id] });
      toast.success("All notifications marked as read");
    }
  }

  async function deleteNotification(id: string) {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", auth!.user!.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["notifications", auth?.user?.id] });
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getCountForTab = (tab: string): number => {
    switch (tab) {
      case "all":
        return notifications.length;
      case "unread":
        return unreadCount;
      case "booking":
        return notifications.filter((n) => n.category === "booking").length;
      case "session":
        return notifications.filter((n) => n.category === "session").length;
      case "payment":
        return notifications.filter((n) => n.category === "payment").length;
      case "resource":
        return notifications.filter((n) => n.category === "resource").length;
      case "general":
        return notifications.filter((n) => !n.category || n.category === "general").length;
      case "cancellation":
        return notifications.filter((n) => n.category === "cancellation").length;
      case "mentor_application":
        return notifications.filter((n) => n.category === "mentor_application").length;
      case "student":
        return notifications.filter((n) => n.category === "student").length;
      case "subscription":
        return notifications.filter((n) => n.category === "subscription").length;
      default:
        return 0;
    }
  };

  const getUnreadForTab = (tab: string): number => {
    switch (tab) {
      case "all":
        return unreadCount;
      case "unread":
        return unreadCount;
      case "booking":
        return notifications.filter((n) => n.category === "booking" && !n.read).length;
      case "session":
        return notifications.filter((n) => n.category === "session" && !n.read).length;
      case "payment":
        return notifications.filter((n) => n.category === "payment" && !n.read).length;
      case "resource":
        return notifications.filter((n) => n.category === "resource" && !n.read).length;
      case "general":
        return notifications.filter((n) => (!n.category || n.category === "general") && !n.read).length;
      case "cancellation":
        return notifications.filter((n) => n.category === "cancellation" && !n.read).length;
      case "mentor_application":
        return notifications.filter((n) => n.category === "mentor_application" && !n.read).length;
      case "student":
        return notifications.filter((n) => n.category === "student" && !n.read).length;
      case "subscription":
        return notifications.filter((n) => n.category === "subscription" && !n.read).length;
      default:
        return 0;
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 py-6">
        <div>
          <h1 className="text-3xl font-display">Notifications</h1>
          <p className="mt-1 text-muted-foreground">
            {role === "admin"
              ? "Platform management notifications and alerts."
              : role === "mentor"
                ? "Your teaching and session notifications."
                : "Your learning and booking notifications."}
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-destructive">
            <p>Unable to load notifications.</p>
            <p className="text-sm opacity-80">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display">Notifications</h1>
          <p className="text-muted-foreground">
            {role === "admin"
              ? "Platform management notifications and alerts."
              : role === "mentor"
                ? "Your teaching and session notifications."
                : "Your learning and booking notifications."}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Bell className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <NotificationList
          items={notifications}
          unreadCount={unreadCount}
          onMarkAll={markAllAsRead}
          onMarkOne={markAsRead}
          onDelete={deleteNotification}
          tabs={tabs}
          getCountForTab={getCountForTab}
          getUnreadForTab={getUnreadForTab}
          role={role}
        />
      )}
      {children}
    </div>
  );
}
