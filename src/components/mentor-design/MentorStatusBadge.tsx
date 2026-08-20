import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Status = "success" | "warning" | "info" | "neutral" | "destructive";

interface MentorStatusBadgeProps {
  status: Status;
  label: string;
  icon?: ReactNode;
  className?: string;
}

const statusClasses: Record<Status, string> = {
  success: "mentor-badge-success",
  warning: "mentor-badge-warning",
  info: "mentor-badge-info",
  neutral: "mentor-badge-neutral",
  destructive: "mentor-badge-destructive",
};

export function MentorStatusBadge({
  status,
  label,
  icon,
  className,
}: MentorStatusBadgeProps) {
  return (
    <span className={cn("mentor-badge", statusClasses[status], className)}>
      {icon && <span className="h-3 w-3">{icon}</span>}
      {label}
    </span>
  );
}
