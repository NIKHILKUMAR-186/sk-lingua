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
    color: "text-primary dark:text-primary",
    bgColor: "bg-primary/10 dark:bg-primary/20",
    dotColor: "bg-primary",
  },
  session: {
    icon: Video,
    label: "Sessions",
    color: "text-success dark:text-success",
    bgColor: "bg-success/10 dark:bg-success/20",
    dotColor: "bg-success",
  },
  review: {
    icon: Star,
    label: "Reviews",
    color: "text-warning dark:text-warning",
    bgColor: "bg-warning/10 dark:bg-warning/20",
    dotColor: "bg-warning",
  },
  resource: {
    icon: BookOpen,
    label: "Resources",
    color: "text-electric dark:text-electric",
    bgColor: "bg-electric/10 dark:bg-electric/20",
    dotColor: "bg-electric",
  },
  payment: {
    icon: Wallet,
    label: "Payments",
    color: "text-success dark:text-success",
    bgColor: "bg-success/10 dark:bg-success/20",
    dotColor: "bg-success",
  },
  homework: {
    icon: BookOpen,
    label: "Homework",
    color: "text-secondary-foreground dark:text-secondary-foreground",
    bgColor: "bg-secondary dark:bg-secondary",
    dotColor: "bg-secondary-foreground",
  },
  announcement: {
    icon: MessageSquare,
    label: "Announcements",
    color: "text-destructive dark:text-destructive",
    bgColor: "bg-destructive/10 dark:bg-destructive/20",
    dotColor: "bg-destructive",
  },
  cancellation: {
    icon: XCircle,
    label: "Cancellations",
    color: "text-destructive dark:text-destructive",
    bgColor: "bg-destructive/10 dark:bg-destructive/20",
    dotColor: "bg-destructive",
  },
  completed: {
    icon: CheckCircle,
    label: "Completed",
    color: "text-success dark:text-success",
    bgColor: "bg-success/10 dark:bg-success/20",
    dotColor: "bg-success",
  },
  general: {
    icon: Bell,
    label: "System",
    color: "text-muted-foreground dark:text-muted-foreground",
    bgColor: "bg-muted dark:bg-muted",
    dotColor: "bg-muted-foreground",
  },
  mentor_application: {
    icon: UserPlus,
    label: "Mentor Applications",
    color: "text-primary dark:text-primary",
    bgColor: "bg-primary/10 dark:bg-primary/20",
    dotColor: "bg-primary",
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

export const STUDENT_TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "booking", label: "Bookings" },
  { key: "session", label: "Sessions" },
  { key: "payment", label: "Payments" },
  { key: "resource", label: "Resources" },
  { key: "general", label: "System" },
] as const;

export const MENTOR_TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "booking", label: "Bookings" },
  { key: "session", label: "Sessions" },
  { key: "cancellation", label: "Cancellations" },
  { key: "resource", label: "Resources" },
  { key: "general", label: "System" },
] as const;

export const ADMIN_TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "booking", label: "Bookings" },
  { key: "mentor_application", label: "Mentors" },
  { key: "student", label: "Students" },
  { key: "subscription", label: "Subscriptions" },
  { key: "general", label: "System" },
] as const;

export type StudentTabKey = (typeof STUDENT_TABS)[number]["key"];
export type MentorTabKey = (typeof MENTOR_TABS)[number]["key"];
export type AdminTabKey = (typeof ADMIN_TABS)[number]["key"];
