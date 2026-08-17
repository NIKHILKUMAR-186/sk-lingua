import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { MentorCommandCenter } from "@/modules/admin/mentor-management/components/mentor-command-center";

export const Route = createFileRoute("/_authenticated/admin/mentors/")({
  component: AdminMentorsPage,
});

function AdminMentorsPage() {
  return (
    <AdminLayout>
      <MentorCommandCenter />
    </AdminLayout>
  );
}
