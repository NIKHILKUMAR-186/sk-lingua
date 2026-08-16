import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getCategoryConfig, type TabKey, type StudentTabKey, type MentorTabKey, type AdminTabKey } from "@/components/notification-types";
import { NotificationBadge } from "@/components/notification-badge";
import type { Tables } from "@/integrations/supabase/types";

type Notification = Tables<"notifications">;

export interface TabConfig {
  key: string;
  label: string;
}

interface NotificationFiltersProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  items: Notification[];
  unreadCount: number;
  tabs: readonly TabConfig[];
  getCountForTab: (tab: string) => number;
  getUnreadForTab: (tab: string) => number;
}

export function NotificationFilters({
  activeTab,
  onTabChange,
  items,
  unreadCount,
  tabs,
  getCountForTab,
  getUnreadForTab,
}: NotificationFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1" role="tablist" aria-label="Notification filters">
      {tabs.map((tab) => {
        const config = getCategoryConfig(
          tab.key === "unread" || tab.key === "all" ? null : tab.key,
        );
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
                  isActive
                    ? "text-blue-500 dark:text-blue-400"
                    : "text-slate-400 dark:text-slate-500",
                )}
              >
                {count}
              </span>
            )}
            {unread > 0 && <NotificationBadge count={unread} variant="primary" size="sm" />}
          </motion.button>
        );
      })}
    </div>
  );
}
