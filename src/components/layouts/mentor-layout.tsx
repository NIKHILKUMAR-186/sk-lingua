import { MentorGuard } from "@/components/route-guards";
import { AppShell } from "@/components/app-shell";

/**
 * Mentor Layout
 * Protects all mentor routes and provides mentor-specific navigation
 */
export function MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <MentorGuard>
      <AppShell variant="mentor">
        {children}
      </AppShell>
    </MentorGuard>
  );
}
