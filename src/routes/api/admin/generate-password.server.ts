import { supabaseAdmin } from "@/integrations/supabase/client.server";

function generateTempPassword() { return require('crypto').randomBytes(10).toString('hex'); }

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { userId } = body;
    if (!userId) return new Response(JSON.stringify({ error: 'missing userId' }), { status: 400 });

    const temp = generateTempPassword();
    const admin = supabaseAdmin as any;
    const { data, error } = await admin.auth.admin.updateUserById(userId, { password: temp });
    if (error) throw error;

    await admin.from('audit_logs').insert([{ actor_id: null, scope: 'user_accounts', action: 'generate_temp_password', details: { user_id: userId } }]);

    return new Response(JSON.stringify({ tempPassword: temp }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
}
