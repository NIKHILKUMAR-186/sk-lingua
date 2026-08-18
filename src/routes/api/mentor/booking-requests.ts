import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// GET /api/mentor/booking-requests
export const Route = createFileRoute("/api/mentor/booking-requests")({
  server: {
    handlers: {
      GET: async ({ request }) => {

        try {
          const url = new URL(request.url);
          const status = url.searchParams.get("status") || "pending";

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }

          const { data: requests, error } = await (supabase as any)
            .from("mentor_session_requests")
            .select("*")
            .eq("mentor_id", user.id)
            .eq("status", status)
            .order("created_at", { ascending: true });

          if (error) throw error;

          return new Response(JSON.stringify({ success: true, requests: requests ?? [] }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
        }

      },
    },
  },
});
