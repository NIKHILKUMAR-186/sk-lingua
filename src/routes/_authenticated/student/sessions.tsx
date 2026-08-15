import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Video, Star, Clock, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useStudentSessionRequests, useCreateSessionRequest } from "@/hooks/use-session-requests";
import { getUserDemoBookings, getUpcomingDemoBooking } from "@/lib/demo-bookings";

export const Route = createFileRoute("/_authenticated/student/sessions")({
  component: StudentSessions,
});

function StudentSessions() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [ratingModal, setRatingModal] = useState<{ sessionId: string; mentorId: string } | null>(
    null,
  );
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

  // Fetch demo bookings for this student
  const { data: demoBookings = [] } = useQuery({
    queryKey: ["student-demo-bookings", auth?.user?.id],
    enabled: !!auth?.user,
    queryFn: async () => {
      if (!auth?.user?.id) return [];
      return await getUserDemoBookings(auth.user.id);
    },
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

  const sessionIds = sessions.map((s) => s.id).sort();
  const mentorIds = [...new Set(sessions.map((entry) => entry.mentor_id).filter(Boolean))].sort();

  const { data: mentors = [] } = useQuery({
    queryKey: ["student-session-mentors", auth?.user?.id, mentorIds.join(",")],
    enabled: !!auth?.user && mentorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", mentorIds);
      return data ?? [];
    },
  });

  const { data: myReviews = [] } = useQuery({
    queryKey: ["student-session-reviews", auth?.user?.id, sessionIds.join(",")],
    enabled: !!auth?.user && sessionIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("student_id", auth!.user!.id)
        .in("session_id", sessionIds);
      return data ?? [];
    },
  });
  const reviewBySessionId = new Map(myReviews.map((r) => [r.session_id, r]));

  // Session request form state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqDate, setReqDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reqTime, setReqTime] = useState<string>("09:00");
  const [reqTopic, setReqTopic] = useState<string>("");
  const [reqDuration, setReqDuration] = useState<number>(30);
  const [reqLanguage, setReqLanguage] = useState<string>("en");
  const [reqLoading, setReqLoading] = useState(false);

  const createSessionRequest = useCreateSessionRequest();

  async function submitSessionRequest(e?: any) {
    if (e) e.preventDefault();
    if (!auth?.user) return toast.error("Please sign in");
    setReqLoading(true);
    try {
      const scheduled = new Date(`${reqDate}T${reqTime}:00.000Z`).toISOString();
      const sup = supabase as any;
      
      // First, check if student has an active subscription
      const { data: subscription, error: subError } = await sup
        .from("student_subscriptions")
        .select("id, current_session_slots, bonus_slots, status, expires_at")
        .eq("user_id", auth.user.id)
        .eq("status", "active")
        .maybeSingle();

      if (subError) {
        console.error("Subscription check error:", subError);
        throw new Error("Failed to verify subscription. Please try again.");
      }

      if (!subscription) {
        throw new Error("You need an active subscription to book sessions. Please purchase a plan first.");
      }

      // Check if subscription is expired
      if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
        throw new Error("Your subscription has expired. Please renew to continue booking sessions.");
      }

      // Check if slots are available (including bonus slots)
      const totalAvailable = (subscription.current_session_slots || 0) + (subscription.bonus_slots || 0);
      if (totalAvailable <= 0) {
        throw new Error("No sessions remaining. Please renew your subscription.");
      }

      // Use the mutation hook (this will automatically invalidate admin queries)
      const request = await createSessionRequest.mutateAsync({
        student_id: auth.user.id,
        scheduled_time: scheduled,
        duration_mins: reqDuration,
        topic: reqTopic,
        language: reqLanguage,
        status: "pending_admin_assignment",
      });

      // Send notification to all admins
      if (request?.id) {
        try {
          const { data: admins } = await sup
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (admins && admins.length > 0) {
            const notifications = admins.map((admin: any) => ({
              user_id: admin.user_id,
              title: "New Session Request",
              body: `A student has requested a session. Topic: ${reqTopic || "General"}`,
              kind: "booking",
              category: "session_request",
              related_id: request.id,
              metadata: {
                request_id: request.id,
                student_id: auth?.user?.id || "",
                topic: reqTopic,
                language: reqLanguage,
                scheduled_time: scheduled,
              },
            }));

            await sup.from("notifications").insert(notifications);
          }
        } catch (notifError) {
          console.error("Failed to send admin notifications:", notifError);
          // Don't fail the request if notification fails
        }
      }

      toast.success("Session request submitted — pending admin assignment");
      setShowRequestModal(false);
      
      // Reset form
      setReqTopic("");
      setReqDuration(30);
      setReqLanguage("en");
      
    } catch (err: any) {
      console.error("Session request error:", err);
      toast.error(err?.message || "Failed to request session");
    } finally {
      setReqLoading(false);
    }
  }

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

  // Combine regular sessions and demo sessions for display
  const regularUpcoming = sessions.filter((s) =>
    ["pending", "accepted", "confirmed"].includes(s.status),
  );
  const regularPast = sessions.filter((s) =>
    ["completed", "rejected", "cancelled"].includes(s.status),
  );

  // Demo sessions: confirmed = upcoming, completed/cancelled/no_show = past
  const demoUpcoming = demoBookings.filter((d) =>
    ["pending_admin_confirmation", "confirmed"].includes(d.booking_status),
  );
  const demoPast = demoBookings.filter((d) =>
    ["completed", "cancelled", "no_show"].includes(d.booking_status),
  );

  const upcoming = [...regularUpcoming, ...demoUpcoming];
  const past = [...regularPast, ...demoPast];

  const mentorById = new Map((mentors ?? []).map((mentor) => [mentor.id, mentor]));

  return (
    <StudentLayout>
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
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <Empty />
            ) : (
              <>
                {regularUpcoming.map((s) => (
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
                ))}
                {demoUpcoming.map((demo) => (
                  <DemoSessionRow key={demo.id} demo={demo} />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-4 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold mb-4">Session requests</h2>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setShowRequestModal(true)}>
                    Request session
                  </Button>
                </div>
              </div>
              <RequestList userId={auth?.user?.id} />
            </div>
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {past.length === 0 ? (
              <Empty />
            ) : (
              <>
                {regularPast.map((s) => (
                  <SessionRow
                    key={s.id}
                    s={s}
                    mentor={mentorById.get(s.mentor_id)}
                    existingReview={reviewBySessionId.get(s.id) ?? null}
                    onRateClick={
                      s.status === "completed" && !reviewBySessionId.get(s.id)
                        ? () => setRatingModal({ sessionId: s.id, mentorId: s.mentor_id ?? "" })
                        : undefined
                    }
                    resources={resources.filter(
                      (resource) =>
                        resource.session_id === s.id ||
                        (resource.visibility === "session" && resource.student_id === auth?.user?.id),
                    )}
                  />
                ))}
                {demoPast.map((demo) => (
                  <DemoSessionRow key={demo.id} demo={demo} />
                ))}
              </>
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
              <p className="text-sm text-muted-foreground">
                How was your experience with this mentor?
              </p>
              <div className="flex items-center justify-center gap-2 py-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    className="transition hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 ${star <= ratingValue ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                    />
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setRatingModal(null);
                    setRatingValue(0);
                    setReviewComment("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={ratingValue === 0 || submittingReview}
                  onClick={handleQuickReviewSubmit}
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">Request a session</h3>
              <form onSubmit={submitSessionRequest} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    className="rounded-md border p-2"
                    value={reqDate}
                    onChange={(e: any) => setReqDate(e.target.value)}
                  />
                  <input
                    type="time"
                    className="rounded-md border p-2"
                    value={reqTime}
                    onChange={(e: any) => setReqTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm">Topic</label>
                  <input
                    className="w-full rounded-md border p-2"
                    value={reqTopic}
                    onChange={(e: any) => setReqTopic(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Duration (mins)</label>
                    <select
                      className="w-full rounded-md border px-2 py-2"
                      value={reqDuration}
                      onChange={(e: any) => setReqDuration(Number(e.target.value))}
                    >
                      <option value={30}>30</option>
                      <option value={45}>45</option>
                      <option value={60}>60</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm">Language</label>
                    <select
                      className="w-full rounded-md border px-2 py-2"
                      value={reqLanguage}
                      onChange={(e: any) => setReqLanguage(e.target.value)}
                    >
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowRequestModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={reqLoading}>
                    {reqLoading ? "Submitting..." : "Request session"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </StudentLayout>
  );
}

function RequestList({ userId }: { userId?: string | null }) {
  const { data: requests = [], isLoading } = useStudentSessionRequests(userId ?? undefined);

  if (!userId) return null;
  if (isLoading)
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  if (requests.length === 0)
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground">No requests yet</CardContent>
      </Card>
    );

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending_admin_assignment: "secondary",
    pending_mentor_response: "default",
    confirmed: "default",
    completed: "outline",
    cancelled: "destructive",
    unassigned: "outline",
  };

  return (
    <div className="space-y-3">
      {requests.map((r: any) => (
        <Card key={r.id}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div>{r.topic || "Session request"}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(r.scheduled_time).toLocaleString()}
                </div>
              </div>
              <Badge variant={statusVariant[r.status] ?? "secondary"}>{r.status}</Badge>
            </div>
            {r.session_id && r.status === "confirmed" && (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/student/session/$id" params={{ id: r.session_id }}>
                    Open workspace
                  </Link>
                </Button>
              </div>
            )}
            {r.status === "pending_admin_assignment" && (
              <p className="flex items-center gap-1 text-xs text-amber-600">
                <Clock className="h-3 w-3" /> Pending admin assignment - a mentor will be assigned
                soon.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
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
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < existingReview.rating ? "fill-warning text-warning" : "text-muted-foreground"}`}
                  />
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

function DemoSessionRow({ demo }: { demo: any }) {
  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending_admin_confirmation: "secondary",
    confirmed: "default",
    completed: "outline",
    cancelled: "destructive",
    no_show: "destructive",
  };

  const isUpcoming = ["pending_admin_confirmation", "confirmed"].includes(demo.booking_status);
  const isConfirmed = demo.booking_status === "confirmed";

  return (
    <Card className={isConfirmed ? "border-green-200 bg-green-50/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-base">Demo Session</h3>
              <Badge variant={statusColors[demo.booking_status] || "secondary"}>
                {demo.booking_status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {new Date(demo.booking_date).toLocaleDateString()} • {demo.booking_time_start} - {demo.booking_time_end}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">Duration: {demo.duration_mins} min</span>
                <span className="text-xs">Language: {demo.language?.toUpperCase()}</span>
              </div>
              {demo.admin_notes && (
                <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs">
                  <strong>Admin Notes:</strong> {demo.admin_notes}
                </div>
              )}
              {isConfirmed && demo.meeting_link && (
                <div className="mt-2">
                  <Button size="sm" asChild>
                    <a href={demo.meeting_link} target="_blank" rel="noreferrer">
                      <Video className="mr-2 h-4 w-4" />
                      Join Demo Session
                    </a>
                  </Button>
                </div>
              )}
              {isUpcoming && !isConfirmed && (
                <p className="text-xs text-amber-600 mt-2">
                  Waiting for admin confirmation...
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}