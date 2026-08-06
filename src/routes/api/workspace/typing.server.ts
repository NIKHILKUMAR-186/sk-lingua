import { supabase } from "@/integrations/supabase/client";

export async function POST(req: Request) {
  try {
    const { workspace_id, user_id, is_typing } = await req.json();
    if (!workspace_id || !user_id) return new Response("missing params", { status: 400 });

    // Verify user is a workspace member
    const { data: member } = await (supabase as any)
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id)
      .maybeSingle();
    if (!member)
      return new Response(JSON.stringify({ error: "not a workspace member" }), { status: 403 });

    // Store typing state in workspace_messages metadata (or use a lightweight approach)
    // We'll use a simple approach: insert a typing event into workspace_messages with metadata
    const { data, error } = await (supabase as any)
      .from("workspace_messages")
      .insert([
        {
          workspace_id,
          sender_id: user_id,
          body: "",
          metadata: { type: "typing", is_typing: !!is_typing, at: new Date().toISOString() },
        },
      ])
      .select("*")
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, event: data }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
