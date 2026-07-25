import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "student" | "mentor" | "admin";

export interface AuthSession {
  user: User | null;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    country: string | null;
    native_language: string | null;
    bio: string | null;
    timezone: string | null;
    learning_goal: string | null;
    target_language: string | null;
    current_level: string | null;
    interests: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    website_url: string | null;
    youtube_url: string | null;
    onboarded: boolean;
  } | null;
  role: AppRole | null;
}

export function useAuth() {
  return useQuery<AuthSession>({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { user: null, profile: null, role: null };
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const roleOrder: AppRole[] = ["admin", "mentor", "student"];
      const role =
        (roles?.map((r) => r.role as AppRole).sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b))[0]) ??
        null;
      return { user, profile: profile as AuthSession["profile"], role };
    },
    staleTime: 30_000,
  });
}
