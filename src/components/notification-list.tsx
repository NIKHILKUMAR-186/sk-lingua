import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationHeader } from "@/components/notification-header";
import { NotificationFilters, type TabConfig } from "@/components/notification-filters";
import { NotificationCard } from "@/components/notification-card";
import { NotificationEmptyState } from "@/components/notification-empty-state";
import type { Tables } from "@/integrations/supabase/types";

type Notification = Tables<"notifications">;

interface NotificationListProps {
  items: Notification[];
  unreadCount: number;
  onMarkAll: () => void;
  onMarkOne: (id: string) => void;
  onDelete: (id: string) => void;
  tabs: readonly TabConfig[];
  getCountForTab: (tab: string) => number;
  getUnreadForTab: (tab: string) => number;
  role?: "student" | "mentor" | "admin";
}

export function NotificationList({
  items,
  unreadCount,
  onMarkAll,
  onMarkOne,
  onDelete,
  tabs,
  getCountForTab,
  getUnreadForTab,
  role,
}: NotificationListProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? "all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    let filtered = items;

    // Apply tab filter
    switch (activeTab) {
      case "unread":
        filtered = filtered.filter((n) => !n.read);
        break;
      default:
        if (activeTab !== "all") {
          filtered = filtered.filter((n) => n.category === activeTab);
        }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(query) || (n.body && n.body.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [items, activeTab, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Header with search */}
      <NotificationHeader
        unreadCount={unreadCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMarkAllRead={onMarkAll}
      />

      {/* Filter tabs */}
      <NotificationFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        items={items}
        unreadCount={unreadCount}
        tabs={tabs}
        getCountForTab={getCountForTab}
        getUnreadForTab={getUnreadForTab}
      />

      {/* Notification list */}
      <div className="space-y-2" role="list" aria-label="Notifications">
        <AnimatePresence mode="popLayout">
          {filteredItems.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <NotificationEmptyState activeFilter={activeTab} />
            </motion.div>
          ) : (
            filteredItems.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={onMarkOne}
                onDelete={onDelete}
                role={role}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer summary */}
      {filteredItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-1 pb-4"
        >
          <span className="text-xs text-muted-foreground">
            Showing {filteredItems.length} of {items.length} notifications
          </span>
        </motion.div>
      )}
    </div>
  );
}
