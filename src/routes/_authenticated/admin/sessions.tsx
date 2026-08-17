import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { SessionOperations } from "@/modules/admin/session-management/components/session-operations";

export const Route = createFileRoute("/_authenticated/admin/sessions")({
  component: AdminSessionsPage,
});

function AdminSessionsPage() {
  return (
    <AdminLayout>
      <SessionOperations />
    </AdminLayout>
  );
}
