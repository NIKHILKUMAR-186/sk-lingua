import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  MessageSquareMore,
  BookOpen,
  Clock3,
  CheckCircle2,
  ExternalLink,
  CalendarDays,
  UserRound,
  Languages,
  Star,
  ThumbsUp,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { uploadSessionFile } from "@/lib/session-workspace";
import type {
  SessionAttachment,
  SessionHomework,
  SessionHomeworkSubmission,
  SessionNote,
  SessionTimelineEvent,
} from "@/types/session-workspace";
import { ReviewForm, type ReviewFormPayload } from "@/components/review/ReviewForm";
import { ReviewCard } from "@/components/review/ReviewCard";
import { useWorkspaceRealtime } from "@/hooks/use-workspace-realtime";

interface SessionWorkspaceProps {
  sessionId: string;
  session: Record<string, any> | null;
  role: "student" | "mentor";
  homework: SessionHomework[];
  submissions: SessionHomeworkSubmission[];
  notes: SessionNote[];
  timeline: SessionTimelineEvent[];
  resources: Array<Record<string, any>>;
  workspace?: Record<string, any> | null;
  onCreateHomework?: (payload: Record<string, any>) => Promise<void>;
  onCreateNote?: (payload: Record<string, any>) => Promise<void>;
  onSubmitHomework?: (payload: Record<string, any>) => Promise<void>;
  onReviewHomework?: (payload: Record<string, any>) => Promise<void>;
  onSubmitReview?: (payload: {
    mentor_id: string;
    session_id: string;
    student_id: string;
    rating: number;
    teaching_quality_rating: number;
    communication_rating: number;
    knowledge_rating: number;
    punctuality_rating: number;
    friendliness_rating: number;
    recommend: boolean;
    review_text: string;
    attachment_url: string | null;
  }) => Promise<void>;
  existingReview?: Record<string, any> | null;
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
  workspace,
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
  const [homeworkAttachments, setHomeworkAttachments] = useState<File[]>([]);
  const [submissionAttachments, setSubmissionAttachments] = useState<File[]>([]);
  const [submissionText, setSubmissionText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("5");
  const [corrections, setCorrections] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<"mentor_private" | "shared" | "student_private">(
    "shared",
  );
  // Review state (kept for backward compatibility, but no longer used by form)
  const [submittingReview, setSubmittingReview] = useState(false);

  // Realtime chat
  const workspaceId = workspace?.id;
  const { messages, typingUsers, presence, connected, sendMessage, startTyping, stopTyping } =
    useWorkspaceRealtime(workspaceId, currentUserId);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage() {
    if (!chatInput.trim()) return;
    try {
      await sendMessage(chatInput.trim());
      setChatInput("");
      stopTyping();
    } catch {
      // Error toast already shown by hook
    }
  }

  const filteredNotes = useMemo(
    () =>
      notes.filter((note) => {
        if (role === "mentor") return note.note_type !== "student_private";
        return note.note_type === "shared" || note.note_type === "student_private";
      }),
    [notes, role],
  );

  async function handleHomeworkCreate() {
    if (!onCreateHomework) {
      console.error("onCreateHomework is undefined");
      toast.error("Internal error: createHomework not ready");
      return;
    }
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle) {
      toast.error("Please provide a homework title.");
      return;
    }
    setUploading(true);
    setUploadProgress(10);
    try {
      const attachments = [] as Array<Record<string, unknown>>;
      for (const file of homeworkAttachments) {
        try {
          const result = await uploadSessionFile(file, `homework/${sessionId}`);
          attachments.push(result as unknown as Record<string, unknown>);
        } catch (uploadErr: any) {
          console.error("FILE UPLOAD FAILED:", uploadErr?.message || uploadErr);
          toast.error("Upload error: " + (uploadErr?.message || "unknown error"));
          throw new Error("File upload failed: " + (uploadErr?.message || "unknown error"));
        }
      }
      setUploadProgress(60);
      await onCreateHomework({
        title: trimmedTitle,
        description: trimmedDescription,
        deadline: deadline || null,
        difficulty,
        estimated_time_mins: Number(estimatedTime) || null,
        attachments,
        session_id: sessionId,
      });
      setTitle("");
      setDescription("");
      setDeadline("");
      setDifficulty("Medium");
      setEstimatedTime("30");
      setHomeworkAttachments([]);
      toast.success("Homework created");
    } catch (error) {
      console.error("handleHomeworkCreate caught error:", error);
      toast.error((error as Error).message ?? "Unable to create homework");
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  }

  async function handleSubmission() {
    if (!onSubmitHomework) return;
    const activeHomework = homework[0];
    if (!activeHomework) {
      toast.error("No homework assignment available to submit.");
      return;
    }
    setUploading(true);
    setUploadProgress(10);
    try {
      const attachments = [] as Array<Record<string, unknown>>;
      for (const file of submissionAttachments) {
        const result = await uploadSessionFile(file, `submissions/${sessionId}`);
        attachments.push(result as unknown as Record<string, unknown>);
      }
      setUploadProgress(60);
      await onSubmitHomework({
        homework_id: activeHomework.id,
        submission_text: submissionText,
        attachments,
        status: "Submitted",
      });
      setSubmissionText("");
      setSubmissionAttachments([]);
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
    await onReviewHomework({
      homework_id: homeworkId,
      mentor_feedback: feedback,
      mentor_score: Number(score),
      corrections,
      attachments: [],
    });
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

  // handleReviewSubmit is now handled by ReviewForm component directly

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Session workspace</CardTitle>
          </div>
          {session?.video_call_link && session.status === "accepted" ? (
            <Button asChild size="sm" variant="outline">
              <a href={session.video_call_link} target="_blank" rel="noreferrer">
                Join live session
              </a>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium">Session title</div>
              <div className="text-lg font-semibold">
                {session?.gig?.title ?? session?.student_message ?? "Learning session"}
              </div>
              <div className="text-sm text-muted-foreground">
                {session?.student_message ?? "Session workspace"}
              </div>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                Mentor: {session?.mentor?.full_name ?? "Mentor"}
              </div>
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                Student: {session?.student?.full_name ?? "Student"}
              </div>
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Language: {session?.gig?.language ?? "TBD"}
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Duration: {session?.duration_mins ?? 30} min
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Date:{" "}
              {session?.scheduled_time
                ? new Date(session.scheduled_time).toLocaleDateString()
                : "TBD"}
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Time:{" "}
              {session?.scheduled_time
                ? new Date(session.scheduled_time).toLocaleTimeString()
                : "TBD"}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Session status: {session?.status ?? "pending"}
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Meeting link:{" "}
              {session?.video_call_link ? (
                <a
                  href={session.video_call_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Open
                </a>
              ) : (
                "Not shared yet"
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {timeline.length === 0 ? (
            <div className="text-sm text-muted-foreground">No timeline events yet.</div>
          ) : (
            timeline.map((event) => (
              <div key={event.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{event.title}</div>
                  <Badge variant="outline">{event.event_type}</Badge>
                </div>
                {event.detail ? (
                  <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
                ) : null}
              </div>
            ))
          )}
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
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Homework title"
                  required
                  minLength={1}
                />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the assignment"
                  required
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                  <Input
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder="Estimated minutes"
                  />
                </div>
                <Input
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  placeholder="Difficulty"
                />
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  <span>
                    {homeworkAttachments.length
                      ? `${homeworkAttachments.length} file(s) selected`
                      : "Attach files"}
                  </span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setHomeworkAttachments(Array.from(e.target.files ?? []))}
                  />
                </label>
                {uploading ? <Progress value={uploadProgress} /> : null}
                <Button
                  onClick={handleHomeworkCreate}
                  disabled={uploading || title.trim().length === 0}
                >
                  Create homework
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {homework.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No homework yet.</div>
                ) : (
                  homework.map((entry) => (
                    <div key={entry.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{entry.title}</div>
                        <Badge variant="outline">{entry.status}</Badge>
                      </div>
                      {entry.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                      ) : null}
                      {entry.deadline ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Deadline: {new Date(entry.deadline).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
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
                <Textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Write your submission or notes"
                />
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  <span>
                    {submissionAttachments.length
                      ? `${submissionAttachments.length} file(s) selected`
                      : "Upload PDF, DOCX, image, ZIP"}
                  </span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setSubmissionAttachments(Array.from(e.target.files ?? []))}
                  />
                </label>
                {uploading ? <Progress value={uploadProgress} /> : null}
                <Button onClick={handleSubmission} disabled={uploading}>
                  Submit homework
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No submissions yet.</div>
                ) : (
                  submissions.map((submission) => (
                    <div key={submission.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">Submission</div>
                        <Badge variant="outline">{submission.status}</Badge>
                      </div>
                      {submission.submission_text ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {submission.submission_text}
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleString()
                          : "Pending"}
                      </div>
                      <div className="mt-3 space-y-2">
                        <Input
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Feedback"
                        />
                        <Input
                          value={score}
                          onChange={(e) => setScore(e.target.value)}
                          placeholder="Score"
                        />
                        <Textarea
                          value={corrections}
                          onChange={(e) => setCorrections(e.target.value)}
                          placeholder="Corrections"
                        />
                        <Button size="sm" onClick={() => handleFeedback(submission.homework_id)}>
                          Save feedback
                        </Button>
                      </div>
                    </div>
                  ))
                )}
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
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title"
            />
            <Select
              value={noteType}
              onValueChange={(value) => setNoteType(value as typeof noteType)}
            >
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
          <Textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Capture follow-up points or observations for this session"
          />
          <Button onClick={handleNoteCreate} disabled={!noteTitle || !noteBody}>
            Save note
          </Button>
          {filteredNotes.length === 0 ? (
            <div className="text-sm text-muted-foreground">No notes available.</div>
          ) : (
            filteredNotes.map((note) => (
              <div key={note.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{note.title ?? "Note"}</div>
                  <Badge variant="outline">{note.note_type}</Badge>
                </div>
                {note.body ? (
                  <p className="mt-1 text-sm text-muted-foreground">{note.body}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {resources.length === 0 ? (
            <div className="text-sm text-muted-foreground">No resources shared yet.</div>
          ) : (
            resources.map((resource) => (
              <div key={resource.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{resource.title}</div>
                  <Badge variant="outline">Session Only</Badge>
                </div>
                {resource.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{resource.description}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Rating & Review Card - Student only, when session is completed */}
      {role === "student" &&
        session?.status === "completed" &&
        (existingReview ? (
          <ReviewCard
            review={
              {
                ...existingReview,
                student: {
                  id: existingReview.student_id,
                  full_name: session?.student?.full_name,
                  avatar_url: null,
                },
              } as any
            }
            variant="detailed"
          />
        ) : (
          <ReviewForm
            mentorId={session?.mentor_id ?? ""}
            sessionId={sessionId}
            studentId={currentUserId ?? ""}
            onSubmit={async (payload) => {
              if (!onSubmitReview) return;
              setSubmittingReview(true);
              try {
                await onSubmitReview(payload);
                toast.success("Review submitted successfully!");
              } catch (error) {
                toast.error((error as Error).message ?? "Unable to submit review");
              } finally {
                setSubmittingReview(false);
              }
            }}
          />
        ))}

      {/* Mentor view: Show student feedback */}
      {role === "mentor" && existingReview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-warning text-warning" />
              Student Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewCard
              review={
                {
                  ...existingReview,
                  student: {
                    id: existingReview.student_id,
                    full_name: session?.student?.full_name,
                    avatar_url: null,
                  },
                } as any
              }
              variant="detailed"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquareMore className="h-5 w-5" />
            Chat
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {connected ? (
              <span className="flex items-center gap-1 text-green-600">
                <Wifi className="h-3.5 w-3.5" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <WifiOff className="h-3.5 w-3.5" /> Offline
              </span>
            )}
            {presence.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {presence.length} online
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!workspaceId ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <MessageSquareMore className="mb-2 h-6 w-6" />
              <div className="font-medium">Chat is available once the session is confirmed.</div>
            </div>
          ) : (
            <>
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3">
                {messages.filter((m) => !(m.metadata && (m.metadata as any).type === "typing"))
                  .length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages
                    .filter((m) => !(m.metadata && (m.metadata as any).type === "typing"))
                    .map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                            m.sender_id === currentUserId
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border"
                          }`}
                        >
                          <div>{m.body}</div>
                          <div
                            className={`mt-1 text-[10px] ${m.sender_id === currentUserId ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                          >
                            {new Date(m.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                )}
                {typingUsers.length > 0 && (
                  <div className="text-xs text-muted-foreground italic">
                    {typingUsers.map((t) => t.userId).join(", ")} typing...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    if (e.target.value) startTyping();
                    else stopTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                />
                <Button size="icon" onClick={handleSendMessage} disabled={!chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
