import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getActiveRole, waitForSessionRestored, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/notifications")({
  beforeLoad: async () => {
    const user = await waitForSessionRestored(4000, 250);
    if (!user) throw redirect({ to: "/auth" });

    const [{ data: roles }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    const fetchedRoles = (roles ?? []).map((roleRow) => roleRow.role as AppRole);
    const activeRole = getActiveRole(fetchedRoles);

    if (activeRole === "admin") throw redirect({ to: "/admin/notifications" });
    if (activeRole === "mentor") throw redirect({ to: "/mentor/notifications" });
    throw redirect({ to: "/student/notifications" });
  },
  component: () => null,
});
