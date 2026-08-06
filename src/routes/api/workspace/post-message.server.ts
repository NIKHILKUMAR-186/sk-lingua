import { supabase } from "@/integrations/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workspace_id, sender_id, body: text, metadata } = body;
    if (!workspace_id || !sender_id || !text)
      return new Response("missing params", { status: 400 });

    // Verify sender is a workspace member
    const { data: member } = await (supabase as any)
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", sender_id)
      .maybeSingle();
    if (!member)
      return new Response(JSON.stringify({ error: "not a workspace member" }), { status: 403 });

    const { data, error } = await (supabase as any)
      .from("workspace_messages")
      .insert([{ workspace_id, sender_id, body: text, metadata }])
      .select("*")
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, message: data }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
