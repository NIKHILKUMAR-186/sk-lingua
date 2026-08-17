import { Link } from "@tanstack/react-router";
import {
  Users,
  CreditCard,
  UserCheck,
  CalendarClock,
  Activity,
  UserX,
} from "lucide-react";
import type { StudentStats } from "../services/student-service";
import { cn } from "@/lib/utils";

interface MetricProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  to: string;
  attention?: boolean;
}

function MetricCard({ title, value, description, icon: Icon, color, bg, to, attention }: MetricProps) {
  return (
    <Link to={to} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      <div
        className={cn(
          "flex h-full items-center justify-between rounded-xl border bg-card p-5 transition-all duration-200 hover:border-primary/20 hover:shadow-md",
          attention && "ring-2 ring-amber-200 dark:ring-amber-800",
        )}
      >
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-display">{value.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className={cn("shrink-0 rounded-xl p-3", bg)}>
          <Icon className={cn("h-6 w-6", color)} aria-hidden />
        </div>
      </div>
    </Link>
  );
}

export function StudentMetrics({
  stats,
  activeAccounts,
}: {
  stats: StudentStats;
  activeAccounts?: number;
}) {
  const items: MetricProps[] = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      description: "All registered students",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/5",
      to: "/admin/students?filter=all",
    },
    {
      title: "Subscribed",
      value: stats.withActiveSubscription,
      description: "Active, unexpired subscriptions",
      icon: CreditCard,
      color: "text-green-600",
      bg: "bg-green-50",
      to: "/admin/students?filter=active_subscription",
    },
    {
      title: "Active Accounts",
      value: activeAccounts ?? stats.activeStudents ?? stats.withActiveSubscription,
      description: "Onboarded accounts",
      icon: UserCheck,
      color: "text-blue-600",
      bg: "bg-blue-50",
      to: "/admin/students?filter=active_account",
    },
    {
      title: "Expiring Soon",
      value: stats.expiringSoon,
      description: "Subscriptions expiring in 30 days",
      icon: CalendarClock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      to: "/admin/students?filter=all&sort=expiring_soon",
      attention: stats.expiringSoon > 0,
    },
    {
      title: "Sessions Used",
      value: stats.totalSessionsUsed,
      description: "Across active subscriptions",
      icon: Activity,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      to: "/admin/students?filter=all&sort=most_sessions",
    },
    {
      title: "No Subscription",
      value: Math.max(0, (stats.totalStudents || 0) - (stats.withActiveSubscription || 0)),
      description: "Students without an active plan",
      icon: UserX,
      color: "text-slate-600",
      bg: "bg-slate-100",
      to: "/admin/students?filter=no_subscription",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <MetricCard key={item.title} {...item} />
      ))}
    </div>
  );
}
