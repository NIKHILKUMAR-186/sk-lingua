import { createFileRoute } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useSessionWorkspace } from "@/hooks/use-session-workspace";
import { SessionWorkspace } from "@/components/session-workspace";
import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/mentor/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, BookOpen, MessageSquareMore, ArrowRight, User, ExternalLink } from "lucide-react";
import { format, parseISO, isBefore } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  const { data: previousNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["mentor-previous-notes", id, auth?.user?.id],
    enabled: !!id && !!auth?.user?.id && !isLoading && !!data?.session?.student_id,
    queryFn: async () => {
      const { data: notes } = await supabase
        .from("session_notes")
        .select("*")
        .eq("session_id", id)
        .order("created_at", { ascending: false })
        .limit(5);
      return notes ?? [];
    },
  });

  const { data: studentResources = [] } = useQuery({
    queryKey: ["mentor-student-resources", id, auth?.user?.id],
    enabled: !!id && !!auth?.user?.id && !isLoading && !!data?.session?.student_id,
    queryFn: async () => {
      const { data: resources } = await supabase
        .from("resources")
        .select("*")
        .eq("mentor_id", auth!.user!.id)
        .eq("student_id", data!.session!.student_id)
        .order("created_at", { ascending: false })
        .limit(5);
      return resources ?? [];
    },
  });

  if (isLoading) {
    return (
      <MentorLayout>
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
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
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Try again
            </Button>
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

  const recentNotes = previousNotes.slice(0, 3);
  const recentResources = studentResources.slice(0, 3);
  const hasPreparationData = recentNotes.length > 0 || recentResources.length > 0 || (data.notes?.length > 0);

  return (
    <MentorLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title={studentName}
          description={`${topic} · ${scheduledTime}`}
          action={
            session?.video_call_link && session.status === "accepted" ? (
              <Button asChild size="sm" variant="outline">
                <a href={session.video_call_link} target="_blank" rel="noreferrer">
                  <Video className="mr-1.5 h-4 w-4" />
                  Join session
                </a>
              </Button>
            ) : null
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Prepare for Session */}
            {hasPreparationData && (
              <section>
                <h2 className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground mb-3">
                  Prepare for session
                </h2>
                <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
                  {recentNotes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquareMore className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">Recent notes</span>
                      </div>
                      <div className="space-y-2">
                        {recentNotes.map((note: any) => (
                          <div key={note.id} className="rounded-lg border border-border/40 p-3">
                            <p className="text-xs font-medium text-foreground">{note.title}</p>
                            {note.body && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.body}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(parseISO(note.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recentResources.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">Suggested materials</span>
                      </div>
                      <div className="space-y-2">
                        {recentResources.map((resource: any) => (
                          <div key={resource.id} className="flex items-center gap-2 rounded-lg border border-border/40 p-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{resource.title}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{resource.resource_type}</p>
                            </div>
                            <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                              <a href={resource.storage_url || resource.url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasPreparationData && (
                    <p className="text-xs text-muted-foreground">No previous notes yet.</p>
                  )}
                </div>
              </section>
            )}

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

          <div className="space-y-6">
            {/* Student Context Card */}
            <section>
              <h2 className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground mb-3">
                Student
              </h2>
              <div className="rounded-xl border border-border/60 bg-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {session?.student?.avatar_url ? (
                      <img
                        src={session.student.avatar_url}
                        alt={studentName}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      studentName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {session?.student?.native_language || "Language learner"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {session?.student?.bio && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">About</p>
                      <p className="text-xs text-muted-foreground line-clamp-3">{session.student.bio}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sessions</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">
                        {data.timeline?.filter((t: any) => t.event_type === "session_completed").length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Resources</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{studentResources.length}</p>
                    </div>
                  </div>

                  {recentNotes.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1.5">Recent notes</p>
                      <div className="space-y-2">
                        {recentNotes.slice(0, 2).map((note: any) => (
                          <div key={note.id} className="rounded-lg border border-border/40 p-2.5">
                            <p className="text-xs font-medium text-foreground line-clamp-1">{note.title}</p>
                            {note.body && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{note.body}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </MentorLayout>
  );
}
