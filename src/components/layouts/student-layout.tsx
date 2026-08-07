import { StudentGuard } from "@/components/route-guards";
import { AppShell } from "@/components/app-shell";

/**
 * Student Layout
 * Protects all student routes and provides student-specific navigation
 */
export function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudentGuard>
      <AppShell variant="student">
        {children}
      </AppShell>
    </StudentGuard>
  );
}
