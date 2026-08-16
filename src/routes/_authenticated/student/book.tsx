import { createFileRoute } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { SessionBookingFlow } from "@/components/booking/session-booking-flow";

export const Route = createFileRoute("/_authenticated/student/book")({
  component: BookSession,
});

function BookSession() {
  return (
    <StudentLayout>
      <div className="mx-auto max-w-6xl pb-24">
        <SessionBookingFlow />
      </div>
    </StudentLayout>
  );
}
