import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2, XCircle, Hourglass, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRating } from "@/lib/mentor-domain";
import { MentorStatusBadge } from "./mentor-badges";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "./mentor-badges";
import type { MentorDetail } from "@/lib/mentor-domain";

function StatMini({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
      <div className={cn("rounded-lg p-1.5", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium leading-none">{value}</p>
      </div>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  completed: "text-green-600",
  cancelled: "text-red-600",
  confirmed: "text-blue-600",
  rejected: "text-red-600",
};

export function MentorPerformance({ mentor }: { mentor: MentorDetail }) {
  const p = mentor.performance;
  const b = p.breakdown;
  const recent = p.recentSessions || [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session performance</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <StatMini
            label="Total sessions"
            value={b.total}
            icon={BarChart3}
            color="bg-slate-100 text-slate-700"
          />
          <StatMini
            label="Completed"
            value={b.completed}
            icon={CheckCircle2}
            color="bg-green-50 text-green-700"
          />
          <StatMini
            label="Cancelled"
            value={b.cancelled}
            icon={XCircle}
            color="bg-red-50 text-red-700"
          />
          <StatMini
            label="Confirmed"
            value={b.confirmed}
            icon={Hourglass}
            color="bg-blue-50 text-blue-700"
          />
          <StatMini
            label="Completion rate"
            value={`${p.completionRate}%`}
            icon={CheckCircle2}
            color={
              p.completionRate >= 80
                ? "bg-green-50 text-green-700"
                : p.completionRate >= 50
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
            }
          />
          <StatMini
            label="Cancellation rate"
            value={b.total > 0 ? `${p.cancellationRate}%` : "—"}
            icon={XCircle}
            color={
              p.cancellationRate <= 20 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">No sessions recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {initials(s.studentName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{s.studentName || "Student"}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(s.scheduledTime)}
                    </TableCell>
                    <TableCell>
                      <MentorStatusBadge
                        status={s.status === "completed" ? "active" : (s.status as any)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
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
