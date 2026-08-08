import { supabase } from "@/integrations/supabase/client";

const client = supabase as any;

export type MentorApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "interview_scheduled"
  | "interview_completed"
  | "approved"
  | "rejected"
  | "active";

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  interview_scheduled: "Interview Scheduled",
  interview_completed: "Interview Completed",
  approved: "Approved",
  rejected: "Rejected",
  active: "Active",
};

/**
 * Typed shape of a mentor_applications row as used by the admin review page.
 */
export interface MentorApplication {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone_number?: string | null;
  native_language?: string | null;
  teaching_languages?: string[];
  city?: string | null;
  state?: string | null;
  country?: string | null;
  years_of_experience?: number | null;
  current_occupation?: string | null;
  highest_qualification?: string | null;
  teaching_experience?: string | null;
  certifications?: string[];
  available_days?: string[];
  available_time_slots?: string[];
  timezone?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  // Resume
  resume_path?: string | null;
  resume_url?: string | null;
  resume_file_name?: string | null;
  resume_file_type?: string | null;
  // Education / Experience
  education?: string | null;
  degree?: string | null;
  college?: string | null;
  graduation_year?: number | null;
  current_company?: string | null;
  current_role?: string | null;
  subjects?: string[];
  availability?: string[];
  experience?: string | null;
  teaching_style?: string | null;
  sample_lessons?: string | null;
  why_apply?: string | null;
  why_good_mentor?: string | null;
  teaching_methodology?: string | null;
  // Status / admin
  status: string;
  admin_notes?: string | null;
  rejection_reason?: string | null;
  application_id_display?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export async function fetchMyApplication(userId: string) {
  const { data, error } = await supabase
    .from("mentor_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchApplicationById(applicationId: string): Promise<MentorApplication | null> {
  const { data, error } = await supabase
    .from("mentor_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw error;
  return (data as MentorApplication) ?? null;
}

/**
 * Resolve a private-bucket resume path to a usable signed URL.
 *
 * The mentor-resumes bucket is PRIVATE, so we MUST use a signed URL and never
 * rely on a public URL. The project uses Supabase directly (client-side), so we
 * generate the signed URL via `supabase.storage` rather than calling a separate
 * backend endpoint. This removes the fragile `/api/signed-url` dependency that
 * returned HTML (404) and caused `Unexpected token '<'` when parsed as JSON.
 */
export async function createSignedUrlForPath(
  pathOrUrl: string | null | undefined,
  expiresIn = 60 * 60,
): Promise<string | null> {
  const key = pathOrUrl ?? null;
  if (!key) return null;

  // If a real (non-empty) URL was already stored, return it directly.
  if (key.startsWith("http://") || key.startsWith("https://")) return key;

  // Determine the bucket from the path. Resume uploads live in the private
  // `mentor-resumes` bucket (paths start with `mentor/`); everything else is
  // in the `resources` bucket.
  const bucket = key.startsWith("mentor/") ? "mentor-resumes" : "resources";

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, expiresIn);
    if (error) throw error;
    return data?.signedUrl ?? null;
  } catch (err) {
    console.error("Failed to create signed URL for resume", err);
    return null;
  }
}

/**
 * Resolve a private-bucket resume path to a usable URL.
 * The mentor-resumes bucket is PRIVATE, so we must use a signed URL and
 * never rely on a public URL. We generate the signed URL directly via
 * Supabase storage (no backend endpoint).
 */
export async function resolveResumeUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
  return createSignedUrlForPath(pathOrUrl);
}

/**
 * Filter an arbitrary mentor-application draft payload down to the columns
 * that actually exist on the `mentor_applications` table. This prevents 400
 * "could not find column" errors caused by sending undefined, computed, or
 * UI-only fields to the database.
 */
const APPLICATION_COLUMNS: string[] = [
  "id",
  "user_id",
  "full_name",
  "email",
  "phone_number",
  "native_language",
  "teaching_languages",
  "city",
  "state",
  "country",
  "years_of_experience",
  "current_occupation",
  "highest_qualification",
  "teaching_experience",
  "certifications",
  "available_days",
  "available_time_slots",
  "timezone",
  "bio",
  "linkedin_url",
  "github_url",
  "portfolio_url",
  "resume_path",
  "resume_url",
  "resume_file_name",
  "resume_file_type",
  "education",
  "degree",
  "college",
  "graduation_year",
  "current_company",
  "current_role",
  "subjects",
  "availability",
  "experience",
  "teaching_style",
  "sample_lessons",
  "why_apply",
  "why_good_mentor",
  "teaching_methodology",
  "status",
  "admin_notes",
  "rejection_reason",
  "application_id_display",
  "reviewed_at",
];

function filterApplicationPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const key of Object.keys(payload)) {
    if (!APPLICATION_COLUMNS.includes(key)) continue;
    const value = payload[key];
    // Never send undefined. Preserve null/0/""/[] as-is (they are valid).
    if (value === undefined) continue;
    clean[key] = value;
  }
  return clean;
}

/**
 * Save (insert or update) the current user's mentor application.
 *
 * This is deterministic and does NOT depend on a unique constraint on
 * `user_id`. It first checks whether a row already exists for the user, then
 * inserts or updates accordingly. Only valid DB columns are sent.
 */
export async function upsertMyApplication(payload: any) {
  const userId = payload?.user_id ?? payload?.user;
  if (!userId) {
    throw new Error("Missing required field: user_id. You must be signed in to save your application.");
  }

  const cleanPayload = filterApplicationPayload({ ...payload, user_id: userId });

  // Check whether an application already exists for this user.
  const { data: existing, error: fetchError } = await supabase
    .from("mentor_applications")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  if (existing?.id) {
    // Update the existing row.
    const { error } = await (supabase as any)
      .from("mentor_applications")
      .update(cleanPayload)
      .eq("id", existing.id);
    if (error) throw error;
    return { ...cleanPayload, id: existing.id };
  }

  // Insert a new row.
  const { data, error } = await (supabase as any)
    .from("mentor_applications")
    .insert([cleanPayload])
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// Max resume size and accepted MIME types (strict PDF-only policy).
const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10 MB
const RESUME_BUCKET = "mentor-resumes";

export async function uploadResume(file: File, folder: string) {
  // Enforce size limit (10 MB) and PDF-only MIME before upload.
  if (file.size > MAX_RESUME_SIZE) {
    throw new Error("Resume must be under 10 MB.");
  }
  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed.");
  }

// Upload to the private mentor-resumes bucket so RLS policies apply correctly.
  // Path follows the convention: {folder}/{uuid}-{file.name}
  // The RLS owner-insert policy requires folder = `mentor/{auth.uid()}/applications`
  // so that storage.foldername(path)[2] resolves to the caller's auth.uid().
  const path = `${folder}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(RESUME_BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: "3600",
    contentType: "application/pdf",
  });
  if (error) {
    // Surface a human-readable reason for storage failures.
    const msg = error.message ?? String(error);
    if (/permission|row.?level|RLS|policy/i.test(msg)) {
      throw new Error("Permission denied: you can only upload to your own resume folder. Please sign in again and retry.");
    }
    throw error;
  }

  // The bucket is PRIVATE. Do NOT rely on getPublicUrl() (it returns a
  // non-functional public URL for a private bucket). Store the storage path
  // as the source of truth (`resume_path`); generate a signed URL on demand
  // via `createSignedUrlForPath`.
  return {
    path,
    publicUrl: "", // private bucket: no stable public URL; use signed URL
    signedUrl: await createSignedUrlForPath(path),
    fileName: file.name,
    fileType: file.type, // "application/pdf"
    fileSize: file.size,
  };
}

export async function updateApplicationStatus(
  applicationId: string,
  newStatus: string,
  actorId: string,
  notes?: string,
) {
  // Update application status and insert history row
  const { error: updateError } = await supabase
    .from("mentor_applications")
    .update({ status: newStatus })
    .eq("id", applicationId);
  if (updateError) throw updateError;

  const { error: histError } = await client
    .from("mentor_application_status_history")
    .insert([{ application_id: applicationId, new_status: newStatus, changed_by: actorId, notes }]);
  if (histError) throw histError;

  // Write audit log
  await client.from("audit_logs").insert([
    {
      actor_id: actorId,
      scope: "mentor_applications",
      action: `status:${newStatus}`,
      details: { application_id: applicationId, notes },
    },
  ]);
  return true;
}

export async function scheduleInterview(
  applicationId: string,
  scheduledTime: string,
  interviewerId: string,
  location?: string,
  notes?: string,
) {
  const { error } = await client.from("mentor_application_interviews").insert([
    {
      application_id: applicationId,
      scheduled_time: scheduledTime,
      interviewer_id: interviewerId,
      location,
      notes,
    },
  ]);
  if (error) throw error;
  await client.from("audit_logs").insert([
    {
      actor_id: interviewerId,
      scope: "mentor_application_interviews",
      action: "schedule",
      details: { application_id: applicationId, scheduled_time: scheduledTime },
    },
  ]);
  return true;
}

export async function recordInterviewResult(
  interviewId: string,
  result: "pass" | "fail",
  notes: string,
  actorId: string,
) {
  const { error } = await client
    .from("mentor_application_interviews")
    .update({ result, result_notes: notes, result_at: new Date().toISOString() })
    .eq("id", interviewId);
  if (error) throw error;

  await client.from("audit_logs").insert([
    {
      actor_id: actorId,
      scope: "mentor_application_interviews",
      action: `result:${result}`,
      details: { interview_id: interviewId, notes },
    },
  ]);
  return true;
}

export async function addMentorNote(applicationId: string, note: string, createdBy: string) {
  const { error } = await client.from("mentor_notes").insert([
    {
      application_id: applicationId,
      note,
      created_by: createdBy,
    },
  ]);
  if (error) throw error;
  return true;
}

export async function fetchMentorNotes(applicationId: string) {
  const { data, error } = await client
    .from("mentor_notes")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchActivationHistory(applicationId: string) {
  const { data, error } = await client
    .from("mentor_activation_history")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Insert a notification via the privileged (SECURITY DEFINER) function.
// This is required because the applicant cannot insert a notification whose
// user_id is an admin (cross-user inserts are blocked by RLS). The function
// bypasses RLS but is tightly scoped to the notifications table.
export async function insertNotification(opts: {
  userId: string;
  title: string;
  body?: string;
  category?: string;
  kind?: string;
  relatedId?: string;
  link?: string;
}) {
  const { error } = await (supabase as any).rpc("insert_notification", {
    p_user_id: opts.userId,
    p_title: opts.title,
    p_body: opts.body ?? null,
    p_category: opts.category ?? "general",
    p_kind: opts.kind ?? "system",
    p_related_id: opts.relatedId ?? null,
    p_link: opts.link ?? null,
  });
  if (error) throw error;
  return true;
}

export async function fetchApplicationHistory(applicationId: string) {
  const { data, error } = await client
    .from("mentor_application_status_history")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchApplicationInterviews(applicationId: string) {
  const { data, error } = await client
    .from("mentor_application_interviews")
    .select("*")
    .eq("application_id", applicationId)
    .order("scheduled_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}