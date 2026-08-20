import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface MentorQuickActionProps {
  icon: ReactNode;
  label: string;
  to: string;
  badge?: number;
  className?: string;
}

export function MentorQuickAction({
  icon,
  label,
  to,
  badge,
  className,
}: MentorQuickActionProps) {
  return (
    <Link
      to={to}
      className={cn("mentor-quick-action", className)}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="mentor-sidebar-item-badge">{badge > 99 ? "99+" : badge}</span>
      )}
    </Link>
  );
}
