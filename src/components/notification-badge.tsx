import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  variant?: "primary" | "secondary" | "muted";
  size?: "sm" | "md";
  className?: string;
}

export function NotificationBadge({
  count,
  variant = "primary",
  size = "sm",
  className,
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const sizeClasses = {
    sm: "min-w-[18px] h-[18px] text-[10px] px-1",
    md: "min-w-[22px] h-[22px] text-xs px-1.5",
  };

  const variantClasses = {
    primary: "bg-blue-500 text-white dark:bg-blue-400 dark:text-blue-950",
    secondary: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    muted: "bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium leading-none",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      aria-label={`${count} unread`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function NotificationDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full bg-blue-500", className)}
      aria-label="Unread notification"
    />
  );
}
