import { supabase } from "@/integrations/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { homework_id, student_id, content, files } = body;
    if (!homework_id || !student_id) return new Response("missing params", { status: 400 });

    const { data, error } = await (supabase as any)
      .from("homework_submissions")
      .insert([{ homework_id, student_id, content, files, status: "submitted" }])
      .select("*")
      .single();
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, submission: data }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
