import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MentorInsightCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  variant?: "info" | "suggestion";
  className?: string;
}

export function MentorInsightCard({
  icon,
  title,
  description,
  action,
  variant = "info",
  className,
}: MentorInsightCardProps) {
  return (
    <div className={cn("mentor-insight-card", className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
