import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/mentor/status-badge";
import { Clock } from "lucide-react";

interface RequestCardProps {
  studentName: string;
  studentAvatar?: string | null;
  topic: string;
  date: string;
  time: string;
  duration: number;
  message?: string | null;
  status: "pending" | "accepted" | "rejected" | "expired" | "completed";
  onAccept?: () => void;
  onReject?: () => void;
  onOpen?: () => void;
  expiryLabel?: string;
  requestAge?: string;
  language?: string | null;
  className?: string;
}

const statusMap: Record<
  string,
  { variant: "default" | "success" | "danger" | "warning" | "muted"; label: string }
> = {
  pending: { variant: "warning", label: "Pending" },
  accepted: { variant: "success", label: "Accepted" },
  rejected: { variant: "danger", label: "Rejected" },
  expired: { variant: "muted", label: "Expired" },
  completed: { variant: "default", label: "Completed" },
};

export function RequestCard({
  studentName,
  studentAvatar,
  topic,
  date,
  time,
  duration,
  message,
  status,
  onAccept,
  onReject,
  onOpen,
  expiryLabel,
  requestAge,
  language,
  className,
}: RequestCardProps) {
  const statusConfig = statusMap[status] || statusMap.pending;

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
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground truncate">
                  {studentName}
                </span>
                <StatusBadge label={statusConfig.label} variant={statusConfig.variant} />
                {language && (
                  <span className="inline-flex items-center rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {language}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-foreground/90">{topic}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {date} · {time}
                </span>
                <span>{duration} min</span>
                {requestAge && <span className="text-muted-foreground/70">{requestAge}</span>}
                {expiryLabel && <span className="text-amber-600 font-medium">{expiryLabel}</span>}
              </div>
              {message && (
                <div className="mt-2 rounded-lg bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground italic line-clamp-2">
                  "{message}"
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {status === "pending" && (
              <>
                {onAccept && (
                  <Button
                    size="sm"
                    onClick={onAccept}
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs"
                  >
                    Accept
                  </Button>
                )}
                {onReject && (
                  <Button size="sm" variant="outline" onClick={onReject} className="h-8 text-xs">
                    Decline
                  </Button>
                )}
              </>
            )}
            {status === "accepted" && onOpen && (
              <Button size="sm" variant="outline" onClick={onOpen} className="h-8 text-xs">
                Open
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
