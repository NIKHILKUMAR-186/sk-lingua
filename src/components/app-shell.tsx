import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarProvider, SidebarTrigger, SidebarInset,
} from "@/components/ui/sidebar";
import { Bell, Calendar, LayoutDashboard, Settings, LogOut, Users, BookOpen, Flame, Search, Video, User, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STUDENT_ITEMS = [
  { title: "Dashboard", to: "/student/dashboard", icon: LayoutDashboard },
  { title: "Explore mentors", to: "/student/explore", icon: Search },
  { title: "Sessions", to: "/student/sessions", icon: Video },
  { title: "Resources", to: "/student/resources", icon: BookOpen },
  { title: "Streak & points", to: "/student/streak", icon: Flame },
];
const MENTOR_ITEMS = [
  { title: "Dashboard", to: "/mentor/dashboard", icon: LayoutDashboard },
  { title: "Calendar & requests", to: "/mentor/calendar", icon: Calendar },
  { title: "My profile & gigs", to: "/mentor/profile", icon: User },
  { title: "Sessions", to: "/mentor/sessions", icon: Video },
  { title: "Resources", to: "/mentor/resources", icon: BookOpen },
];

export function AppShell({ children, variant }: { children: React.ReactNode; variant: "student" | "mentor" }) {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = variant === "student" ? STUDENT_ITEMS : MENTOR_ITEMS;

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications-unread", auth?.user?.id],
    enabled: !!auth?.user,
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  async function signOut() {
    console.group("Logout");
    await qc.cancelQueries();
    qc.clear();
    const { error } = await supabase.auth.signOut();
    console.log("Logout response", { error });
    if (error) console.error("Logout failed", error);
    console.groupEnd();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <Link to="/" className="flex items-center gap-2 px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-hero-gradient">
                <Languages className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-display leading-tight">Lingua</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{variant}</span>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{variant === "student" ? "Learn" : "Teach"}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={pathname === item.to}>
                        <Link to={item.to as "/student/dashboard"}>
                          <item.icon /><span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Account</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/notifications"}>
                      <Link to="/notifications"><Bell /><span>Notifications</span>{unread > 0 && <Badge className="ml-auto">{unread}</Badge>}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/settings"}>
                      <Link to="/settings"><Settings /><span>Settings</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {auth?.role === "student" && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/mentor/dashboard"><Users /><span>Become a mentor</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                {auth?.profile?.avatar_url ? <img src={auth.profile.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{auth?.profile?.full_name}</div>
                <div className="truncate text-xs text-muted-foreground">{auth?.user?.email}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
