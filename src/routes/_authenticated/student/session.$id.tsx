import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useSessionWorkspace } from "@/hooks/use-session-workspace";
import { SessionWorkspace } from "@/components/session-workspace";

export const Route = createFileRoute("/_authenticated/student/session/$id")({
  component: StudentSessionDetail,
});

function StudentSessionDetail() {
  const { id } = Route.useParams();
  const { data: auth } = useAuth();
  const { data, isLoading, error, submitHomework } = useSessionWorkspace(id, auth?.user?.id);

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Session workspace</h1>
          <p className="text-sm text-muted-foreground">Homework, notes, resources, and timeline in one place.</p>
        </div>
        {isLoading ? <div className="text-sm text-muted-foreground">Loading workspace…</div> : null}
        {error ? <div className="text-sm text-red-500">Unable to load this session workspace.</div> : null}
        {!isLoading && data ? (
          <SessionWorkspace
            sessionId={id}
            session={data.session}
            role="student"
            homework={data.homework}
            submissions={data.submissions}
            notes={data.notes}
            timeline={data.timeline}
            resources={data.resources}
            onSubmitHomework={submitHomework}
            currentUserId={auth?.user?.id}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
