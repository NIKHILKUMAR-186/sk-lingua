import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useSessionWorkspace } from "@/hooks/use-session-workspace";
import { SessionWorkspace } from "@/components/session-workspace";

export const Route = createFileRoute("/_authenticated/mentor/session/$id")({
  component: MentorSessionDetail,
});

function MentorSessionDetail() {
  const { id } = Route.useParams();
  const { data: auth } = useAuth();
  const { data, isLoading, error, createHomework, reviewHomework } = useSessionWorkspace(id, auth?.user?.id);

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Session workspace</h1>
          <p className="text-sm text-muted-foreground">Guide the session from booking to review.</p>
        </div>
        {isLoading ? <div className="text-sm text-muted-foreground">Loading workspace…</div> : null}
        {error ? <div className="text-sm text-red-500">Unable to load this session workspace.</div> : null}
        {!isLoading && data ? (
          <SessionWorkspace
            sessionId={id}
            session={data.session}
            role="mentor"
            homework={data.homework}
            submissions={data.submissions}
            notes={data.notes}
            timeline={data.timeline}
            resources={data.resources}
            onCreateHomework={createHomework}
            onReviewHomework={reviewHomework}
            currentUserId={auth?.user?.id}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
