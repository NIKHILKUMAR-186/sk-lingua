import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
        console.group("OAuth callback");
        console.log("Returned from Google", { href: window.location.href });

        const params = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = params.get("code");
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (code) {
          console.log("OAuth code detected; exchanging for session");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          console.log("exchangeCodeForSession result", { data, error });
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          console.log("OAuth tokens detected; restoring session");
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          console.log("setSession result", { data, error });
          if (error) throw error;
        }

        setStatus("Waiting for authentication state...");
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        console.log("Session restored", { session, error: sessionError });
        if (sessionError) throw sessionError;
        if (!session) throw new Error("No session restored after OAuth callback.");

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log("User fetched", { user, error: userError });
        if (userError) throw userError;
        if (!user) throw new Error("No authenticated user returned after OAuth callback.");

        const [{ data: roles, error: rolesError }, { data: profile, error: profileError }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle(),
        ]);

        console.log("Role/profile lookup", { roles, rolesError, profile, profileError });
        if (rolesError || profileError) {
          console.error("OAuth redirect lookup failed", { rolesError, profileError });
        }

        const hasRole = (roles?.length ?? 0) > 0;
        const onboarded = Boolean(profile?.onboarded);
        const role = roles?.[0]?.role;

        let redirectTo = "/onboarding";
        if (hasRole && onboarded) {
          redirectTo = role === "mentor" ? "/mentor/dashboard" : "/student/dashboard";
        }

        console.log("Redirect destination", { redirectTo, hasRole, onboarded, role });
        console.groupEnd();

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
