import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { MentorDetailPage } from "@/modules/admin/mentor-management/components/mentor-detail";

export const Route = createFileRoute("/_authenticated/admin/mentors/$mentorId")({
  component: AdminMentorDetailPage,
});

function AdminMentorDetailPage() {
  const { mentorId } = Route.useParams();
  return (
    <AdminLayout>
      <MentorDetailPage mentorId={mentorId} />
    </AdminLayout>
  );
}
