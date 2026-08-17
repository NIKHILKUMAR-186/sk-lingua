import { motion } from "framer-motion";
import { Bell } from "lucide-react";

interface NotificationEmptyStateProps {
  activeFilter: string;
}

export function NotificationEmptyState({ activeFilter }: NotificationEmptyStateProps) {
  const messages: Record<string, { title: string; body: string }> = {
    all: {
      title: "No notifications yet",
      body: "We'll notify you when something important happens.",
    },
    unread: {
      title: "No unread notifications",
      body: "You're all caught up! Check back later.",
    },
    booking: {
      title: "No booking notifications",
      body: "Booking updates will appear here.",
    },
    session: {
      title: "No session notifications",
      body: "Session reminders and updates will appear here.",
    },
    payment: {
      title: "No payment notifications",
      body: "Payment updates will appear here.",
    },
    resource: {
      title: "No resource notifications",
      body: "New resources shared with you will appear here.",
    },
    general: {
      title: "No system notifications",
      body: "System announcements will appear here.",
    },
    cancellation: {
      title: "No cancellation notifications",
      body: "Session cancellation updates will appear here.",
    },
    mentor_application: {
      title: "No mentor application notifications",
      body: "Mentor application updates will appear here.",
    },
    student: {
      title: "No student notifications",
      body: "Student registration and activity updates will appear here.",
    },
    subscription: {
      title: "No subscription notifications",
      body: "Subscription and plan updates will appear here.",
    },
  };

  const msg = messages[activeFilter] || messages.all;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-16"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-muted shadow-sm ring-1 ring-border/50 dark:from-background dark:to-muted dark:ring-border"
      >
        <Bell className="h-9 w-9 text-muted-foreground dark:text-muted-foreground" />
      </motion.div>
      <h3 className="text-lg font-semibold text-foreground dark:text-foreground">{msg.title}</h3>
      <p className="mt-1.5 max-w-sm text-center text-sm text-muted-foreground dark:text-muted-foreground">
        {msg.body}
      </p>
    </motion.div>
  );
}
