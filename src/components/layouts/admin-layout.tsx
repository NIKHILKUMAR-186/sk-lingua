import { AdminGuard } from "@/components/route-guards";
import { AppShell } from "@/components/app-shell";

/**
 * Admin Layout
 * Protects all admin routes and provides admin-specific navigation
 */
export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AppShell variant="admin">
        {children}
      </AppShell>
    </AdminGuard>
  );
}
