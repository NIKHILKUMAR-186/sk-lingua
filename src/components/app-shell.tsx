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
  CalendarClock,
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
  Sparkles,
  User,
  GraduationCap,
  CreditCard,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { SidebarItem } from "@/components/sidebar-item";
import { ProfileCard } from "@/components/profile-card";
import { useStudentLearningState } from "@/hooks/use-student-learning-state";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { isStudent } from "@/lib/authorization";

const MENTOR_ITEMS = [
  { title: "Dashboard", to: "/mentor/dashboard", icon: LayoutDashboard },
  { title: "Calendar & Requests", to: "/mentor/calendar", icon: CalendarDays },
  { title: "Sessions", to: "/mentor/sessions", icon: History },
  { title: "Resources", to: "/mentor/resources", icon: BookOpenText },
] as const;

interface AdminNavItem {
  title: string;
  to: string;
  icon: LucideIcon;
}

/** Grouped Admin navigation (MANAGE / OPERATIONS / NETWORK / FINANCE / SYSTEM). */
const ADMIN_SECTIONS: Array<{ label: string; items: AdminNavItem[] }> = [
  {
    label: "Manage",
    items: [
      { title: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
      { title: "Analytics", to: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Bookings", to: "/admin/booking-queue", icon: Inbox },
      { title: "Sessions", to: "/admin/sessions", icon: CalendarDays },
      { title: "Demo Queue", to: "/admin/demo-queue", icon: Clock },
      { title: "Slot Management", to: "/admin/slot-management", icon: CalendarDays },
    ],
  },
  {
    label: "Network",
    items: [
      { title: "Mentor Applications", to: "/admin/mentor-applications", icon: Users },
      { title: "Mentors", to: "/admin/mentors", icon: Users },
      { title: "Students", to: "/admin/students", icon: GraduationCap },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Subscription Plans", to: "/admin/subscription-plans", icon: Crown },
      { title: "Subscriptions", to: "/admin/subscription-management", icon: CreditCard },
      {
        title: "Student Subscription Control",
        to: "/admin/student-subscription-control",
        icon: Wallet,
      },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Support Tickets", to: "/admin/support-tickets", icon: MessageSquare },
      { title: "Notification Broadcasts", to: "/admin/notification-broadcasts", icon: Bell },
      { title: "Audit Logs", to: "/admin/audit-logs", icon: History },
      { title: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
];

const ACCOUNT_ITEMS_BASE = [
  { title: "Notifications", icon: Bell },
  { title: "Settings", icon: Settings },
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

  const accountItems =
    variant === "mentor"
      ? [
          { title: "Availability", to: "/mentor/availability", icon: Clock },
          { title: "My Profile", to: "/mentor/profile", icon: User },
          { title: "Notifications", to: "/mentor/notifications", icon: Bell },
          { title: "Settings", to: "/mentor/settings", icon: Settings },
        ]
      : variant === "student"
        ? [
            { title: "Wallet", to: "/student/subscriptions", icon: Wallet },
            { title: "Notifications", to: "/student/notifications", icon: Bell },
            { title: "Settings", to: "/student/settings", icon: Settings },
          ]
        : ACCOUNT_ITEMS_BASE.map((item) => ({
            ...item,
            to: `/${variant}/${item.title.toLowerCase()}`,
          }));

  // ── Dynamic student nav items (P1 lifecycle-aware) ─────────────────
  const isStudentVariant = variant === "student";
  const studentLearning = useStudentLearningState();

  const studentItems = isStudentVariant
    ? [
        { title: "Dashboard", to: "/student/dashboard", icon: LayoutDashboard },
        { title: "Find a Mentor", to: "/student/explore", icon: Compass },
        { title: "Book a Session", to: "/student/book-session", icon: CalendarClock },
        { title: "My Sessions", to: "/student/sessions", icon: CalendarDays },
        { title: "Learning Library", to: "/student/resources", icon: BookOpenText },
      ]
    : [];

  const items =
    variant === "student"
      ? studentItems
      : variant === "mentor"
        ? MENTOR_ITEMS
        : ([] as Array<{ title: string; to: string; icon: LucideIcon }>);

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
              {!collapsed && variant === "student" && (
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Student
                </span>
              )}
              {!collapsed && variant === "mentor" && (
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Mentor
                </span>
              )}
              {!collapsed && variant === "admin" && (
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Admin
                </span>
              )}
            </motion.div>
          )}
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-2">
        {/* Learning Section (student / mentor) */}
        {variant !== "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel
              className={cn(
                "px-2 pb-1 text-[11px] font-medium tracking-[0.12em] text-gray-500 uppercase",
                collapsed && "sr-only",
              )}
            >
              {variant === "student" ? "Learning" : "Teaching"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <nav aria-label={variant === "student" ? "Learning" : "Teaching"}>
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
        )}

        {/* Admin sections (MANAGE / OPERATIONS / NETWORK / FINANCE / SYSTEM) */}
        {variant === "admin" &&
          ADMIN_SECTIONS.map((section) => (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel
                className={cn(
                  "px-2 pb-1 text-[11px] font-medium tracking-[0.12em] text-gray-500 uppercase",
                  collapsed && "sr-only",
                )}
              >
                {section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <nav aria-label={section.label}>
                  <ul className="flex w-full min-w-0 flex-col gap-0.5">
                    {section.items.map((item) => (
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
          ))}

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
                {accountItems.map((item) => (
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
        <ProfileCard auth={auth} collapsed={collapsed} settingsPath={`/${variant}/settings`} />
        {!collapsed && (
          <button
            type="button"
            onClick={signOut}
            className="mx-2 mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
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
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-border shadow-sm">
          <SidebarContentInner variant={variant} />
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
            {variant === "student" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/student/streak"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-50 transition-colors"
                      aria-label="View analytics & streaks"
                    >
                      <Flame className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end">
                    <p className="text-xs">Activity & Streaks</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
