import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationHeader } from "@/components/notification-header";
import { NotificationFilters } from "@/components/notification-filters";
import { NotificationCard } from "@/components/notification-card";
import { NotificationEmptyState } from "@/components/notification-empty-state";
import type { TabKey } from "@/components/notification-types";
import type { Tables } from "@/integrations/supabase/types";

type Notification = Tables<"notifications">;

interface NotificationListProps {
  items: Notification[];
  unreadCount: number;
  onMarkAll: () => void;
  onMarkOne: (id: string) => void;
}

export function NotificationList({ items, unreadCount, onMarkAll, onMarkOne }: NotificationListProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    let filtered = items;

    // Apply tab filter
    switch (activeTab) {
      case "unread":
        filtered = filtered.filter((n) => !n.read);
        break;
      case "booking":
        filtered = filtered.filter((n) => n.category === "booking");
        break;
      case "session":
        filtered = filtered.filter((n) => n.category === "session");
        break;
      case "payment":
        filtered = filtered.filter((n) => n.category === "payment");
        break;
      case "resource":
        filtered = filtered.filter((n) => n.category === "resource");
        break;
      case "general":
        filtered = filtered.filter((n) => !n.category || n.category === "general");
        break;
      // "all" - no filter
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          (n.body && n.body.toLowerCase().includes(query)),
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
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Showing {filteredItems.length} of {items.length} notifications
          </span>
        </motion.div>
      )}
    </div>
  );
}