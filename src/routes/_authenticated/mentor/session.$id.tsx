import { createFileRoute } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useSessionWorkspace } from "@/hooks/use-session-workspace";
import { SessionWorkspace } from "@/components/session-workspace";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/mentor/session/$id")({
  component: MentorSessionDetail,
});

function MentorSessionDetail() {
  const { id } = Route.useParams();
  const { data: auth } = useAuth();
  const { data, isLoading, error, submitHomework, submitReview, fetchExistingReview, createNote } =
    useSessionWorkspace(id, auth?.user?.id);
  const [existingReview, setExistingReview] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (data?.session?.status === "completed") {
      fetchExistingReview().then(setExistingReview);
    }
  }, [data?.session?.status, fetchExistingReview]);

  if (isLoading) {
    return (
      <MentorLayout>
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </MentorLayout>
    );
  }

  if (error || !data) {
    return (
      <MentorLayout>
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-display">Session workspace</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Unable to load this session workspace.
            </p>
          </div>
        </div>
      </MentorLayout>
    );
  }

  const session = data.session as any;
  const studentName = session?.student?.full_name || "Student";
  const topic = session?.gig?.title || session?.student_message || "Learning session";
  const scheduledTime = session?.scheduled_time
    ? new Date(session.scheduled_time).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : "TBD";

  return (
    <MentorLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-display tracking-tight">{studentName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {topic} · {scheduledTime}
          </p>
        </div>
        <SessionWorkspace
          sessionId={id}
          session={session}
          role="mentor"
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
      </div>
    </MentorLayout>
  );
}
