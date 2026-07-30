import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationAvatar } from "@/components/notification-avatar";
import { NotificationDot } from "@/components/notification-badge";
import { getCategoryConfig } from "@/components/notification-types";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Notification = Tables<"notifications">;

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

export function NotificationCard({ notification, onMarkRead }: NotificationCardProps) {
  const config = getCategoryConfig(notification.category);
  const isUnread = !notification.read;

  const quickActions = getQuickActions(notification.category);

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
      onClick={() => {
        if (isUnread) onMarkRead(notification.id);
      }}
      onKeyDown={(e) => {
        if (isUnread && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onMarkRead(notification.id);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={isUnread ? `${notification.title} - Unread. Click to mark as read.` : notification.title}
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
        !isUnread && [
          "bg-white dark:bg-slate-900",
          "hover:bg-slate-50 dark:hover:bg-slate-800/50",
        ],
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
                    isUnread ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300",
                  )}
                >
                  {notification.title}
                </h4>
                {isUnread && (
                  <NotificationDot className="shrink-0 mt-0.5" />
                )}
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
            {quickActions.length > 0 && (
              <div className="ml-auto flex items-center gap-1">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-md px-2 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick?.(notification);
                    }}
                    tabIndex={0}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface QuickAction {
  label: string;
  onClick?: (notification: Notification) => void;
}

function getQuickActions(category: string | null): QuickAction[] {
  switch (category) {
    case "booking":
      return [
        { label: "View Request" },
        { label: "Accept" },
        { label: "Decline" },
      ];
    case "session":
      return [
        { label: "Open Session" },
        { label: "View Notes" },
      ];
    case "resource":
      return [
        { label: "Open Resource" },
      ];
    case "payment":
      return [
        { label: "View Details" },
      ];
    default:
      return [];
  }
}