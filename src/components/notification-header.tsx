import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCheck, Search, Settings } from "lucide-react";

interface NotificationHeaderProps {
  unreadCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMarkAllRead: () => void;
  role?: "student" | "mentor" | "admin";
}

export function NotificationHeader({
  unreadCount,
  searchQuery,
  onSearchChange,
  onMarkAllRead,
  role = "student",
}: NotificationHeaderProps) {
  const settingsPath = `/${role}/settings`;
  return (
    <div className="space-y-4">
      {/* Title and subtitle */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
            : "Stay updated with bookings, sessions and platform activity."}
        </p>
      </div>

      {/* Search and actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notifications..."
            className="h-9 rounded-lg border-border bg-background pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-ring dark:border-border dark:bg-background dark:placeholder:text-muted-foreground"
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
                className="h-9 gap-1.5 rounded-lg border-border text-xs font-medium text-foreground hover:bg-accent hover:text-foreground dark:border-border dark:text-foreground dark:hover:bg-accent dark:hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            </motion.div>
          )}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
            aria-label="Notification settings"
          >
            <Link to={settingsPath}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
