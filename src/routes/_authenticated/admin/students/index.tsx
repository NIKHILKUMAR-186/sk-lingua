import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { StudentCommandCenter } from "@/modules/admin/student-management/components/student-command-center";

export const Route = createFileRoute("/_authenticated/admin/students/")({
  component: AdminStudentsPage,
});

function AdminStudentsPage() {
  return (
    <AdminLayout>
      <StudentCommandCenter />
    </AdminLayout>
  );
}

