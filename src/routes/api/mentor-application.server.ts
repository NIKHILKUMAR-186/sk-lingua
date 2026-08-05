import { supabaseAdmin } from "@/integrations/supabase/client.server";

function base64ToUint8Array(base64: string) {
  const binary = Buffer.from(base64, 'base64');
  return new Uint8Array(binary);
}

export async function POST({ request }: { request: Request }) {
  try {
    const payload = await request.json();
    const required = ["full_name", "email", "native_language", "teaching_languages", "resume"];
    for (const k of required) {
      if (!payload[k]) return new Response(JSON.stringify({ error: `missing ${k}` }), { status: 400 });
    }

    const admin = supabaseAdmin as any;
    // Prevent duplicate by email
    const { data: existing } = await admin.from("mentor_applications").select("id").eq("email", payload.email).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "application_exists" }), { status: 409 });
    }

    // Upload resume to private bucket
    const resume = payload.resume as { fileName: string; contentBase64: string; fileType?: string };
    const folder = `mentor_applications/${Date.now()}`;
    const path = `${folder}/${resume.fileName}`;
    const { error: uploadErr } = await admin.storage.from("resources").upload(path, base64ToUint8Array(resume.contentBase64), { contentType: resume.fileType || 'application/pdf', upsert: false });
    if (uploadErr) throw uploadErr;

    // Insert application row
    const insertPayload: any = {
      full_name: payload.full_name,
      email: payload.email,
      native_language: payload.native_language,
      teaching_languages: payload.teaching_languages,
      experience: payload.experience ?? null,
      teaching_style: payload.teaching_style ?? null,
      sample_lessons: payload.sample_lessons ?? null,
      status: 'submitted',
      resume_path: path,
      resume_file_name: resume.fileName,
      resume_file_type: resume.fileType ?? null,
      resume_url: null,
      admin_notes: null,
    };

    const { data, error } = await admin.from("mentor_applications").insert([insertPayload]).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Insert returned no data');

    // Insert initial status history

    await admin.from("mentor_application_status_history").insert([{ application_id: data.id, new_status: 'submitted', changed_by: null, notes: 'Submitted via public application' }]);

    // notify applicant if user_id present
    if (insertPayload.user_id) {
      await admin.from('notifications').insert([{ user_id: insertPayload.user_id, type: 'application_submitted', payload: { application_id: data.id } }]);
    }

    return new Response(JSON.stringify({ id: data.id }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
}
