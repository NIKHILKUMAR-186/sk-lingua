import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { getDashboardRoute } from "@/lib/auth";

export function StudentRouteGuard({ children }: { children: React.ReactNode }) {
  const { data: auth, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!auth?.user) return;

    const hasStudentRole = auth.roles.includes("student");
    if (!hasStudentRole) {
      navigate({ to: getDashboardRoute(auth.activeRole), replace: true });
    }
  }, [auth, isLoading, navigate]);

  if (isLoading || !auth?.user) {
    return <div className="min-h-screen flex items-center justify-center p-6">Loading...</div>;
  }

  if (!auth.roles.includes("student")) {
    return null;
  }

  return <>{children}</>;
}
