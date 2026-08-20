import { createFileRoute } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { PageHeader } from "@/components/mentor/page-header";
import { MentorSectionHeader } from "@/components/mentor-design/MentorSectionHeader";
import { MentorPageContainer } from "@/components/mentor-design/MentorPageContainer";
import { NotificationsPage } from "@/components/role-notifications-page";

export const Route = createFileRoute("/_authenticated/mentor/notifications")({
  component: MentorNotifications,
});

function MentorNotifications() {
  return (
    <MentorLayout>
      <MentorPageContainer>
        <PageHeader
          title="Notifications"
          description="Your teaching and session notifications."
        />
        <NotificationsPage role="mentor" />
      </MentorPageContainer>
    </MentorLayout>
  );
}
