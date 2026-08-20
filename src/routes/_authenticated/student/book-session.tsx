import { createFileRoute, useSearch } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { SessionBookingFlow } from "@/components/booking/session-booking-flow";

export const Route = createFileRoute("/_authenticated/student/book-session")({
  component: BookSessionPage,
});

function BookSessionPage() {
  const search = useSearch({ from: Route.id }) as { mentor?: string };
  const preselectedMentorId = search.mentor ?? null;

  return (
    <StudentLayout>
      <SessionBookingFlow preselectedMentorId={preselectedMentorId} />
    </StudentLayout>
  );
}
