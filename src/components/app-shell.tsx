import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Compass,
  CalendarDays,
  BookOpenText,
  Flame,
  Bell,
  Settings,
  CircleHelp,
  MessageSquare,
  LogOut,
  Crown,
  Clock,
  History,
  Users,
  Inbox,
  BarChart3,
} from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { SidebarItem } from "@/components/sidebar-item";
import { ProfileCard } from "@/components/profile-card";

const STUDENT_ITEMS = [
  { title: "Dashboard", to: "/student/dashboard", icon: LayoutDashboard },
  { title: "Discover Mentors", to: "/student/explore", icon: Compass },
  { title: "Sessions", to: "/student/sessions", icon: CalendarDays },
  { title: "Resources", to: "/student/resources", icon: BookOpenText },
  { title: "Analytics & Streaks", to: "/student/streak", icon: Flame },
  { title: "Demo Session", to: "/student/demo-session", icon: Clock },
  { title: "Pricing Plans", to: "/student/pricing", icon: Crown },
  { title: "My Subscriptions", to: "/student/subscriptions", icon: Crown },
  { title: "History", to: "/student/history", icon: History },
] as const;

const MENTOR_ITEMS = [
  { title: "Dashboard", to: "/mentor/dashboard", icon: LayoutDashboard },
  { title: "Calendar & requests", to: "/mentor/calendar", icon: CalendarDays },
  { title: "Incoming Requests", to: "/mentor/requests", icon: Inbox },
  { title: "My profile & gigs", to: "/mentor/profile", icon: Compass },
  { title: "Sessions", to: "/mentor/sessions", icon: CalendarDays },
  { title: "Resources", to: "/mentor/resources", icon: BookOpenText },
] as const;

const ADMIN_ITEMS = [
  { title: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Analytics", to: "/admin/analytics", icon: BarChart3 },
  { title: "Booking Queue", to: "/admin/booking-queue", icon: Inbox },
  { title: "Mentor Applications", to: "/admin/mentor-applications", icon: Users },
  { title: "Demo Queue", to: "/admin/demo-queue", icon: Clock },
  { title: "Support Tickets", to: "/admin/support-tickets", icon: MessageSquare },
  { title: "Notification Broadcasts", to: "/admin/notification-broadcasts", icon: Bell },
  { title: "Audit Logs", to: "/admin/audit-logs", icon: History },
  { title: "Subscription Plans", to: "/admin/subscription-plans", icon: Crown },
  { title: "Students", to: "/admin/students", icon: Users },
] as const;

const ACCOUNT_ITEMS = [
  { title: "Notifications", to: "/notifications", icon: Bell },
  { title: "Settings", to: "/settings", icon: Settings },
] as const;

// const HELP_ITEMS = [
//   { title: "Help Center", to: "/help", icon: CircleHelp },
//   { title: "Send Feedback", to: "/feedback", icon: MessageSquare },
// ] as const;

function SidebarContentInner({ variant }: { variant: "student" | "mentor" | "admin" }) {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state: sidebarState } = useSidebar();
  const collapsed = sidebarState === "collapsed";

  const items =
    variant === "student" ? STUDENT_ITEMS : variant === "mentor" ? MENTOR_ITEMS : ADMIN_ITEMS;

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications-unread", auth?.user?.id],
    enabled: !!auth?.user,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("read", false);
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      {/* Brand Header */}
      <SidebarHeader className="px-4 pt-6 pb-2">
        <Link
          to="/"
          className={cn("flex items-center gap-3", collapsed && "justify-center")}
          aria-label="Lingua Home"
        >
          <motion.div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl overflow-hidden bg-white ring-1 ring-border"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img src="/logo.png" alt="Lingua" className="h-full w-full object-contain p-1" />
          </motion.div>

          {!collapsed && (
            <motion.div
              className="flex flex-col"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-lg font-display leading-tight tracking-tight text-foreground">
                Lingua
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {variant === "student"
                  ? "Student Workspace"
                  : variant === "mentor"
                    ? "Mentor Workspace"
                    : "Admin Workspace"}
              </span>
            </motion.div>
          )}
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-2">
        {/* Learning Section */}
        <SidebarGroup>
          <SidebarGroupLabel
            className={cn(
              "px-2 pb-1 text-[11px] font-medium tracking-[0.12em] text-gray-500 uppercase",
              collapsed && "sr-only",
            )}
          >
            {variant === "student" ? "Learning" : variant === "mentor" ? "Teaching" : "Manage"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <nav
              aria-label={
                variant === "student" ? "Learning" : variant === "mentor" ? "Teaching" : "Manage"
              }
            >
              <ul className="flex w-full min-w-0 flex-col gap-0.5">
                {items.map((item) => (
                  <SidebarItem
                    key={item.to}
                    icon={item.icon}
                    label={item.title}
                    to={item.to}
                    isActive={pathname === item.to}
                  />
                ))}
              </ul>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account Section */}
        <SidebarGroup>
          <SidebarGroupLabel
            className={cn(
              "px-2 pb-1 text-[11px] font-medium tracking-[0.12em] text-gray-500 uppercase",
              collapsed && "sr-only",
            )}
          >
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Account">
              <ul className="flex w-full min-w-0 flex-col gap-0.5">
                {ACCOUNT_ITEMS.map((item) => (
                  <SidebarItem
                    key={item.to}
                    icon={item.icon}
                    label={item.title}
                    to={item.to}
                    isActive={pathname === item.to}
                    badge={item.title === "Notifications" ? unread : null}
                  />
                ))}
              </ul>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Help Section */}
        {/* <SidebarGroup> */}
        {/* <SidebarGroupLabel
            className={cn(
              "px-2 pb-1 text-[11px] font-medium tracking-[0.12em] text-gray-500 uppercase",
              collapsed && "sr-only",
            )}
          >
            Support
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Support">
              <ul className="flex w-full min-w-0 flex-col gap-0.5">
                {HELP_ITEMS.map((item) => (
                  <SidebarItem
                    key={item.to}
                    icon={item.icon}
                    label={item.title}
                    to={item.to}
                    isActive={pathname === item.to}
                  />
                ))}
              </ul>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup> */}
      </SidebarContent>

      {/* Footer: Profile + Logout */}
      <SidebarFooter className="border-t border-border/50 p-3">
        <ProfileCard auth={auth} collapsed={collapsed} />

        {!collapsed && (
          <motion.button
            onClick={signOut}
            className={cn(
              "mx-2 mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground",
              "transition-all duration-200 hover:bg-red-50 hover:text-red-600",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "cursor-pointer",
            )}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </motion.button>
        )}
      </SidebarFooter>
    </>
  );
}

export function AppShell({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "student" | "mentor" | "admin";
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#FCFCFD]">
        <Sidebar
          collapsible="icon"
          className="border-r border-[#E5E7EB] shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
        >
          <SidebarContentInner variant={variant} />
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
