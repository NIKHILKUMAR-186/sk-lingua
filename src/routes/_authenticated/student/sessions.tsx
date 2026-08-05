import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Video, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student/sessions")({
  component: StudentSessions,
});

function StudentSessions() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [ratingModal, setRatingModal] = useState<{ sessionId: string; mentorId: string } | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const { data: sessions = [] } = useQuery({
    queryKey: ["student-sessions", auth?.user?.id],
    enabled: !!auth?.user,
    queryFn: async () =>
      (
        await supabase
          .from("sessions")
          .select("*")
          .eq("student_id", auth!.user!.id)
          .order("scheduled_time", { ascending: false })
      ).data ?? [],
  });
  const { data: resources = [] } = useQuery({
    queryKey: ["student-session-resources", auth?.user?.id],
    enabled: !!auth?.user,
    queryFn: async () =>
      (
        await supabase
          .from("resources")
          .select("*")
          .eq("student_id", auth!.user!.id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const { data: mentors = [] } = useQuery({
    queryKey: ["student-session-mentors", auth?.user?.id],
    enabled: !!auth?.user,
    queryFn: async () => {
      const ids = [...new Set(sessions.map((entry) => entry.mentor_id).filter(Boolean))];
      if (!ids.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      return data ?? [];
    },
  });
  const { data: myReviews = [] } = useQuery({
    queryKey: ["student-session-reviews", auth?.user?.id],
    enabled: !!auth?.user,
    queryFn: async () => {
      const sessionIds = sessions.map((s) => s.id);
      if (!sessionIds.length) return [];
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("student_id", auth!.user!.id)
        .in("session_id", sessionIds);
      return data ?? [];
    },
  });
  const reviewBySessionId = new Map(myReviews.map((r) => [r.session_id, r]));

  async function handleQuickReviewSubmit() {
    if (!ratingModal || ratingValue === 0) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        session_id: ratingModal.sessionId,
        student_id: auth!.user!.id,
        mentor_id: ratingModal.mentorId,
        rating: ratingValue,
        comment: reviewComment || null,
      });
      if (error) throw error;
      toast.success("Review submitted!");
      setRatingModal(null);
      setRatingValue(0);
      setReviewComment("");
      qc.invalidateQueries({ queryKey: ["student-session-reviews"] });
    } catch (error) {
      toast.error((error as Error).message ?? "Unable to submit review");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function cancel(id: string) {
    const { error } = await supabase.from("sessions").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Cancelled");
      qc.invalidateQueries();
    }
  }

  const upcoming = sessions.filter((s) => ["pending", "accepted"].includes(s.status));
  const past = sessions.filter((s) => ["completed", "rejected", "cancelled"].includes(s.status));
  const mentorById = new Map((mentors ?? []).map((mentor) => [mentor.id, mentor]));

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">My sessions</h1>
          <p className="text-sm text-muted-foreground">
            Follow up on upcoming calls, session notes, and homework in one place.
          </p>
        </div>
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <Empty />
            ) : (
              upcoming.map((s) => (
                <SessionRow
                  key={s.id}
                  s={s}
                  mentor={mentorById.get(s.mentor_id)}
                  onCancel={cancel}
                  resources={resources.filter(
                    (resource) =>
                      resource.session_id === s.id ||
                      (resource.visibility === "session" && resource.student_id === auth?.user?.id),
                  )}
                />
              ))
            )}
          </TabsContent>
          <TabsContent value="past" className="mt-4 space-y-3">
            {past.length === 0 ? (
              <Empty />
            ) : (
              past.map((s) => (
                <SessionRow
                  key={s.id}
                  s={s}
                  mentor={mentorById.get(s.mentor_id)}
                  existingReview={reviewBySessionId.get(s.id) ?? null}
                  onRateClick={s.status === "completed" && !reviewBySessionId.get(s.id) ? () => setRatingModal({ sessionId: s.id, mentorId: s.mentor_id ?? "" }) : undefined}
                  resources={resources.filter(
                    (resource) =>
                      resource.session_id === s.id ||
                      (resource.visibility === "session" && resource.student_id === auth?.user?.id),
                  )}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">Rate this session</h3>
              <p className="text-sm text-muted-foreground">How was your experience with this mentor?</p>
              <div className="flex items-center justify-center gap-2 py-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setRatingValue(star)} className="transition hover:scale-110">
                    <Star className={`h-10 w-10 ${star <= ratingValue ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your thoughts (optional)"
                rows={3}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setRatingModal(null); setRatingValue(0); setReviewComment(""); }}>
                  Cancel
                </Button>
                <Button className="flex-1" disabled={ratingValue === 0 || submittingReview} onClick={handleQuickReviewSubmit}>
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Empty() {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-muted-foreground">
        Nothing here yet.
      </CardContent>
    </Card>
  );
}

function SessionRow({
  s,
  onCancel,
  mentor,
  resources,
  existingReview,
  onRateClick,
}: {
  s: {
    id: string;
    scheduled_time: string;
    duration_mins: number;
    status: string;
    video_call_link: string | null;
    notes: string | null;
    mentor_id?: string | null;
    student_id?: string | null;
  };
  onCancel?: (id: string) => void;
  mentor?: { full_name?: string | null; avatar_url?: string | null } | null;
  resources?: Array<{
    id: string;
    title: string;
    description?: string | null;
    visibility?: string | null;
    resource_type?: string | null;
    url?: string | null;
    storage_url?: string | null;
    file_name?: string | null;
  }>;
  existingReview?: { id: string; rating: number; comment: string | null } | null;
  onRateClick?: () => void;
}) {
  const badgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    accepted: "default",
    completed: "outline",
    rejected: "destructive",
    cancelled: "outline",
  };
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-medium">{new Date(s.scheduled_time).toLocaleString()}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={badgeVariant[s.status] ?? "secondary"}>{s.status}</Badge>
              <span>{s.duration_mins} min</span>
              {mentor?.full_name ? <span>• {mentor.full_name}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/student/session/$id" params={{ id: s.id }}>
                Open workspace
              </Link>
            </Button>
            {s.status === "accepted" && (
              <Button size="sm" asChild>
                <a href={s.video_call_link ?? "#"} target="_blank" rel="noreferrer">
                  <Video className="mr-1 h-4 w-4" />
                  Join
                </a>
              </Button>
            )}
            {onCancel && s.status !== "completed" && s.status !== "cancelled" && (
              <Button size="sm" variant="outline" onClick={() => onCancel(s.id)}>
                Cancel
              </Button>
            )}
            {s.status === "completed" && existingReview && (
              <div className="flex items-center gap-1 text-sm">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < existingReview.rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                ))}
              </div>
            )}
            {s.status === "completed" && !existingReview && onRateClick && (
              <Button size="sm" variant="secondary" onClick={onRateClick}>
                <Star className="mr-1 h-4 w-4" />
                Rate & Review
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[1fr_0.9fr]">
          <div className="space-y-2">
            <div className="text-sm font-medium">Session notes</div>
            {s.notes ? (
              <p className="text-sm text-muted-foreground">{s.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No notes yet. Your mentor can add a summary after the session.
              </p>
            )}
            {s.status === "accepted" && s.video_call_link ? (
              <a
                href={s.video_call_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm text-primary underline"
              >
                Open the meeting room
              </a>
            ) : null}
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Homework & resources</div>
            {(resources ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No homework shared yet for this session.
              </p>
            ) : (
              <div className="space-y-2">
                {(resources ?? []).slice(0, 2).map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-sm"
                  >
                    <BookOpen className="h-4 w-4 text-primary" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{resource.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {resource.resource_type === "file"
                          ? (resource.file_name ?? "File")
                          : (resource.url ?? "Link")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
