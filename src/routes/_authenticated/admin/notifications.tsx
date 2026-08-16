import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { NotificationsPage } from "@/components/role-notifications-page";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: AdminNotifications,
});

function AdminNotifications() {
  return (
    <AdminLayout>
      <NotificationsPage role="admin" />
    </AdminLayout>
  );
}
