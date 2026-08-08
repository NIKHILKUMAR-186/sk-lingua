import { RouteGuard } from "@/components/route-guards";
import { AppShell } from "@/components/app-shell";

/**
 * Mentor Layout
 * Protects all mentor routes and provides mentor-specific navigation.
 * Allows both approved mentors and pending mentors who are completing
 * their application.
 */
export function MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={["mentor", "mentor_pending"]}>
      <AppShell variant="mentor">{children}</AppShell>
    </RouteGuard>
  );
}