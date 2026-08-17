import { Link } from "@tanstack/react-router";
import {
  Users,
  UserCheck,
  Clock,
  CalendarDays,
  AlertTriangle,
  PauseCircle,
  FileText,
  ShieldCheck,
} from "lucide-react";
import type { MentorStats } from "@/lib/mentor-domain";
import { cn } from "@/lib/utils";

interface MetricProps {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  to: string;
  attention?: boolean;
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  bg,
  to,
  attention,
}: MetricProps) {
  return (
    <Link to={to}>
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer",
          attention && "ring-2 ring-amber-200 dark:ring-amber-800",
        )}
      >
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-display">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className={cn("rounded-xl p-3 shrink-0", bg)}>
          <Icon className={cn("h-6 w-6", color)} />
        </div>
      </div>
    </Link>
  );
}

export function MentorMetrics({ stats }: { stats: MentorStats }) {
  const items = [
    {
      title: "Total Mentors",
      value: stats.totalMentors,
      description: "All mentors in network",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/5",
      to: "/admin/mentors",
    },
    {
      title: "Active Mentors",
      value: stats.activeMentors,
      description: "Currently accepting sessions",
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-50",
      to: "/admin/mentors?filter=active",
    },
    {
      title: "Pending Applications",
      value: stats.pendingApplications,
      description: "Awaiting review",
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      to: "/admin/mentor-applications",
    },
    {
      title: "Available Today",
      value: stats.availableToday,
      description: "With open slots today",
      icon: CalendarDays,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      to: "/admin/mentors?filter=available_today",
    },
    {
      title: "Needs Attention",
      value: stats.needsAttention,
      description: "Require admin action",
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      to: "/admin/mentors?filter=needs_attention",
      attention: stats.needsAttention > 0,
    },
    {
      title: "Inactive Mentors",
      value: stats.inactiveMentors,
      description: "Deactivated accounts",
      icon: PauseCircle,
      color: "text-slate-600",
      bg: "bg-slate-100",
      to: "/admin/mentors?filter=inactive",
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
