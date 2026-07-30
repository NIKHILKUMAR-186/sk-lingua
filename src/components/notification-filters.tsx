import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ALL_TABS, getCategoryConfig, type TabKey } from "@/components/notification-types";
import { NotificationBadge } from "@/components/notification-badge";
import type { Tables } from "@/integrations/supabase/types";

type Notification = Tables<"notifications">;

interface NotificationFiltersProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  items: Notification[];
  unreadCount: number;
}

export function NotificationFilters({ activeTab, onTabChange, items, unreadCount }: NotificationFiltersProps) {
  const getCountForTab = (tab: TabKey): number => {
    switch (tab) {
      case "all":
        return items.length;
      case "unread":
        return unreadCount;
      case "booking":
        return items.filter((n) => n.category === "booking").length;
      case "session":
        return items.filter((n) => n.category === "session").length;
      case "payment":
        return items.filter((n) => n.category === "payment").length;
      case "resource":
        return items.filter((n) => n.category === "resource").length;
      case "general":
        return items.filter((n) => !n.category || n.category === "general").length;
      default:
        return 0;
    }
  };

  const getUnreadForTab = (tab: TabKey): number => {
    switch (tab) {
      case "all":
        return unreadCount;
      case "unread":
        return unreadCount;
      case "booking":
        return items.filter((n) => n.category === "booking" && !n.read).length;
      case "session":
        return items.filter((n) => n.category === "session" && !n.read).length;
      case "payment":
        return items.filter((n) => n.category === "payment" && !n.read).length;
      case "resource":
        return items.filter((n) => n.category === "resource" && !n.read).length;
      case "general":
        return items.filter((n) => (!n.category || n.category === "general") && !n.read).length;
      default:
        return 0;
    }
  };

  return (
    <div className="flex flex-wrap gap-1" role="tablist" aria-label="Notification filters">
      {ALL_TABS.map((tab) => {
        const config = getCategoryConfig(tab.key === "unread" ? null : tab.key === "all" ? null : tab.key);
        const Icon = config.icon;
        const count = getCountForTab(tab.key);
        const unread = getUnreadForTab(tab.key);
        const isActive = activeTab === tab.key;

        return (
          <motion.button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            aria-label={`${tab.label} notifications${unread > 0 ? `, ${unread} unread` : ""}`}
            onClick={() => onTabChange(tab.key)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
              isActive
                ? "bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-950/40 dark:text-blue-300"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
            )}
          >
            {tab.key !== "all" && tab.key !== "unread" && (
              <Icon className={cn("h-3.5 w-3.5", isActive ? config.color : "")} />
            )}
            <span>{tab.label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  isActive ? "text-blue-500 dark:text-blue-400" : "text-slate-400 dark:text-slate-500",
                )}
              >
                {count}
              </span>
            )}
            {unread > 0 && (
              <NotificationBadge count={unread} variant="primary" size="sm" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}