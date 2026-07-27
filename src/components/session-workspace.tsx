import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, MessageSquareMore, BookOpen, Clock3, CheckCircle2, ExternalLink, CalendarDays, UserRound, Languages, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { uploadSessionFile } from "@/lib/session-workspace";
import type { SessionHomework, SessionHomeworkSubmission, SessionNote, SessionTimelineEvent } from "@/types/session-workspace";

interface SessionWorkspaceProps {
  sessionId: string;
  session: Record<string, any> | null;
  role: "student" | "mentor";
  homework: SessionHomework[];
  submissions: SessionHomeworkSubmission[];
  notes: SessionNote[];
  timeline: SessionTimelineEvent[];
  resources: Array<Record<string, any>>;
  onCreateHomework?: (payload: Record<string, any>) => Promise<void>;
  onCreateNote?: (payload: Record<string, any>) => Promise<void>;
  onSubmitHomework?: (payload: Record<string, any>) => Promise<void>;
  onReviewHomework?: (payload: Record<string, any>) => Promise<void>;
  onSubmitReview?: (payload: { mentor_id: string; rating: number; comment?: string }) => Promise<void>;
  existingReview?: { id: string; rating: number; comment: string | null } | null;
  currentUserId?: string;
}

export function SessionWorkspace({
  sessionId,
  session,
  role,
  homework,
  submissions,
  notes,
  timeline,
  resources,
  onCreateHomework,
  onCreateNote,
  onSubmitHomework,
  onReviewHomework,
  onSubmitReview,
  existingReview,
  currentUserId,
}: SessionWorkspaceProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [estimatedTime, setEstimatedTime] = useState("30");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [submissionText, setSubmissionText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("5");
  const [corrections, setCorrections] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<"mentor_private" | "shared" | "student_private">("shared");
  // Review state
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const filteredNotes = useMemo(() => notes.filter((note) => {
    if (role === "mentor") return note.note_type !== "student_private";
    return note.note_type === "shared" || note.note_type === "student_private";
  }), [notes, role]);

  async function handleHomeworkCreate() {
    if (!onCreateHomework) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      const attachments = [] as Array<Record<string, unknown>>;
      for (const file of attachmentFiles) {
        const result = await uploadSessionFile(file, `homework/${sessionId}`);
        attachments.push(result);
      }
      setUploadProgress(60);
      await onCreateHomework({ title, description, deadline, difficulty, estimated_time_mins: Number(estimatedTime), attachments, session_id: sessionId });
      setTitle("");
      setDescription("");
      setDeadline("");
      setDifficulty("Medium");
      setEstimatedTime("30");
      setAttachmentFiles([]);
      toast.success("Homework created");
    } catch (error) {
      toast.error((error as Error).message ?? "Unable to create homework");
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  }

  async function handleSubmission() {
    if (!onSubmitHomework) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      const attachments = [] as Array<Record<string, unknown>>;
      for (const file of attachmentFiles) {
        const result = await uploadSessionFile(file, `submissions/${sessionId}`);
        attachments.push(result);
      }
      setUploadProgress(60);
      await onSubmitHomework({ homework_id: homework[0]?.id, submission_text: submissionText, attachments, status: "Submitted" });
      setSubmissionText("");
      setAttachmentFiles([]);
      toast.success("Homework submitted");
    } catch (error) {
      toast.error((error as Error).message ?? "Unable to submit homework");
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  }

  async function handleFeedback(homeworkId: string) {
    if (!onReviewHomework) return;
    await onReviewHomework({ homework_id: homeworkId, mentor_feedback: feedback, mentor_score: Number(score), corrections, attachments: [] });
    setFeedback("");
    setScore("5");
    setCorrections("");
    toast.success("Feedback shared");
  }

  async function handleNoteCreate() {
    if (!onCreateNote) return;
    await onCreateNote({ title: noteTitle, body: noteBody, note_type: noteType });
    setNoteTitle("");
    setNoteBody("");
    setNoteType(role === "mentor" ? "mentor_private" : "student_private");
    toast.success("Note saved");
  }

  async function handleReviewSubmit() {
    if (!onSubmitReview || !session?.mentor_id || ratingValue === 0) return;
    setSubmittingReview(true);
    try {
      await onSubmitReview({ mentor_id: session.mentor_id, rating: ratingValue, comment: reviewComment });
      setRatingValue(0);
      setReviewComment("");
      toast.success("Review submitted successfully!");
    } catch (error) {
      toast.error((error as Error).message ?? "Unable to submit review");
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Session workspace</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium">Session title</div>
              <div className="text-lg font-semibold">{session?.gig?.title ?? session?.student_message ?? "Learning session"}</div>
              <div className="text-sm text-muted-foreground">{session?.student_message ?? "Session workspace"}</div>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="flex items-center gap-2"><UserRound className="h-4 w-4" />Mentor: {session?.mentor?.full_name ?? "Mentor"}</div>
              <div className="flex items-center gap-2"><UserRound className="h-4 w-4" />Student: {session?.student?.full_name ?? "Student"}</div>
              <div className="flex items-center gap-2"><Languages className="h-4 w-4" />Language: {session?.gig?.language ?? "TBD"}</div>
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" />Duration: {session?.duration_mins ?? 30} min</div>
            </div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />Date: {session?.scheduled_time ? new Date(session.scheduled_time).toLocaleDateString() : "TBD"}</div>
            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4" />Time: {session?.scheduled_time ? new Date(session.scheduled_time).toLocaleTimeString() : "TBD"}</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Session status: {session?.status ?? "pending"}</div>
            <div className="flex items-center gap-2"><ExternalLink className="h-4 w-4" />Meeting link: {session?.video_call_link ? <a href={session.video_call_link} target="_blank" rel="noreferrer" className="text-primary underline">Open</a> : "Not shared yet"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {timeline.length === 0 ? <div className="text-sm text-muted-foreground">No timeline events yet.</div> : timeline.map((event) => (
            <div key={event.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{event.title}</div>
                <Badge variant="outline">{event.event_type}</Badge>
              </div>
              {event.detail ? <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Homework</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {role === "mentor" ? (
              <div className="space-y-3">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Homework title" />
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the assignment" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  <Input value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} placeholder="Estimated minutes" />
                </div>
                <Input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="Difficulty" />
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  <span>{attachmentFiles.length ? `${attachmentFiles.length} file(s) selected` : "Attach files"}</span>
                  <input type="file" multiple className="hidden" onChange={(e) => setAttachmentFiles(Array.from(e.target.files ?? []))} />
                </label>
                {uploading ? <Progress value={uploadProgress} /> : null}
                <Button onClick={handleHomeworkCreate} disabled={uploading}>Create homework</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {homework.length === 0 ? <div className="text-sm text-muted-foreground">No homework yet.</div> : homework.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{entry.title}</div>
                      <Badge variant="outline">{entry.status}</Badge>
                    </div>
                    {entry.description ? <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p> : null}
                    {entry.deadline ? <p className="mt-2 text-xs text-muted-foreground">Deadline: {new Date(entry.deadline).toLocaleString()}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Homework submissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {role === "student" ? (
              <div className="space-y-3">
                <Textarea value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} placeholder="Write your submission or notes" />
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  <span>{attachmentFiles.length ? `${attachmentFiles.length} file(s) selected` : "Upload PDF, DOCX, image, ZIP"}</span>
                  <input type="file" multiple className="hidden" onChange={(e) => setAttachmentFiles(Array.from(e.target.files ?? []))} />
                </label>
                {uploading ? <Progress value={uploadProgress} /> : null}
                <Button onClick={handleSubmission} disabled={uploading}>Submit homework</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.length === 0 ? <div className="text-sm text-muted-foreground">No submissions yet.</div> : submissions.map((submission) => (
                  <div key={submission.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">Submission</div>
                      <Badge variant="outline">{submission.status}</Badge>
                    </div>
                    {submission.submission_text ? <p className="mt-1 text-sm text-muted-foreground">{submission.submission_text}</p> : null}
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "Pending"}
                    </div>
                    <div className="mt-3 space-y-2">
                      <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback" />
                      <Input value={score} onChange={(e) => setScore(e.target.value)} placeholder="Score" />
                      <Textarea value={corrections} onChange={(e) => setCorrections(e.target.value)} placeholder="Corrections" />
                      <Button size="sm" onClick={() => handleFeedback(submission.homework_id)}>Save feedback</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_0.8fr]">
            <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Note title" />
            <Select value={noteType} onValueChange={(value) => setNoteType(value as typeof noteType)}>
              <SelectTrigger>
                <SelectValue placeholder="Note type" />
              </SelectTrigger>
              <SelectContent>
                {role === "mentor" ? (
                  <>
                    <SelectItem value="mentor_private">Mentor private</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="shared">Shared</SelectItem>
                    <SelectItem value="student_private">Student personal</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <Textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Capture follow-up points or observations for this session" />
          <Button onClick={handleNoteCreate} disabled={!noteTitle || !noteBody}>Save note</Button>
          {filteredNotes.length === 0 ? <div className="text-sm text-muted-foreground">No notes available.</div> : filteredNotes.map((note) => (
            <div key={note.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{note.title ?? "Note"}</div>
                <Badge variant="outline">{note.note_type}</Badge>
              </div>
              {note.body ? <p className="mt-1 text-sm text-muted-foreground">{note.body}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {resources.length === 0 ? <div className="text-sm text-muted-foreground">No resources shared yet.</div> : resources.map((resource) => (
            <div key={resource.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{resource.title}</div>
                <Badge variant="outline">Session Only</Badge>
              </div>
              {resource.description ? <p className="mt-1 text-sm text-muted-foreground">{resource.description}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rating & Review Card - Student only, when session is completed */}
      {role === "student" && session?.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle>Rate this session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingReview ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-lg">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < existingReview.rating ? "fill-warning text-warning" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
                {existingReview.comment && <p className="text-sm text-muted-foreground">"{existingReview.comment}"</p>}
                <p className="text-xs text-muted-foreground">You already reviewed this session. Thank you!</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">Your rating</label>
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const star = i + 1;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingValue(star)}
                          className="transition hover:scale-110"
                        >
                          <Star
                            className={`h-7 w-7 ${
                              star <= ratingValue
                                ? "fill-warning text-warning"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  {ratingValue === 0 && <p className="mt-1 text-xs text-muted-foreground">Tap a star to rate</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Comment (optional)</label>
                  <Textarea
                    className="mt-1"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience with this mentor..."
                  />
                </div>
                <Button onClick={handleReviewSubmit} disabled={ratingValue === 0 || submittingReview}>
                  {submittingReview ? "Submitting..." : "Submit review"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Chat placeholder</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          <MessageSquareMore className="mb-2 h-6 w-6" />
          <div className="font-medium">Realtime chat will be available in a later phase.</div>
          <p className="mt-1">The architecture is ready for message threads and collaboration.</p>
        </CardContent>
      </Card>
    </div>
  );
}
