import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/api/homework/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
      
        try {
          const body = await request.json();
          const { workspace_id, title, description, due_at, created_by } = body;
          if (!workspace_id || !created_by) return new Response("missing params", { status: 400 });
      
          const { data, error } = await (supabase as any)
            .from("homework")
            .insert([{ workspace_id, title, description, due_at, created_by }])
            .select("*")
            .single();
          if (error) throw error;
          return new Response(JSON.stringify({ ok: true, homework: data }), { status: 200 });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
        }

      },
    },
  },
});
