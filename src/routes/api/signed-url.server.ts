import { getSignedUrlForPath } from "@/integrations/supabase/signedUrl.server";
import { createClient } from "@supabase/supabase-js";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return new Response(JSON.stringify({ error: "missing key" }), { status: 400 });

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  const token = authHeader.replace('Bearer ', '');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return new Response(JSON.stringify({ error: 'server config' }), { status: 500 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false }
  });

  // verify token and user
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims || !claimsData.claims.sub) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  const userId = claimsData.claims.sub;

  // find application by path or url
  const { data: apps } = await supabase.from('mentor_applications').select('id,user_id').or(`resume_path.eq.${key},resume_url.eq.${key}`).limit(1).maybeSingle();
  const app = apps ?? null;

  // check ownership or admin role
  let allowed = false;
  if (app && app.user_id && app.user_id === userId) allowed = true;

  if (!allowed) {
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    const isAdmin = (roles ?? []).some((r:any) => r.role === 'admin');
    if (isAdmin) allowed = true;
  }

  if (!allowed) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

  try {
    const signedUrl = await getSignedUrlForPath(key);
    return new Response(JSON.stringify({ signedUrl }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
}
