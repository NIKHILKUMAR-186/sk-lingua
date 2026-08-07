import {
  Bell,
  CalendarCheck,
  CheckCircle,
  XCircle,
  BookOpen,
  Wallet,
  Video,
  Star,
  MessageSquare,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export interface NotificationConfig {
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
}

export const CATEGORY_CONFIG: Record<string, NotificationConfig> = {
  booking: {
    icon: CalendarCheck,
    label: "Bookings",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    dotColor: "bg-blue-500",
  },
  session: {
    icon: Video,
    label: "Sessions",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
    dotColor: "bg-emerald-500",
  },
  review: {
    icon: Star,
    label: "Reviews",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    dotColor: "bg-amber-500",
  },
  resource: {
    icon: BookOpen,
    label: "Resources",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-950/50",
    dotColor: "bg-violet-500",
  },
  payment: {
    icon: Wallet,
    label: "Payments",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
    dotColor: "bg-emerald-500",
  },
  homework: {
    icon: BookOpen,
    label: "Homework",
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-50 dark:bg-sky-950/50",
    dotColor: "bg-sky-500",
  },
  announcement: {
    icon: MessageSquare,
    label: "Announcements",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/50",
    dotColor: "bg-rose-500",
  },
  cancellation: {
    icon: XCircle,
    label: "Cancellations",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/50",
    dotColor: "bg-red-500",
  },
  completed: {
    icon: CheckCircle,
    label: "Completed",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/50",
    dotColor: "bg-green-500",
  },
  general: {
    icon: Bell,
    label: "System",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-950/50",
    dotColor: "bg-slate-500",
  },
  mentor_application: {
    icon: UserPlus,
    label: "Mentor Applications",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/50",
    dotColor: "bg-indigo-500",
  },
};

export function getCategoryConfig(category: string | null): NotificationConfig {
  return CATEGORY_CONFIG[category || "general"] || CATEGORY_CONFIG.general;
}

export const ALL_TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "booking", label: "Bookings" },
  { key: "session", label: "Sessions" },
  { key: "payment", label: "Payments" },
  { key: "resource", label: "Resources" },
  { key: "general", label: "System" },
] as const;

export type TabKey = (typeof ALL_TABS)[number]["key"];
