export type SessionNoteType = "mentor_private" | "shared" | "student_private";

export type HomeworkStatus =
  "Assigned" | "In Progress" | "Submitted" | "Reviewed" | "Completed" | "Late";

export interface SessionAttachment {
  name: string;
  url: string;
  type: string;
  bucket: string;
  fileSize?: number;
}

export interface SessionHomework {
  id: string;
  session_id: string;
  mentor_id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  difficulty: string | null;
  estimated_time_mins: number | null;
  status: string;
  attachments: SessionAttachment[];
  created_at: string;
  updated_at: string;
}

export interface SessionHomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  submission_text: string | null;
  status: string;
  submitted_at: string | null;
  attachments: SessionAttachment[];
  mentor_feedback: string | null;
  mentor_score: number | null;
  corrections: string | null;
  mentor_feedback_attachments: SessionAttachment[];
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionNote {
  id: string;
  session_id: string;
  note_type: SessionNoteType;
  title: string | null;
  body: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SessionTimelineEvent {
  id: string;
  session_id: string;
  event_type: string;
  title: string;
  detail: string | null;
  created_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
