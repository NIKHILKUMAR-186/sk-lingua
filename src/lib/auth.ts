export type AppRole = "student" | "mentor" | "admin";

export const appRolePriority: AppRole[] = ["admin", "mentor", "student"];

export function getActiveRole(roles: AppRole[]): AppRole | null {
  const uniqueRoles = Array.from(new Set(roles));
  return uniqueRoles.sort((a, b) => appRolePriority.indexOf(a) - appRolePriority.indexOf(b))[0] ?? null;
}

export function getDashboardRoute(role: AppRole | null): "/mentor/dashboard" | "/student/dashboard" {
  return role === "mentor" ? "/mentor/dashboard" : "/student/dashboard";
}

export function getOnboardingRoute(): "/onboarding" {
  return "/onboarding";
}

export function shouldRedirectToOnboarding(roles: AppRole[], onboarded: boolean): boolean {
  return roles.length === 0 || !onboarded;
}
