import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MentorEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: ReactNode;
}

export function MentorEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
}: MentorEmptyStateProps) {
  return (
    <div className="mentor-empty-state">
      {icon && (
        <div className="mentor-empty-state-icon">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      <div className="mt-4 flex items-center justify-center gap-2">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mentor-btn-primary"
          >
            {actionLabel}
          </button>
        )}
        {secondaryAction}
      </div>
    </div>
  );
}
