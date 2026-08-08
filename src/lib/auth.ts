export type AppRole = "student" | "mentor" | "admin" | "mentor_pending";

export const appRolePriority: AppRole[] = ["admin", "mentor", "mentor_pending", "student"];

export function getActiveRole(roles: AppRole[]): AppRole | null {
  const uniqueRoles = Array.from(new Set(roles));
  return (
    uniqueRoles.sort((a, b) => appRolePriority.indexOf(a) - appRolePriority.indexOf(b))[0] ?? null
  );
}

export function getDashboardRoute(
  role: AppRole | null,
): "/admin/dashboard" | "/mentor/dashboard" | "/mentor/pending" | "/student/dashboard" {
  if (role === "admin") return "/admin/dashboard";
  if (role === "mentor") return "/mentor/dashboard";
  if (role === "mentor_pending") return "/mentor/pending";
  return "/student/dashboard";
}

export function getOnboardingRoute(): "/onboarding" {
  return "/onboarding";
}

export function shouldRedirectToOnboarding(roles: AppRole[], onboarded: boolean): boolean {
  // Mentors should NOT be redirected to student onboarding.
  // Mentors are approved by admin and their profile is auto-created from application data.
  if (roles.includes("mentor_pending") || roles.includes("mentor")) return false;
  return roles.length === 0 || !onboarded;
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
