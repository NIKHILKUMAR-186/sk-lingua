import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MentorEmptyState } from "@/components/mentor-design/MentorEmptyState";

interface MentorEmptyStateLegacyProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: ReactNode;
}

export function MentorEmptyStateLegacy({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
}: MentorEmptyStateLegacyProps) {
  return (
    <MentorEmptyState
      icon={icon}
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
      secondaryAction={secondaryAction}
    />
  );
}
