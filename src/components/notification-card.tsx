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
function resolveTarget(notification: Notification, role?: "student" | "mentor" | "admin"): string | null {
  // If an explicit link is stored, use it (it's a route path in this app).
  if (notification.link) return notification.link;

  const relatedId = notification.related_id;
  const kind = notification.kind ?? "";
  const category = notification.category ?? "";

  // Admin routes
  if (role === "admin") {
    if (kind === "mentor_application" || category === "mentor_application") return "/admin/mentor-applications";
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
    if (kind === "demo" || category === "demo") return `/mentor/demo-requests`;
    if (kind === "review" || category === "review") return `/mentor/sessions`;
    if (kind === "resource" || category === "resource") return `/mentor/resources`;
    if (kind === "mentor_application" || category === "mentor_application") return `/mentor/profile`;
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

export function NotificationCard({ notification, onMarkRead, onDelete, role }: NotificationCardProps) {
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
        "group relative cursor-pointer overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all duration-200",
        "hover:shadow-md hover:border-slate-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        "dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:shadow-slate-900/50",
        isUnread && [
          "bg-blue-50/40 dark:bg-blue-950/20",
          "border-l-[3px] border-l-blue-500",
          "hover:bg-blue-50/60 dark:hover:bg-blue-950/30",
        ],
        !isUnread && ["bg-white dark:bg-slate-900", "hover:bg-slate-50 dark:hover:bg-slate-800/50"],
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
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-700 dark:text-slate-300",
                  )}
                >
                  {notification.title}
                </h4>
                {isUnread && <NotificationDot className="shrink-0 mt-0.5" />}
              </div>
              {notification.body && (
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
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
            <time
              dateTime={notification.created_at}
              className="text-xs text-slate-400 dark:text-slate-500"
            >
              {formatRelativeTime(notification.created_at)}
            </time>

            {/* Quick actions */}
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-md px-2 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
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
                className="h-7 rounded-md px-2 text-[11px] font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-300 dark:hover:bg-red-950/40"
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
