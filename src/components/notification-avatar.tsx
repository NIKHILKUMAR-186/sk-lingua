import { motion } from "framer-motion";
import { getCategoryConfig } from "@/components/notification-types";
import { cn } from "@/lib/utils";

interface NotificationAvatarProps {
  category: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function NotificationAvatar({ category, size = "md", className }: NotificationAvatarProps) {
  const config = getCategoryConfig(category);
  const Icon = config.icon;

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-xl border shadow-sm",
        config.bgColor,
        sizeClasses[size],
        className,
      )}
    >
      <Icon className={cn(config.color, iconSizes[size])} />
    </motion.div>
  );
}
