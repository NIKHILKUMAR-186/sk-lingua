import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { AdminBookingsPage } from "@/modules/admin/booking-operations/components/admin-bookings-page";

export const Route = createFileRoute("/_authenticated/admin/bookings/")({
  component: AdminBookingsLayout,
});

function AdminBookingsLayout() {
  return (
    <AdminLayout>
      <AdminBookingsPage />
    </AdminLayout>
  );
}
