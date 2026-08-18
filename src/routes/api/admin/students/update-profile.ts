import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

/**
 * PUT /api/admin/students/update-profile
 *
 * Admin-editable student profile fields. Body: { studentId, updates }.
 * Includes a server-side whitelist so an admin can never overwrite email or
 * any field outside the accepted set. Authorization is enforced server-side
 * via requireAdminAuth() and the service role.
 */

const ALLOWED_FIELDS = [
  "full_name",
  "avatar_url",
  "bio",
  "native_language",
  "target_language",
  "current_level",
  "learning_goal",
  "learning_level",
  "learning_goals",
  "interests",
  "country",
  "state",
  "city",
  "phone_number",
  "timezone",
] as const;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
export const Route = createFileRoute("/api/admin/students/update-profile")({
  server: {
    handlers: {
      PUT: async ({ request }) => {

        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;

          const body = await request.json();
          const studentId: string | undefined = body?.studentId;
          const updates: Record<string, unknown> = body?.updates ?? {};

          if (!studentId) {
            return json({ success: false, error: "Missing studentId" }, 400);
          }

          const admin = supabaseAdmin as any;

          // Ensure the target is actually a student (role = source of truth).
          const { data: roleRows, error: roleErr } = await admin
            .from("user_roles")
            .select("user_id")
            .eq("user_id", studentId)
            .eq("role", "student");
          if (roleErr) throw roleErr;
          if (!roleRows || roleRows.length === 0) {
            return json({ success: false, error: "Student not found" }, 404);
          }

          // Whitelist + strip unknown / empty values.
          const patch: Record<string, unknown> = {};
          for (const key of ALLOWED_FIELDS) {
            if (key in updates) {
              const v = updates[key];
              patch[key] = v === "" ? null : v;
            }
          }
          if (Object.keys(patch).length === 0) {
            return json({ success: false, error: "No editable fields provided" }, 400);
          }

          const { data: student, error: updateErr } = await admin
            .from("profiles")
            .update(patch)
            .eq("id", studentId)
            .select(
              "id, full_name, email, reference_no, avatar_url, country, state, city, bio, onboarded, phone_number, native_language, current_level, learning_goal, learning_level, learning_goals, interests, timezone, created_at, updated_at",
            )
            .single();
          if (updateErr) throw updateErr;

          return json({ success: true, message: "Student profile updated", data: student });
        } catch (err: any) {
          console.error("[admin/students/update-profile] error:", err);
          return json({ success: false, error: "Unable to update student profile. Please try again." }, 500);
        }

      },
    },
  },
});
