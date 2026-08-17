import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationAvatar } from "@/components/notification-avatar";
import { NotificationDot } from "@/components/notification-badge";
import { getCategoryConfig } from "@/components/notification-types";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import { X, ExternalLink } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Notification = Tables<"notifications">;

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  role?: "student" | "mentor" | "admin";
}

/**
 * Resolve a type-safe target route for a notification based on its category/kind and user role.
 * Returns a route path string that matches the router's expectations.
 */
function resolveTarget(
  notification: Notification,
  role?: "student" | "mentor" | "admin",
): string | null {
  // If an explicit link is stored, use it (it's a route path in this app).
  if (notification.link) return notification.link;

  const relatedId = notification.related_id;
  const kind = notification.kind ?? "";
  const category = notification.category ?? "";

  // Admin routes
  if (role === "admin") {
    if (kind === "mentor_application" || category === "mentor_application")
      return "/admin/mentor-applications";
    if (kind === "booking" || category === "booking") return "/admin/booking-queue";
    if (kind === "session" || category === "session") return "/admin/sessions";
    if (kind === "payment" || category === "payment") return "/admin/analytics";
    if (kind === "support" || category === "support") return "/admin/support-tickets";
    if (kind === "student" || category === "student") return "/admin/students";
    if (kind === "subscription" || category === "subscription") return "/admin/subscription-plans";
    if (category === "announcement") return "/admin/dashboard";
    return "/admin/dashboard";
  }

  // Mentor routes
  if (role === "mentor") {
    if (kind === "session" || category === "session") return `/mentor/session/${relatedId}`;
    if (kind === "booking" || category === "booking") return `/mentor/calendar`;
    if (kind === "demo" || category === "demo") return `/mentor/calendar`;
    if (kind === "review" || category === "review") return `/mentor/sessions`;
    if (kind === "resource" || category === "resource") return `/mentor/resources`;
    if (kind === "mentor_application" || category === "mentor_application")
      return `/mentor/profile`;
    if (kind === "cancellation" || category === "cancellation") return `/mentor/calendar`;
    if (category === "announcement") return `/mentor/dashboard`;
    return `/mentor/dashboard`;
  }

  // Student routes (default)
  if (kind === "session" || category === "session") return `/student/session/${relatedId}`;
  if (kind === "review" || category === "review") return `/student/sessions`;
  if (kind === "mentor" || category === "mentor") return `/student/explore`;
  if (kind === "booking" || category === "booking") return `/student/sessions`;
  if (kind === "payment" || category === "payment") return `/student/subscriptions`;
  if (kind === "resource" || category === "resource") return `/student/resources`;
  if (kind === "homework") return `/student/sessions`;
  if (kind === "mentor_application" || category === "mentor_application")
    return `/mentor/application`;

  // Fallback by category.
  switch (category) {
    case "session":
      return "/student/sessions";
    case "booking":
      return "/student/sessions";
    case "payment":
      return "/student/subscriptions";
    case "resource":
      return "/student/resources";
    case "review":
      return "/student/sessions";
    default:
      return null;
  }
}

export function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
  role,
}: NotificationCardProps) {
  const config = getCategoryConfig(notification.category);
  const isUnread = !notification.read;
  const navigate = useNavigate();

  function handleOpen() {
    if (isUnread) onMarkRead(notification.id);
    const target = resolveTarget(notification, role);
    if (target) navigate({ to: target });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={isUnread ? `${notification.title} - Unread. Click to open.` : notification.title}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border bg-background p-4 shadow-sm transition-all duration-200",
        "hover:shadow-md hover:border-border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "dark:bg-background dark:border-border dark:hover:border-border dark:hover:shadow-lg",
        isUnread && [
          "bg-primary/10 dark:bg-primary/20",
          "border-l-[3px] border-l-primary",
          "hover:bg-primary/20 dark:hover:bg-primary/30",
        ],
        !isUnread && ["bg-background dark:bg-background", "hover:bg-accent dark:hover:bg-accent"],
      )}
    >
      <div className="flex items-start gap-3.5">
        {/* Avatar */}
        <NotificationAvatar category={notification.category} />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4
                  className={cn(
                    "text-sm font-medium leading-tight",
                    isUnread
                      ? "text-foreground dark:text-foreground"
                      : "text-foreground dark:text-foreground",
                  )}
                >
                  {notification.title}
                </h4>
                {isUnread && <NotificationDot className="shrink-0 mt-0.5" />}
              </div>
              {notification.body && (
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                  {notification.body}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Category badge */}
            <Badge
              variant="outline"
              className={cn(
                "h-5 border-0 text-[11px] font-medium px-2 py-0",
                config.bgColor,
                config.color,
              )}
            >
              {config.label}
            </Badge>

            {/* Timestamp */}
            <time dateTime={notification.created_at} className="text-xs text-muted-foreground">
              {formatRelativeTime(notification.created_at)}
            </time>

            {/* Quick actions */}
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-md px-2 text-[11px] font-medium text-foreground hover:text-foreground hover:bg-accent dark:text-foreground dark:hover:text-foreground dark:hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpen();
                }}
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                Open
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-md px-2 text-[11px] font-medium text-foreground hover:text-destructive hover:bg-destructive/10 dark:text-foreground dark:hover:text-destructive dark:hover:bg-destructive/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
