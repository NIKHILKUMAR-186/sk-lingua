import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MentorStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  className?: string;
}

export function MentorStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: MentorStatCardProps) {
  return (
    <div className={cn("mentor-stat-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-display font-bold tracking-tight text-foreground">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.positive ? "text-jelly-green" : "text-marker-red"
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-electric-iris">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
