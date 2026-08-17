import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MentorDetail } from "@/lib/mentor-domain";

export function MentorActivityTimeline({ mentor }: { mentor: MentorDetail }) {
  const events = mentor.activity || [];

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity timeline</CardTitle>
          <CardDescription>No recorded activity yet.</CardDescription>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <History className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Activity will appear here once the mentor starts receiving assignments and sessions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity timeline</CardTitle>
        <CardDescription>Recent audit, application and session events</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ol className="relative border-l border-border/50 ml-2 pl-4 py-2">
          {events.map((e, i) => (
            <li key={e.id || `event-${i}`} className="mb-4 ml-4 last:mb-0">
              <div className="absolute -left-[9px] mt-1 h-2 w-2 rounded-full bg-primary" />
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{formatEvent(e.event)}</p>
                  {e.detail && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{e.detail}</p>
                  )}
                </div>
                <time className="shrink-0 text-xs text-muted-foreground" dateTime={e.createdAt}>
                  {formatDate(e.createdAt)}
                </time>
              </div>
              {e.actorName && (
                <p className="mt-0.5 text-xs text-muted-foreground">by {e.actorName}</p>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function formatEvent(event: string): string {
  const pretty: Record<string, string> = {
    approve_mentor_application: "Application approved",
    reject_mentor_application: "Application rejected",
    set_mentor_status: "Status updated",
    activate_mentor: "Mentor activated",
    suspend_mentor: "Mentor suspended",
    update_mentor_status: "Status updated",
    "application:pending": "Application submitted",
    "application:approved": "Application approved",
    "application:rejected": "Application rejected",
    "application:under_review": "Application under review",
  };
  return pretty[event] || event.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function formatDate(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}
