import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface RequestBody {
  mentorId?: string;
  isActive?: boolean | null;
  status?: string | null;
  isVerified?: boolean | null;
  adminNotes?: string | null;
}

const ALLOWED_STATUS = new Set(["pending", "approved", "rejected", "suspended"]);
export const Route = createFileRoute("/api/admin/mentors/set-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {

        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;

          const body: RequestBody = await request.json();
          const { mentorId, isActive, status: desiredStatus, isVerified, adminNotes } = body;

          if (!mentorId) {
            return json({ success: false, error: "Missing required field: mentorId" }, 400);
          }

          const hasChange =
            isActive !== undefined || desiredStatus !== undefined || isVerified !== undefined;
          if (!hasChange) {
            return json(
              { success: false, error: "No update fields provided (is_active, status, is_verified)" },
              400,
            );
          }

          if (
            desiredStatus !== undefined &&
            desiredStatus !== null &&
            !ALLOWED_STATUS.has(desiredStatus)
          ) {
            return json(
              {
                success: false,
                error: `Invalid status. Must be one of: ${[...ALLOWED_STATUS].join(", ")}`,
              },
              400,
            );
          }

          const admin = supabaseAdmin as any;

          const { data: existing, error: existingError } = await admin
            .from("mentor_profiles")
            .select("user_id, is_active, is_verified, status")
            .eq("user_id", mentorId)
            .maybeSingle();

          if (existingError || !existing) {
            return json({ success: false, error: "Mentor not found" }, 404);
          }

          const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
          const changes: Record<string, unknown> = {};
          if (isActive !== undefined && isActive !== null) {
            patch.is_active = isActive;
            changes.is_active = { from: existing.is_active, to: isActive };
          }
          if (isVerified !== undefined && isVerified !== null) {
            patch.is_verified = isVerified;
            changes.is_verified = { from: existing.is_verified, to: isVerified };
          }
          if (desiredStatus !== undefined && desiredStatus !== null) {
            patch.status = desiredStatus;
            changes.status = { from: existing.status, to: desiredStatus };
          }

          const { data: updated, error: updateError } = await admin
            .from("mentor_profiles")
            .update(patch)
            .eq("user_id", mentorId)
            .select("*")
            .single();

          if (updateError) throw updateError;

          const actionLabel =
            desiredStatus === "suspended" || (isActive === false && !desiredStatus)
              ? "suspend_mentor"
              : isActive === true
                ? "activate_mentor"
                : desiredStatus === "approved" || desiredStatus === "pending"
                  ? "set_mentor_status"
                  : "update_mentor_status";

          await admin.from("audit_logs").insert({
            actor_id: authResult.userId,
            target_entity: "mentor",
            target_id: mentorId,
            action: actionLabel,
            description: `Mentor status updated`,
            details: { changes, admin_notes: adminNotes ?? null },
          });

          return json({
            success: true,
            data: {
              user_id: updated.user_id,
              is_active: updated.is_active,
              is_verified: updated.is_verified,
              status: updated.status,
            },
            message: "Mentor status updated",
          });
        } catch (err: any) {
          console.error("[admin/mentors/set-status] error:", err);
          return json({ success: false, error: err.message || "Failed to update mentor status." }, 500);
        }

      },
    },
  },
});
