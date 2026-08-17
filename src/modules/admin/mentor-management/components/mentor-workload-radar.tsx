import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useMentorWorkload } from "@/hooks/use-admin-operations";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  light: { label: "Light", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  balanced: { label: "Balanced", color: "bg-blue-50 text-blue-700 border-blue-200" },
  busy: { label: "Busy", color: "bg-amber-50 text-amber-700 border-amber-200" },
  overloaded: { label: "Overloaded", color: "bg-red-50 text-red-700 border-red-200" },
};

export function MentorWorkloadRadar({ mentorId }: { mentorId: string }) {
  const { data, isLoading, isError } = useMentorWorkload(mentorId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workload Radar</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data || data.workloads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workload Radar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No workload data available.</p>
        </CardContent>
      </Card>
    );
  }

  const w = data.workloads[0];
  const config = STATUS_CONFIG[w.status] || STATUS_CONFIG.light;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workload Radar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold">{w.todayCount}</span>
          <div>
            <p className="text-sm font-medium">Sessions Today</p>
            <p className="text-xs text-muted-foreground">{w.weekCount} this week</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
          {w.pendingRequests > 0 && (
            <Badge variant="secondary">
              {w.pendingRequests} pending request{w.pendingRequests !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          {w.details.map((d, i) => (
            <p key={i} className="text-xs text-muted-foreground">• {d}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
