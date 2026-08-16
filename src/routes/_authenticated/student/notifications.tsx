import { createFileRoute } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { NotificationsPage } from "@/components/role-notifications-page";

export const Route = createFileRoute("/_authenticated/student/notifications")({
  component: StudentNotifications,
});

function StudentNotifications() {
  return (
    <StudentLayout>
      <NotificationsPage role="student" />
    </StudentLayout>
  );
}
