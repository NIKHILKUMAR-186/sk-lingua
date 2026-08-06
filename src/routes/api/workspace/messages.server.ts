import { supabase } from "@/integrations/supabase/client";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspace_id");
    if (!workspaceId) return new Response("missing workspace_id", { status: 400 });

    const { data, error } = await (supabase as any)
      .from("workspace_messages")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;

    return new Response(JSON.stringify({ messages: data ?? [] }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
