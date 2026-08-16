import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Clock3 } from "lucide-react";

interface TimelineItemProps {
  time: string;
  title: string;
  subtitle?: string;
  status?: "available" | "booked" | "busy" | "break";
  action?: ReactNode;
  className?: string;
}

const statusConfig = {
  available: { dot: "bg-emerald-500", label: "Available" },
  booked: { dot: "bg-blue-500", label: "Booked" },
  busy: { dot: "bg-amber-500", label: "Busy" },
  break: { dot: "bg-muted-foreground", label: "Break" },
};

export function TimelineItem({
  time,
  title,
  subtitle,
  status = "available",
  action,
  className,
}: TimelineItemProps) {
  const config = statusConfig[status];

  return (
    <div className={cn("flex gap-3", className)}>
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-muted-foreground tabular-nums w-12 shrink-0">
          {time}
        </span>
        <div className="mt-1.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center">
          <span className={cn("h-2 w-2 rounded-full", config.dot)} />
        </div>
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{title}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
    </div>
  );
}
