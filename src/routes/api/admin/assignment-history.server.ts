import { supabase } from "@/integrations/supabase/client";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestId = url.searchParams.get("request_id");

    let query = (supabase as any)
      .from("assignment_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (requestId) {
      query = query.eq("request_id", requestId);
    }

    const { data, error } = await query.limit(100);
    if (error) throw error;

    return new Response(JSON.stringify({ history: data ?? [] }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
