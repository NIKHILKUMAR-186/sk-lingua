import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  title?: string;
  description?: string;
  action?: ReactNode;
  headerClassName?: string;
}

export function SectionCard({
  children,
  className,
  padding = "md",
  title,
  description,
  action,
  headerClassName,
}: SectionCardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card", className)}>
      {(title || description || action) && (
        <div
          className={cn(
            "flex flex-col gap-1 border-b border-border/60 px-5 py-4",
            padding === "sm" && "px-4 py-3",
            padding === "lg" && "px-6 py-5",
            headerClassName,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
              {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        </div>
      )}
      <div className={cn(paddingClasses[padding])}>{children}</div>
    </div>
  );
}
