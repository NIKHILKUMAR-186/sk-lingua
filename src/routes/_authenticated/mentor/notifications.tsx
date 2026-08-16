import { createFileRoute } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { NotificationsPage } from "@/components/role-notifications-page";

export const Route = createFileRoute("/_authenticated/mentor/notifications")({
  component: MentorNotifications,
});

function MentorNotifications() {
  return (
    <MentorLayout>
      <NotificationsPage role="mentor" />
    </MentorLayout>
  );
}
