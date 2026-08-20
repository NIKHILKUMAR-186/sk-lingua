import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

type Priority = "urgent" | "attention" | "suggested";

interface MentorActionCardProps {
  priority?: Priority;
  title: string;
  description: string;
  cta: string;
  to: string;
  icon: ReactNode;
  className?: string;
}

const priorityConfig = {
  urgent: {
    iconBg: "bg-gradient-to-br from-electric-iris to-violet-600 text-white",
    ctaClass: "mentor-action-card-cta-urgent",
  },
  attention: {
    iconBg: "bg-amber-50 text-amber-700",
    ctaClass: "mentor-action-card-cta",
  },
  suggested: {
    iconBg: "bg-muted text-muted-foreground",
    ctaClass: "mentor-action-card-cta",
  },
};

export function MentorActionCard({
  priority = "suggested",
  title,
  description,
  cta,
  to,
  icon,
  className,
}: MentorActionCardProps) {
  const config = priorityConfig[priority];

  return (
    <a href={to} className={cn("mentor-action-card", className)}>
      <div className={cn("mentor-action-card-icon", config.iconBg)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">
        <span className={cn("mentor-action-card-cta", config.ctaClass)}>
          {cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </a>
  );
}
