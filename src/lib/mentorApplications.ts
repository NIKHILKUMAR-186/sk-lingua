import { supabase } from "@/integrations/supabase/client";
import { uploadStorageFile } from "@/lib/storage";

const client = (supabase as any);

export async function fetchMyApplication(userId: string) {
  const { data, error } = await supabase.from("mentor_applications").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertMyApplication(payload: any) {
  // payload must include user_id
  const { data, error } = await supabase.from("mentor_applications").upsert(payload, { onConflict: "id" });
  if (error) throw error;
  return data;
}

export async function uploadResume(file: File, folder: string) {
  // delegate to uploadStorageFile
  return await uploadStorageFile(file, folder);
}

export async function updateApplicationStatus(applicationId: string, newStatus: string, actorId: string, notes?: string) {
  // Update application status and insert history row
  const { error: updateError } = await supabase.from("mentor_applications").update({ status: newStatus }).eq("id", applicationId);
  if (updateError) throw updateError;

  const client = (supabase as any);
  const { error: histError } = await client.from("mentor_application_status_history").insert([{ application_id: applicationId, new_status: newStatus, changed_by: actorId, notes }]);
  if (histError) throw histError;

  // Write audit log
  await (supabase as any).from("audit_logs").insert([{ actor_id: actorId, scope: "mentor_applications", action: `status:${newStatus}`, details: { application_id: applicationId, notes } }]);
  return true;
}

export async function scheduleInterview(applicationId: string, scheduledTime: string, interviewerId: string, location?: string, notes?: string) {
  const { error } = await client.from("mentor_application_interviews").insert([{ application_id: applicationId, scheduled_time: scheduledTime, interviewer_id: interviewerId, location, notes }]);
  if (error) throw error;
  await (supabase as any).from("audit_logs").insert([{ actor_id: interviewerId, scope: "mentor_application_interviews", action: "schedule", details: { application_id: applicationId, scheduled_time: scheduledTime } }]);
  return true;
}
