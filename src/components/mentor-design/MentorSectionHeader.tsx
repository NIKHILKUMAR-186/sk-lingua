import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MentorSectionHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function MentorSectionHeader({
  icon,
  title,
  description,
  action,
  className,
}: MentorSectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-electric-iris">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
