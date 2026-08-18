import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Restore a subscription slot for a student (used when admin resolves an issue in student's favor)
export const Route = createFileRoute("/api/session/restore-slot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
      
        try {
          const { student_id, session_id, reason = "admin_resolution" } = await request.json();
          if (!student_id) return new Response("missing params", { status: 400 });
      
          // Restore slot by incrementing current_session_slots and decrementing used_session_slots
          const { data: sub, error: subErr } = await (supabase as any)
            .from("student_subscriptions")
            .select("*")
            .eq("user_id", student_id)
            .eq("status", "active")
            .maybeSingle();
          if (subErr) throw subErr;
          if (!sub)
            return new Response(JSON.stringify({ error: "no active subscription" }), { status: 400 });
      
          const { error: updateErr } = await (supabase as any)
            .from("student_subscriptions")
            .update({
              current_session_slots: (sub.current_session_slots ?? 0) + 1,
              used_session_slots: Math.max(0, (sub.used_session_slots ?? 0) - 1),
            })
            .eq("id", sub.id);
          if (updateErr) throw updateErr;
      
          // Record in subscription history
          await (supabase as any).from("subscription_history").insert([
            {
              user_id: student_id,
              subscription_id: sub.id,
              plan_id: sub.plan_id,
              event_type: "slot_restored",
              old_slots_remaining: sub.current_session_slots,
              new_slots_remaining: (sub.current_session_slots ?? 0) + 1,
              notes: reason,
            },
          ]);
      
          // Notify the student
          if (session_id) {
            await (supabase as any).from("notifications").insert([
              {
                user_id: student_id,
                title: "Session slot restored",
                body: "A session slot has been restored to your subscription.",
                link: "/student/subscriptions",
                category: "subscription",
                kind: "slot_restored",
                related_id: session_id,
              },
            ]);
          }
      
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
        }

      },
    },
  },
});
