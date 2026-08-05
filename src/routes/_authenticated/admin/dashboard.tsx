import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: auth } = useAuth();

  if (!auth?.user) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!(auth.roles ?? []).includes("admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Access denied — admin role required.</p>
      </div>
    );
  }

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-3xl font-display">Admin dashboard</h1>
        <div className="space-y-4">
          <Link to="/admin/mentor-applications" className="text-primary underline">
            Review mentor applications
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
