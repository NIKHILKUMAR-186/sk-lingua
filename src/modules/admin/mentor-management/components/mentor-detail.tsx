import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, AlertCircle, RefreshCw } from "lucide-react";
import { useMentorDetail } from "../hooks/use-mentor-detail";
import { MentorDetailOverview } from "./mentor-detail-overview";
import { MentorPerformance } from "./mentor-performance";
import { MentorAvailabilityView } from "./mentor-availability-view";
import { MentorStudents } from "./mentor-students-list";
import { MentorReviews } from "./mentor-reviews-list";
import { MentorActivityTimeline } from "./mentor-activity-timeline";
import { MentorProfileProgress } from "./mentor-profile-progress";
import { MentorWorkloadRadar } from "./mentor-workload-radar";

export function MentorDetailPage({ mentorId }: { mentorId: string }) {
  const navigate = useNavigate();
  const { data: mentor, isLoading, isError, error, refetch } = useMentorDetail(mentorId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/mentors">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to mentors
          </Link>
        </Button>
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !mentor) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/mentors">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to mentors
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : "Unable to load this mentor."}
          </AlertDescription>
        </Alert>
        <p className="text-xs text-muted-foreground">
          Ensure the dev server is running and your session is still active. Admin data reads
          require the admin role; if the error mentions a missing helper, contact an operator.
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin/mentors">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to mentors
        </Link>
      </Button>

      <MentorDetailOverview mentor={mentor} />

      {mentor.degradedSections && mentor.degradedSections.length > 0 && (
        <Alert variant="default" className="border-amber-200 bg-amber-50/50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <div className="font-medium text-amber-900">Some sections could not be loaded</div>
            <div className="mt-1 text-xs text-amber-800/80">
              Missing data for: {mentor.degradedSections.join(", ")}. This usually means the admin
              read policies are not fully available. The core profile, availability and reviews are
              still shown.
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          {mentor.missingProfileFields && mentor.missingProfileFields.length > 0 && (
            <Alert variant="default" className="border-amber-200 bg-amber-50/50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <div className="font-medium text-amber-900">
                  Profile completion: {mentor.profileCompleteness}%
                </div>
                <div className="mt-1 text-xs text-amber-800/80">
                  Missing: {mentor.missingProfileFields.join(", ")}
                </div>
              </AlertDescription>
            </Alert>
          )}
          <MentorProfileProgress
            percent={mentor.profileCompleteness}
            fields={mentor.profileFields}
          />
          <MentorWorkloadRadar mentorId={mentor.userId} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <MentorAvailabilityView mentor={mentor} />
          <MentorPerformance mentor={mentor} />
        </div>
      </div>

      <MentorStudents mentor={mentor} />
      <MentorReviews mentor={mentor} />
      <MentorActivityTimeline mentor={mentor} />
    </div>
  );
}
