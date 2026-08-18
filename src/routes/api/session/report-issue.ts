import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/api/session/report-issue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
      
        try {
          const body = await request.json();
          const { workspace_id, reporter_id, category, details } = body;
          if (!reporter_id || !category) return new Response("missing params", { status: 400 });
      
          const { data, error } = await (supabase as any)
            .from("reports")
            .insert({
              workspace_id,
              reporter_id,
              category,
              details,
              status: "open",
            })
            .select("*")
            .single();
          if (error) throw error;
      
          // Notify admins
          const { data: admins } = await (supabase as any)
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");
          for (const admin of admins ?? []) {
            await (supabase as any).from("notifications").insert([
              {
                user_id: admin.user_id,
                title: "Session issue reported",
                body: `A user reported an issue: ${category}`,
                link: "/admin/dashboard",
                category: "session",
                kind: "session_issue",
                related_id: data?.id,
              },
            ]);
          }
      
          return new Response(JSON.stringify({ ok: true, report: data }), { status: 200 });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
        }

      },
    },
  },
});
