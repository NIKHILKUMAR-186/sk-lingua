import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getDashboardRoute,
  getActiveRole,
  waitForSessionRestored,
  type AppRole,
} from "@/lib/auth";
import { getIntendedRole, clearIntendedRole } from "@/lib/google-auth";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Restoring your session...");

  useEffect(() => {
    let cancelled = false;

    async function completeOAuthFlow() {
      try {
        // ── Defensive diagnostics (never log tokens/passwords/codes) ──────────
        const params = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = params.get("code");
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const hasCode = Boolean(code);
        const hasTokens = Boolean(accessToken && refreshToken);

        console.log("[OAuth callback] reached", {
          origin: window.location.origin,
          path: window.location.pathname,
          hasCode,
          hasTokens,
          codeLength: code?.length ?? 0,
        });

        // ── Exchange the OAuth code (PKCE / code flow) or restore tokens ──────
        if (hasCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(code!);
          if (error) throw error;
          console.log("[OAuth callback] code exchanged for session");
        } else if (hasTokens) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken!,
            refresh_token: refreshToken!,
          });
          if (error) throw error;
          console.log("[OAuth callback] session set from tokens");
        }

        // ── Wait for the session to be fully restored before deciding ANYTHING ─
        setStatus("Waiting for authentication state...");
        const user = await waitForSessionRestored(9000, 250);
        if (!user) {
          throw new Error("No authenticated user returned after OAuth callback.");
        }
        console.log("[OAuth callback] authenticated user", user.id);

        // ── Determine new vs existing user ─────────────────────────────────────
        const intendedRole = getIntendedRole();
        const { data: existingRoles, error: rolesCheckError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const hasExistingRoles = (existingRoles ?? []).length > 0;
        console.log("[OAuth callback] existingRoles", existingRoles, "intended", intendedRole);

        // ── New Google user + intended role → create profile/role (idempotent) ─
        if (!hasExistingRoles && intendedRole) {
          console.log(`[OAuth callback] new Google user with intended role: ${intendedRole}`);

          const roleToAssign: AppRole =
            intendedRole === "mentor" ? "mentor_pending" : "student";

          // Idempotent upsert so we never create duplicates and never overwrite
          // an existing role if a concurrent DB trigger already created it.
          // Cast to a loose client because the generated Supabase types are stale and
          // omit the mentor_pending enum value added by a newer DB migration (same
          // workaround used in mentor-signup.tsx).
          const { error: roleError } = await (supabase as any)
            .from("user_roles")
            .upsert(
              { user_id: user.id, role: roleToAssign },
              { onConflict: "user_id,role" },
            );
          if (roleError) {
            console.error("[OAuth callback] failed to create role:", roleError);
          } else {
            console.log(`[OAuth callback] created role: ${roleToAssign}`);

            if (intendedRole === "mentor") {
              const { error: mentorProfileError } = await supabase
                .from("mentor_profiles")
                .upsert(
                  {
                    user_id: user.id,
                    headline: "",
                    bio: "",
                    languages_taught: [],
                    certifications: [],
                    hourly_rate: 0,
                    years_experience: 0,
                    is_active: false,
                  },
                  { onConflict: "user_id" },
                );
              if (mentorProfileError) {
                console.error("[OAuth callback] mentor profile creation failed", mentorProfileError);
              }
            }
          }

          // Create the base profile from Google data (never overwrite existing).
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: user.id,
                full_name:
                  user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  user.email?.split("@")[0] ||
                  "User",
                email: user.email,
                avatar_url: user.user_metadata?.avatar_url || null,
              },
              { onConflict: "id" },
            );
          if (profileError) {
            console.error("[OAuth callback] profile creation failed", profileError);
          }
        }
        // NOTE: If `hasExistingRoles` is true, we deliberately do NOT touch roles —
        // the database is the source of truth and existing student/mentor/admin roles
        // must be preserved.

        // ── Clear intended role now that it has been consumed ─────────────────
        clearIntendedRole();

        // ── Resolve final destination exactly once ────────────────────────────
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (rolesError) {
          console.error("[OAuth callback] redirect lookup failed", rolesError);
        }

        const fetchedRoles = (roles ?? []).map((roleRow) => roleRow.role as AppRole);
        const isNewStudent = !hasExistingRoles && fetchedRoles.includes("student");
        const destination = isNewStudent
          ? "/student/demo-session"
          : getDashboardRoute(getActiveRole(fetchedRoles));
        console.log("[OAuth callback] final destination", { fetchedRoles, isNewStudent, destination });

        if (!cancelled) {
          await navigate({ to: destination });
        }
      } catch (error) {
        console.error("[OAuth callback] failed", error);
        clearIntendedRole();
        if (!cancelled) {
          setStatus("Authentication could not be restored. Please try again.");
          await navigate({ to: "/auth" });
        }
      }
    }

    void completeOAuthFlow();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{status}</p>
      </div>
    </div>
  );
}
