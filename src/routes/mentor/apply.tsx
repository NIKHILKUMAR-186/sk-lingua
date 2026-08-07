import { createFileRoute, Link } from "@tanstack/react-router";
import { MentorApplicationForm } from "@/components/mentor-application-form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/mentor/apply")({
  component: MentorApplyPage,
});

function MentorApplyPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-display">Apply to become a mentor</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
        <MentorApplicationForm />
      </div>
    </div>
  );
}