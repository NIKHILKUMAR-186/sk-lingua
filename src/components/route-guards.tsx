import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { 
  hasRole, 
  hasAnyRole, 
  getRoleDashboardRoute,
  getOnboardingRoute 
} from "@/lib/authorization";
import { shouldRedirectToOnboarding } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

/**
 * Route Guard Types
 */
export type AllowedRoles = "admin" | "mentor" | "student" | "all" | "authenticated";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: AllowedRoles[];
  requireOnboarded?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Generic Route Guard Component
 * Protects routes based on user roles and onboarding status
 */
export function RouteGuard({
  children,
  allowedRoles = ["all"],
  requireOnboarded = true,
  fallback,
}: RouteGuardProps) {
  const navigate = useNavigate();
  const { data: auth, isLoading, error } = useAuth();

  useEffect(() => {
    if (isLoading || error) return;

    // Not authenticated - redirect to auth
    if (!auth?.user) {
      navigate({ to: "/auth" });
      return;
    }

    // Check role authorization
    if (allowedRoles.length > 0 && !allowedRoles.includes("all")) {
      const hasAccess = allowedRoles.some(role => {
        if (role === "authenticated") return true;
        return hasRole(auth.roles, role);
      });

      if (!hasAccess) {
        // Redirect to user's dashboard
        const dashboardRoute = getRoleDashboardRoute(auth.activeRole);
        navigate({ to: dashboardRoute });
        return;
      }
    }

    // Check onboarding status
    if (requireOnboarded && shouldRedirectToOnboarding(auth.roles, auth.profile?.onboarded ?? false)) {
      navigate({ to: "/onboarding" });
      return;
    }
  }, [auth, isLoading, error, allowedRoles, requireOnboarded, navigate]);

  // Loading state
  if (isLoading) {
    return fallback ?? (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Error state
  if (error || !auth?.user) {
    return fallback ?? (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-destructive">Authentication error</div>
      </div>
    );
  }

  // Check role authorization (render-time check for safety)
  if (allowedRoles.length > 0 && !allowedRoles.includes("all")) {
    const hasAccess = allowedRoles.some(role => {
      if (role === "authenticated") return true;
      return hasRole(auth.roles, role);
    });

    if (!hasAccess) {
      return fallback ?? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-sm text-destructive">Access denied</div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

/**
 * Admin-only Route Guard
 */
export function AdminGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={["admin"]} fallback={fallback}>
      {children}
    </RouteGuard>
  );
}

/**
 * Mentor-only Route Guard
 */
export function MentorGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={["mentor"]} fallback={fallback}>
      {children}
    </RouteGuard>
  );
}

/**
 * Student-only Route Guard
 */
export function StudentGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={["student"]} fallback={fallback}>
      {children}
    </RouteGuard>
  );
}

/**
 * Admin or Mentor Route Guard
 */
export function AdminOrMentorGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={["admin", "mentor"]} fallback={fallback}>
      {children}
    </RouteGuard>
  );
}