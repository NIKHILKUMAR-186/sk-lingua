import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

async function waitForAuthenticatedUser(maxWaitMs = 3000) {
  const start = Date.now();
  let lastError: Error | null = null;

  while (Date.now() - start < maxWaitMs) {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      lastError = error as Error;
      await new Promise((resolve) => setTimeout(resolve, 150));
      continue;
    }

    if (data.user) return data.user;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  if (lastError) throw lastError;
  return null;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await waitForAuthenticatedUser();
    if (!user) {
      throw redirect({ to: "/auth" });
    }
    return { user };
  },
  component: () => <Outlet />,
});
