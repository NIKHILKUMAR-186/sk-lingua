import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/mentor/status-badge";
import { Clock3, Video, FileUp, ExternalLink } from "lucide-react";

interface SessionCardProps {
  studentName: string;
  studentAvatar?: string | null;
  topic: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  videoLink?: string | null;
  onOpen?: () => void;
  onJoin?: () => void;
  onComplete?: () => void;
  onUploadResource?: () => void;
  className?: string;
}

const statusConfig: Record<
  string,
  { variant: "default" | "success" | "warning" | "danger" | "muted"; label: string }
> = {
  pending: { variant: "warning", label: "Pending" },
  accepted: { variant: "success", label: "Confirmed" },
  confirmed: { variant: "success", label: "Confirmed" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "muted", label: "Cancelled" },
  rejected: { variant: "danger", label: "Rejected" },
};

export function SessionCard({
  studentName,
  studentAvatar,
  topic,
  date,
  time,
  duration,
  status,
  videoLink,
  onOpen,
  onJoin,
  onComplete,
  onUploadResource,
  className,
}: SessionCardProps) {
  const config = statusConfig[status] || { variant: "default" as const, label: status };

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card", className)}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {studentAvatar ? (
                <img
                  src={studentAvatar}
                  alt={studentName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                studentName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground truncate">
                  {studentName}
                </span>
                <StatusBadge label={config.label} variant={config.variant} />
              </div>
              <p className="mt-0.5 text-sm text-foreground/80">{topic}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {date} · {time}
                </span>
                <span>{duration} min</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {onOpen && (
              <Button size="sm" variant="outline" onClick={onOpen} className="h-8 text-xs">
                Open
              </Button>
            )}
            {videoLink && onJoin && (
              <Button size="sm" onClick={onJoin} className="h-8 text-xs">
                <Video className="mr-1 h-3.5 w-3.5" /> Join
              </Button>
            )}
            {(status === "accepted" || status === "confirmed") && onComplete && (
              <Button size="sm" variant="outline" onClick={onComplete} className="h-8 text-xs">
                Mark complete
              </Button>
            )}
            {status === "completed" && onUploadResource && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onUploadResource}
                className="h-8 text-xs"
              >
                <FileUp className="mr-1 h-3.5 w-3.5" /> Upload resource
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
