import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MentorAvatarProps {
  src?: string | null;
  alt?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "mentor-avatar-sm",
  md: "mentor-avatar",
  lg: "mentor-avatar-lg",
};

export function MentorAvatar({
  src,
  alt,
  fallback,
  size = "md",
  className,
}: MentorAvatarProps) {
  return (
    <div className={cn("mentor-avatar", sizeClasses[size], className)}>
      {src ? (
        <img src={src} alt={alt || fallback} />
      ) : (
        <span>{fallback.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}
