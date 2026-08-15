export type AppRole = "student" | "mentor" | "admin" | "mentor_pending";

export type AuthDestination =
  | "/admin/dashboard"
  | "/mentor/dashboard"
  | "/mentor/pending"
  | "/student/dashboard"
  | "/student/demo-session";

export type ProfileRow = {
  onboarded: boolean;
};

export const appRolePriority: AppRole[] = ["admin", "mentor", "mentor_pending", "student"];

export function getActiveRole(roles: AppRole[]): AppRole | null {
  const uniqueRoles = Array.from(new Set(roles));
  return (
    uniqueRoles.sort((a, b) => appRolePriority.indexOf(a) - appRolePriority.indexOf(b))[0] ?? null
  );
}

export function getDashboardRoute(role: AppRole | null): AuthDestination {
  if (role === "admin") return "/admin/dashboard";
  if (role === "mentor") return "/mentor/dashboard";
  if (role === "mentor_pending") return "/mentor/pending";
  return "/student/dashboard";
}

/**
 * Resolve the correct post-authentication destination.
 *
 * P1: onboarding is no longer mandatory. All students go to their dashboard.
 */
export function resolveDestination(roles: AppRole[]): AuthDestination {
  return getDashboardRoute(getActiveRole(roles));
}

/**
 * Format a profile's reference_no into a professional human-readable user ID,
 * e.g. USER-000001. Returns null when reference_no is not yet available
 * (e.g. before the migration has backfilled the column).
 */
export function formatUserReferenceNo(referenceNo: number | null | undefined): string | null {
  if (referenceNo === null || referenceNo === undefined) return null;
  return `USER-${String(referenceNo).padStart(6, "0")}`;
}

/**
 * Waits for Supabase to restore/exchange an OAuth session without treating the
 * in-progress restoration as a logged-out state.
 *
 * - First reads the persisted session from storage (fast path).
 * - Confirms the session is still valid via getUser() (network round-trip).
 * - Polls until a valid session is found or the fallback window expires.
 *
 * @param maxWaitMs maximum time to wait for session restoration (default 9000ms)
 * @param intervalMs polling interval (default 250ms)
 * @returns the active Supabase User, or null if none could be established in time
 */
export async function waitForSessionRestored(
  maxWaitMs = 9000,
  intervalMs = 250,
): Promise<import("@supabase/supabase-js").User | null> {
  const { supabase } = await import("@/integrations/supabase/client");
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    // Fast path: read the persisted session out of storage.
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!sessionError && session?.access_token) {
      // Network round-trip to confirm the token is still valid server-side.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (!userError && user) return user;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null;
}
