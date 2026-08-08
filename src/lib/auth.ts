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
  // mentor_pending users should NOT be redirected to student onboarding
  if (roles.includes("mentor_pending")) return false;
  return roles.length === 0 || !onboarded;
}