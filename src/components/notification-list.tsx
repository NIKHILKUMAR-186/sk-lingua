import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, CalendarCheck, BookOpen, Info, Star, Video, CheckCheck, Mail, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { Tables } from "@/integrations/supabase/types";

type Notification = Tables<"notifications">;

interface NotificationListProps {
  items: Notification[];
  unreadCount: number;
  onMarkAll: () => void;
  onMarkOne: (id: string) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Bell; label: string; color: string }> = {
  booking: { icon: CalendarCheck, label: "Bookings", color: "text-blue-500" },
  homework: { icon: BookOpen, label: "Homework", color: "text-green-500" },
  resource: { icon: Mail, label: "Resources", color: "text-purple-500" },
  review: { icon: Star, label: "Reviews", color: "text-yellow-500" },
  session: { icon: Video, label: "Sessions", color: "text-orange-500" },
  announcement: { icon: MessageSquare, label: "Announcements", color: "text-red-500" },
  general: { icon: Bell, label: "General", color: "text-muted-foreground" },
};

function getCategoryConfig(category: string | null) {
  return CATEGORY_CONFIG[category || "general"] || CATEGORY_CONFIG.general;
}

export function NotificationList({ items, unreadCount, onMarkAll, onMarkOne }: NotificationListProps) {
  const categories = ["all", ...new Set(items.map((n) => n.category || "general"))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}` : "You are up to date."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onMarkAll}>
          <CheckCheck className="mr-1 h-4 w-4" /> Mark all read
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          {categories.map((cat) => {
            const config = getCategoryConfig(cat);
            const Icon = config.icon;
            const count = cat === "all" ? items.length : items.filter((n) => (n.category || "general") === cat).length;
            const unread = cat === "all"
              ? unreadCount
              : items.filter((n) => (n.category || "general") === cat && !n.read).length;
            return (
              <TabsTrigger key={cat} value={cat} className="relative">
                <Icon className={`mr-1.5 h-4 w-4 ${config.color}`} />
                <span className="capitalize">{config.label}</span>
                <span className="ml-1 text-xs text-muted-foreground">({count})</span>
                {unread > 0 && (
                  <span className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                    {unread}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4 space-y-2">
            <AnimatePresence mode="popLayout">
              {(cat === "all"
                ? items
                : items.filter((n) => (n.category || "general") === cat)
              ).length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="No notifications"
                  description="You're all caught up!"
                />
              ) : (
                (cat === "all"
                  ? items
                  : items.filter((n) => (n.category || "general") === cat)
                ).map((n) => {
                  const config = getCategoryConfig(n.category);
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className={n.read ? "opacity-70" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted ${config.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-medium text-sm">{n.title}</div>
                                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                              </div>
                              {n.body && (
                                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                              )}
                              <div className="mt-2 flex items-center justify-between gap-3">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(n.created_at).toLocaleString()}
                                </span>
                                <div className="flex items-center gap-2">
                                  {n.category && (
                                    <Badge variant="outline" className="text-[10px] capitalize">
                                      {config.label}
                                    </Badge>
                                  )}
                                  {!n.read && (
                                    <Button variant="ghost" size="sm" onClick={() => onMarkOne(n.id)} className="text-xs">
                                      Mark read
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

