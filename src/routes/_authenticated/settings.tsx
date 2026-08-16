import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getActiveRole, waitForSessionRestored, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/settings")({
  beforeLoad: async () => {
    const user = await waitForSessionRestored(4000, 250);
    if (!user) throw redirect({ to: "/auth" });

    const [{ data: roles }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    const fetchedRoles = (roles ?? []).map((roleRow) => roleRow.role as AppRole);
    const activeRole = getActiveRole(fetchedRoles);

    if (activeRole === "admin") throw redirect({ to: "/admin/settings" });
    if (activeRole === "mentor") throw redirect({ to: "/mentor/settings" });
    throw redirect({ to: "/student/settings" });
  },
  component: () => null,
});
