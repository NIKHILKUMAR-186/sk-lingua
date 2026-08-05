import { supabaseAdmin } from "@/integrations/supabase/client.server";

function generateTempPassword() {
  return require('crypto').randomBytes(8).toString('hex');
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { applicationId, interviewerNotes } = body;
    if (!applicationId) return new Response(JSON.stringify({ error: 'missing applicationId' }), { status: 400 });

    // fetch application
    const admin = supabaseAdmin as any;
    const { data: app, error: appErr } = await admin.from('mentor_applications').select('*').eq('id', applicationId).maybeSingle();
    if (appErr) throw appErr;
    if (!app) return new Response(JSON.stringify({ error: 'application_not_found' }), { status: 404 });

    // begin ops
    const tempPassword = generateTempPassword();
    let createdUserId = app.user_id ?? null;

    if (!createdUserId) {
      // create a Supabase user with temporary password
      const createResult = await admin.auth.admin.createUser({
        email: app.email,
        password: tempPassword,
        user_metadata: { full_name: app.full_name },
        email_confirm: true,
      });
      if (createResult.error) throw createResult.error;
      createdUserId = createResult.data.user?.id ?? null;
    }

    // upsert mentor_profile
    const { error: mpErr } = await admin.from('mentor_profiles').upsert({ user_id: createdUserId, headline: app.headline ?? null, bio: app.experience ?? null, is_active: true }, { onConflict: 'user_id' });
    if (mpErr) throw mpErr;

    // add mentor role
    const { error: roleErr } = await admin.from('user_roles').upsert([{ user_id: createdUserId, role: 'mentor' }], { onConflict: 'user_id,role' });
    if (roleErr) throw roleErr;

    // update application status
    const { error: updErr } = await admin.from('mentor_applications').update({ status: 'approved', user_id: createdUserId }).eq('id', applicationId);
    if (updErr) throw updErr;

    // status history
    // status history
    await admin.from('mentor_application_status_history').insert([{ application_id: applicationId, new_status: 'approved', changed_by: null, notes: interviewerNotes ?? 'Approved by admin' }]);

    // audit log
    await admin.from('audit_logs').insert([{ actor_id: null, scope: 'mentor_applications', action: 'approve', details: { application_id: applicationId } }]);

    // notify applicant
    if (createdUserId) {
      await admin.from('notifications').insert([{ user_id: createdUserId, type: 'application_approved', payload: { application_id: applicationId, tempPassword } }]);
    }

    return new Response(JSON.stringify({ userId: createdUserId, tempPassword }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
}
