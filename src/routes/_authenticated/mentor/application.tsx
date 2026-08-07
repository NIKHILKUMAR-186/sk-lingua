import { createFileRoute, Link } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { MentorApplicationForm } from "@/components/mentor-application-form";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/mentor/application")({
  component: MentorApplicationPage,
});

function MentorApplicationPage() {
  return (
    <MentorLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-display">Mentor application</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
        <MentorApplicationForm />
      </div>
    </MentorLayout>
  );
}