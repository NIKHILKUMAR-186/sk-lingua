import type { AppRole } from "./auth";

/**
 * Authorization utilities for RBAC
 * Centralized role checking to prevent authorization bypass
 */

export function hasRole(userRoles: AppRole[] | undefined, requiredRole: AppRole): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.includes(requiredRole);
}

export function hasAnyRole(userRoles: AppRole[] | undefined, requiredRoles: AppRole[]): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return requiredRoles.some(role => userRoles.includes(role));
}

export function hasAllRoles(userRoles: AppRole[] | undefined, requiredRoles: AppRole[]): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return requiredRoles.every(role => userRoles.includes(role));
}

export function isAdmin(userRoles: AppRole[] | undefined): boolean {
  return hasRole(userRoles, "admin");
}

export function isMentor(userRoles: AppRole[] | undefined): boolean {
  return hasRole(userRoles, "mentor");
}

export function isStudent(userRoles: AppRole[] | undefined): boolean {
  return hasRole(userRoles, "student");
}

export function requireRole(userRoles: AppRole[] | undefined, requiredRole: AppRole): void {
  if (!hasRole(userRoles, requiredRole)) {
    throw new Error(`Access denied. Required role: ${requiredRole}`);
  }
}

export function requireAnyRole(userRoles: AppRole[] | undefined, requiredRoles: AppRole[]): void {
  if (!hasAnyRole(userRoles, requiredRoles)) {
    throw new Error(`Access denied. Required one of roles: ${requiredRoles.join(", ")}`);
  }
}

export function getRoleDisplayName(role: AppRole): string {
  const names: Record<AppRole, string> = {
    admin: "Administrator",
    mentor: "Mentor",
    student: "Student",
  };
  return names[role] || role;
}

export function getRoleDashboardRoute(role: AppRole | null): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "mentor") return "/mentor/dashboard";
  return "/student/dashboard";
}