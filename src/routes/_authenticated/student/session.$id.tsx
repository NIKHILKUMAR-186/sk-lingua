import { createFileRoute } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useSessionWorkspace } from "@/hooks/use-session-workspace";
import { SessionWorkspace } from "@/components/session-workspace";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/session/$id")({
  component: StudentSessionDetail,
});

function StudentSessionDetail() {
  const { id } = Route.useParams();
  const { data: auth } = useAuth();
  const { data, isLoading, error, refetch, submitHomework, submitReview, fetchExistingReview, createNote } =
    useSessionWorkspace(id, auth?.user?.id);
  const [existingReview, setExistingReview] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (data?.session?.status === "completed") {
      fetchExistingReview().then(setExistingReview);
    }
  }, [data?.session?.status, fetchExistingReview]);

  return (
    <StudentLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Session workspace</h1>
          <p className="text-sm text-muted-foreground">
            Homework, notes, resources, and timeline in one place.
          </p>
        </div>

        {isLoading && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-32 rounded" />
                <Skeleton className="h-32 rounded" />
              </div>
            </CardContent>
          </Card>
        )}

        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertTitle>Unable to load workspace</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>Something went wrong while loading this session. Please try again.</span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && data && (
          <SessionWorkspace
            sessionId={id}
            session={data.session}
            role="student"
            homework={data.homework}
            submissions={data.submissions}
            notes={data.notes}
            timeline={data.timeline}
            resources={data.resources}
            workspace={data.workspace}
            onSubmitHomework={submitHomework}
            onCreateNote={createNote}
            onSubmitReview={submitReview}
            existingReview={existingReview}
            currentUserId={auth?.user?.id}
          />
        )}
      </div>
    </StudentLayout>
  );
}
