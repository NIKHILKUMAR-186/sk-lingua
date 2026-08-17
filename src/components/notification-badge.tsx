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
    primary: "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground",
    secondary:
      "bg-secondary text-secondary-foreground dark:bg-secondary dark:text-secondary-foreground",
    muted: "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
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
      className={cn("inline-block h-2 w-2 rounded-full bg-primary", className)}
      aria-label="Unread notification"
    />
  );
}
