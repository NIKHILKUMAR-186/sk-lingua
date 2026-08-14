import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy route — kept for backward compatibility. The student management area
// now lives at /admin/students (list) and /admin/students/$studentId (detail).
export const Route = createFileRoute("/_authenticated/admin/student-subscription-control")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/students" });
  },
});
