import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { StudentDetailPage } from "@/modules/admin/student-management/components/student-detail";

export const Route = createFileRoute("/_authenticated/admin/students/$studentId")({
  component: AdminStudentDetailPage,
});

function AdminStudentDetailPage() {
  const { studentId } = Route.useParams();
  return (
    <AdminLayout>
      <StudentDetailPage studentId={studentId} />
    </AdminLayout>
  );
}

