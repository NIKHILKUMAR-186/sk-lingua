import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    console.group("Session");
    console.log("Route guard", { user: data.user, error });
    if (error || !data.user) {
      console.error("Route guard rejected session", error);
      console.groupEnd();
      console.group("Redirect");
      console.log("Redirecting unauthenticated user to /auth");
      console.groupEnd();
      throw redirect({ to: "/auth" });
    }
    console.groupEnd();
    return { user: data.user };
  },
  component: () => <Outlet />,
});
