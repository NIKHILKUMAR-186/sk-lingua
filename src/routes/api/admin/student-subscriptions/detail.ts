import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/student-subscriptions/detail?studentId=<id>&subscriptionId=<id>
// Returns the selected student (full admin-manageable profile), their CURRENT
// subscription (active + unexpired — matching the student side), the immutable
// session ledger (subscription_slot_adjustments), full subscription history,
// payment history, and recent sessions.
export const Route = createFileRoute("/api/admin/student-subscriptions/detail")({
  server: {
    handlers: {
      GET: async ({ request }) => {

        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;

          const admin = supabaseAdmin as any;
          const url = new URL(request.url);
          const studentId = url.searchParams.get("studentId");
          const subscriptionId = url.searchParams.get("subscriptionId");

          if (!studentId) {
            return new Response(
              JSON.stringify({ success: false, error: "Missing studentId" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // Role is the source of truth — a "student detail" must be a student.
          const { data: roleRows, error: roleErr } = await admin
            .from("user_roles")
            .select("user_id")
            .eq("user_id", studentId)
            .eq("role", "student");
          if (roleErr) throw roleErr;
          if (!roleRows || roleRows.length === 0) {
            return new Response(
              JSON.stringify({ success: false, error: "Student not found" }),
              { status: 404, headers: { "Content-Type": "application/json" } },
            );
          }

          // Full admin-manageable profile.
          const { data: student, error: studentError } = await admin
            .from("profiles")
            .select(
              "id, full_name, email, reference_no, avatar_url, country, state, city, bio, onboarded, phone_number, native_language, target_language, current_level, learning_goal, learning_level, learning_goals, interests, timezone, created_at, updated_at",
            )
            .eq("id", studentId)
            .single();
          if (studentError || !student) {
            return new Response(
              JSON.stringify({ success: false, error: "Student not found" }),
              { status: 404, headers: { "Content-Type": "application/json" } },
            );
          }

          // All subscriptions (history) for this student, newest first.
          const { data: history, error: historyError } = await admin
            .from("student_subscriptions")
            .select("*, plan:subscription_plans(name, price, currency, num_sessions, billing_cycle, validity_days)")
            .eq("user_id", studentId)
            .order("created_at", { ascending: false });
          if (historyError) throw historyError;

          const list = history || [];

          // Prefer the student-side rule: an ACTIVE and unexpired subscription.
          const usable = (s: any) =>
            s && s.status === "active" && (!s.expires_at || new Date(s.expires_at).getTime() > Date.now());
          let selected =
            (subscriptionId && list.find((s: any) => s.id === subscriptionId)) ||
            list.find(usable) ||
            list[0] ||
            null;

          // Immutable audit ledger for the selected subscription.
          let adjustments: any[] = [];
          if (selected) {
            const { data: adj, error: adjError } = await admin
              .from("subscription_slot_adjustments")
              .select("*")
              .eq("subscription_id", selected.id)
              .order("created_at", { ascending: false })
              .limit(200);
            if (adjError) throw adjError;
            adjustments = adj || [];
          }

          // Payments associated with this student.
          const { data: payments, error: payError } = await admin
            .from("payment_orders")
            .select("*")
            .eq("user_id", studentId)
            .order("created_at", { ascending: false })
            .limit(100);
          if (payError && !payError.message?.includes("does not exist")) throw payError;

          // Recent sessions (activity) for this student.
          const { data: sessions, error: sessError } = await admin
            .from("sessions")
            .select(
              "id, mentor_id, scheduled_time, duration_mins, status, notes, created_at, updated_at",
            )
            .eq("student_id", studentId)
            .order("updated_at", { ascending: false })
            .limit(50);
          if (sessError && !sessError.message?.includes("does not exist")) throw sessError;

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                student,
                subscription: selected,
                history: list,
                adjustments,
                payments: payments || [],
                sessions: sessions || [],
              },
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (err: any) {
          console.error("Subscription detail error:", err);
          return new Response(
            JSON.stringify({ success: false, error: "Unable to load student data. Please try again." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

      },
    },
  },
});
