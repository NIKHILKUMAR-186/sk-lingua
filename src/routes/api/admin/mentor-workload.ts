import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

export type MentorWorkload = {
  user_id: string;
  full_name: string;
  status: "light" | "balanced" | "busy" | "overloaded";
  todayCount: number;
  weekCount: number;
  pendingRequests: number;
  details: string[];
};

// GET /api/admin/mentor-workload?mentorId=<uuid>
// Returns workload for a single mentor, or all mentors if no mentorId provided.
export const Route = createFileRoute("/api/admin/mentor-workload")({
  server: {
    handlers: {
      GET: async ({ request }) => {

        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;

          const url = new URL(request.url);
          const mentorId = url.searchParams.get("mentorId");

          const admin = supabaseAdmin as any;

          let targetIds: string[] = [];
          if (mentorId) {
            targetIds = [mentorId];
          } else {
            const { data: roles } = await admin
              .from("user_roles")
              .select("user_id")
              .eq("role", "mentor");
            targetIds = (roles ?? []).map((r: any) => r.user_id);
          }

          if (targetIds.length === 0) {
            return new Response(JSON.stringify({ success: true, workloads: [] }), {
              headers: { "Content-Type": "application/json" } });
          }

          const now = new Date();
          const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

          const { data: profiles } = await admin
            .from("profiles")
            .select("id, full_name")
            .in("id", targetIds);

          const nameMap = new Map<string, string>((profiles ?? []).map((p: any) => [String(p.id), String(p.full_name || "Unknown")]));

          const { data: todaySessions } = await admin
            .from("sessions")
            .select("mentor_id, scheduled_time, duration_mins, status")
            .in("mentor_id", targetIds)
            .gte("scheduled_time", dayStart)
            .lt("scheduled_time", dayEnd)
            .in("status", ["confirmed", "in_progress", "pending_mentor_response"]);

          const { data: weekSessions } = await admin
            .from("sessions")
            .select("mentor_id, scheduled_time")
            .in("mentor_id", targetIds)
            .gte("scheduled_time", now.toISOString())
            .lt("scheduled_time", weekEnd.toISOString())
            .in("status", ["confirmed", "in_progress", "pending_mentor_response"]);

          const { data: pendingReqs } = await admin
            .from("mentor_session_requests")
            .select("mentor_id, status")
            .in("mentor_id", targetIds)
            .eq("status", "pending");

          const todayByMentor = new Map<string, number>();
          for (const s of todaySessions ?? []) {
            todayByMentor.set(s.mentor_id, (todayByMentor.get(s.mentor_id) || 0) + 1);
          }

          const weekByMentor = new Map<string, number>();
          for (const s of weekSessions ?? []) {
            weekByMentor.set(s.mentor_id, (weekByMentor.get(s.mentor_id) || 0) + 1);
          }

          const pendingByMentor = new Map<string, number>();
          for (const r of pendingReqs ?? []) {
            pendingByMentor.set(r.mentor_id, (pendingByMentor.get(r.mentor_id) || 0) + 1);
          }

          const workloads: MentorWorkload[] = targetIds.map((uid) => {
            const today = todayByMentor.get(uid) || 0;
            const week = weekByMentor.get(uid) || 0;
            const pending = pendingByMentor.get(uid) || 0;
            const details: string[] = [];
            if (today >= 6) details.push("Overloaded today");
            else if (today >= 4) details.push("Busy today");
            else if (today === 0) details.push("No sessions today");
            else details.push("Light today");
            if (pending > 0) details.push(`${pending} pending request${pending !== 1 ? "s" : ""}`);
            if (week > 15) details.push("High weekly load");

            let status: MentorWorkload["status"] = "light";
            if (today >= 6 || week > 15) status = "overloaded";
            else if (today >= 4 || week > 10) status = "busy";
            else if (today >= 2 || week > 5) status = "balanced";

            return {
              user_id: uid,
              full_name: nameMap.get(uid) || "Unknown",
              status,
              todayCount: today,
              weekCount: week,
              pendingRequests: pending,
              details,
            };
          });

          return new Response(
            JSON.stringify({ success: true, workloads }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          console.error("Mentor workload error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" } },
          );
        }

      },
    },
  },
});
