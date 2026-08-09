import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { waitForSessionRestored } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Wait for Supabase to restore / exchange an OAuth session WITHOUT treating
    // the in-progress restoration as "logged out". This fixes the redirect loop
    // where the guard bounced a valid in-flight OAuth login straight back to /auth.
    const user = await waitForSessionRestored(9000, 250);
    if (!user) {
      throw redirect({ to: "/auth" });
    }
    return { user };
  },
  component: () => <Outlet />,
});
