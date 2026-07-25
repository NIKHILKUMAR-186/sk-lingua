import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Restoring your session...");

  useEffect(() => {
    let cancelled = false;

    async function waitForSession(maxWaitMs = 4000) {
      const start = Date.now();
      while (!cancelled && Date.now() - start < maxWaitMs) {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session) return session;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      return null;
    }

    async function completeOAuthFlow() {
      try {
        const params = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = params.get("code");
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        setStatus("Waiting for authentication state...");
        const session = await waitForSession();
        if (!session) throw new Error("No session restored after OAuth callback.");

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("No authenticated user returned after OAuth callback.");

        const [{ data: roles, error: rolesError }, { data: profile, error: profileError }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle(),
        ]);

        if (rolesError || profileError) {
          console.error("OAuth redirect lookup failed", { rolesError, profileError });
        }

        const fetchedRoles = (roles ?? []).map((roleRow) => roleRow.role as AppRole);
        const hasRole = fetchedRoles.length > 0;
        const onboarded = Boolean(profile?.onboarded);
        const activeRole = fetchedRoles.includes("mentor") ? "mentor" : "student";

        const redirectTo = hasRole && onboarded
          ? activeRole === "mentor"
            ? "/mentor/dashboard"
            : "/student/dashboard"
          : "/onboarding";

        if (!cancelled) {
          await navigate({ to: redirectTo as "/onboarding" | "/mentor/dashboard" | "/student/dashboard" });
        }
      } catch (error) {
        console.error("OAuth callback failed", error);
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
