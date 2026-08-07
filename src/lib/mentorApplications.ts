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

export async function fetchMyApplication(userId: string) {
  const { data, error } = await supabase
    .from("mentor_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchApplicationById(applicationId: string) {
  const { data, error } = await supabase
    .from("mentor_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertMyApplication(payload: any) {
  // payload must include user_id
  // Use user_id as the conflict target so a new row (no id yet) can be created,
  // and an existing row is updated in place.
  const { data, error } = await supabase
    .from("mentor_applications")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
  return data;
}

export async function uploadResume(file: File, folder: string) {
  // Upload to the private mentor-resumes bucket so RLS policies apply correctly.
  const path = `${folder}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("mentor-resumes").upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from("mentor-resumes")
    .getPublicUrl(path);
  return {
    path,
    publicUrl: publicUrlData.publicUrl,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
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

export async function fetchApplicationHistory(applicationId: string) {
  const { data, error } = await client
    .from("mentor_application_status_history")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
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