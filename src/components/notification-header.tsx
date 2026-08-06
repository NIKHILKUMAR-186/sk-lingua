import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCheck, Search, Settings } from "lucide-react";

interface NotificationHeaderProps {
  unreadCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationHeader({
  unreadCount,
  searchQuery,
  onSearchChange,
  onMarkAllRead,
}: NotificationHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Title and subtitle */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Notifications
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
            : "Stay updated with bookings, sessions and platform activity."}
        </p>
      </div>

      {/* Search and actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notifications..."
            className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-sm placeholder:text-slate-400 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:placeholder:text-slate-500"
            aria-label="Search notifications"
          />
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={onMarkAllRead}
                className="h-9 gap-1.5 rounded-lg border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            </motion.div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            aria-label="Notification settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
