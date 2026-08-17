import { createFileRoute } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { PageHeader } from "@/components/mentor/page-header";
import { MentorAvailability } from "@/components/mentor-availability";

export const Route = createFileRoute("/_authenticated/mentor/availability")({
  component: MentorAvailabilityPage,
});

function MentorAvailabilityPage() {
  return (
    <MentorLayout>
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Availability"
          description="Set when students can book sessions with you."
        />
        <MentorAvailability />
      </div>
    </MentorLayout>
  );
}
