import { supabase } from "@/integrations/supabase/client";
import type { HomeworkStatus, SessionAttachment, SessionHomework, SessionHomeworkSubmission, SessionNote, SessionTimelineEvent } from "@/types/session-workspace";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "image/png",
  "image/jpeg",
  "image/webp",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
  "video/webm",
  "text/plain",
];

function isAllowedFileType(type: string) {
  return ALLOWED_FILE_TYPES.includes(type) || type.startsWith("image/") || type.startsWith("audio/") || type.startsWith("video/");
}

function buildAttachment(file: File, bucket: string, folder: string): Promise<SessionAttachment> {
  if (file.size > MAX_FILE_SIZE) throw new Error("File is too large. Maximum size is 20 MB.");
  if (!isAllowedFileType(file.type)) throw new Error("Unsupported file type.");

  const path = `${folder}/${crypto.randomUUID()}-${file.name}`;
  return supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" }).then(({ error }) => {
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return {
      name: file.name,
      url: data.publicUrl,
      type: file.type || "application/octet-stream",
      bucket,
      fileSize: file.size,
    };
  });
}

export async function uploadSessionFile(file: File, folder: string) {
  return buildAttachment(file, "session-files", folder);
}

export function calculateHomeworkStatus(deadline: string | null, status: string | null): HomeworkStatus {
  if (!deadline) return (status as HomeworkStatus) ?? "Assigned";
  const deadlineAt = new Date(deadline);
  const now = new Date();
  if (status === "Completed") return "Completed";
  if (status === "Reviewed") return "Reviewed";
  if (status === "Submitted") return now > deadlineAt ? "Late" : "Submitted";
  if (status === "In Progress") return now > deadlineAt ? "Late" : "In Progress";
  return now > deadlineAt ? "Late" : "Assigned";
}

export function getHomeworkStatusLabel(status: string | null, deadline: string | null): HomeworkStatus {
  return calculateHomeworkStatus(deadline, status);
}

export async function fetchSessionWorkspace(sessionId: string, userId: string) {
  const [{ data: session }, { data: homeworks }, { data: notes }, { data: timeline }, { data: resources }] = await Promise.all([
    supabase.from("sessions").select("*, mentor:mentor_id(*), student:student_id(*), gig:gig_id(*)").eq("id", sessionId).maybeSingle(),
    supabase.from("homeworks").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }),
    supabase.from("session_notes").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }),
    supabase.from("session_timeline").select("*").eq("session_id", sessionId).order("created_at", { ascending: true }),
    supabase.from("resources").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }),
  ]);

  const homeworkIds = (homeworks ?? []).map((entry) => entry.id);
  const { data: submissions } = homeworkIds.length
    ? await supabase.from("homework_submissions").select("*").in("homework_id", homeworkIds).order("created_at", { ascending: false })
    : { data: [] };

  const mappedHomework = (homeworks ?? []).map((entry) => ({ ...entry, status: getHomeworkStatusLabel(entry.status, entry.deadline) }));
  const mappedSubmissions = (submissions ?? []).map((entry) => ({ ...entry, status: getHomeworkStatusLabel(entry.status, null) }));

  return {
    session,
    homework: mappedHomework as SessionHomework[],
    submissions: mappedSubmissions as SessionHomeworkSubmission[],
    notes: notes as SessionNote[],
    timeline: timeline as SessionTimelineEvent[],
    resources: resources as Array<Record<string, unknown>>,
    userId,
  };
}

export async function createSessionTimelineEntry(sessionId: string, eventType: string, title: string, detail: string | null, createdBy: string | null, metadata: Record<string, unknown> | null = null) {
  const { data, error } = await supabase.from("session_timeline").insert({ session_id: sessionId, event_type: eventType, title, detail, created_by: createdBy, metadata }).select().single();
    if (error) {
      const details = typeof error === 'object' ? JSON.stringify(error) : String(error);
      const msg = `session_timeline insert failed: ${details}`;
      console.error(msg, { sessionId, eventType, title, createdBy, metadata });
      throw new Error(msg);
    }
  return data as SessionTimelineEvent;
}
