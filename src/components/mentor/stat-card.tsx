import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number | string;
    label: string;
    positive?: boolean;
  };
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({ label, value, icon, trend, href, onClick, className }: StatCardProps) {
  const content = (
    <div
      className={cn(
        "group relative rounded-xl border border-border/60 bg-card p-5",
        onClick && "cursor-pointer transition hover:border-primary/30 hover:shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-display tracking-tight text-foreground">{value}</p>
          {trend && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trend.positive !== false ? "text-emerald-600" : "text-red-600",
              )}
            >
              {trend.positive !== false ? "+" : ""}
              {trend.value} <span className="text-muted-foreground font-normal">{trend.label}</span>
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block no-underline">
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}
