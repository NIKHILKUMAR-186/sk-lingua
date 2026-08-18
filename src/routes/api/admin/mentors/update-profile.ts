import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ALLOWED_FIELDS = new Set([
  "headline", "bio", "years_experience", "teaching_style",
  "availability_preview", "is_verified", "is_active",
  "languages_taught", "certifications", "education",
  "education_json", "experience", "availability",
  "intro_video_url", "demo_lesson_url", "cover_url",
  "timezone", "response_rate", "completion_rate",
]);
export const Route = createFileRoute("/api/admin/mentors/update-profile")({
  server: {
    handlers: {
      PUT: async ({ request }) => {

        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;

          const body = await request.json();
          const { mentorId, updates } = body;

          if (!mentorId || typeof updates !== "object") {
            return json({ success: false, error: "Missing mentorId or updates" }, 400);
          }

          const admin = supabaseAdmin as any;

          const { data: existing, error: existingError } = await admin
            .from("mentor_profiles")
            .select("user_id")
            .eq("user_id", mentorId)
            .maybeSingle();

          if (existingError || !existing) {
            return json({ success: false, error: "Mentor not found" }, 404);
          }

          const patch: Record<string, any> = { updated_at: new Date().toISOString() };
          for (const [key, value] of Object.entries(updates)) {
            if (ALLOWED_FIELDS.has(key)) {
              patch[key] = value;
            }
          }

          const { data: updated, error: updateError } = await admin
            .from("mentor_profiles")
            .update(patch)
            .eq("user_id", mentorId)
            .select("*")
            .single();

          if (updateError) throw updateError;

          return json({ success: true, data: updated });
        } catch (err: any) {
          console.error("[admin/mentors/update-profile] error:", err);
          return json({ success: false, error: err.message || "Failed to update mentor profile." }, 500);
        }

      },
    },
  },
});
