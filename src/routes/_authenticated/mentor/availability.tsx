import { createFileRoute, Link } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { PageHeader } from "@/components/mentor/page-header";
import { MentorAvailability } from "@/components/mentor-availability";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, Clock, CalendarDays } from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/mentor/availability")({
  component: MentorAvailabilityPage,
});

function MentorAvailabilityPage() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;

  const { data: upcomingSessions = [] } = useQuery({
    queryKey: ["mentor-availability-upcoming", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("scheduled_time, duration_mins, student:student_id(full_name)")
        .eq("mentor_id", uid!)
        .in("status", ["accepted", "confirmed"])
        .gte("scheduled_time", new Date().toISOString())
        .order("scheduled_time", { ascending: true })
        .limit(5);
      return (data ?? []) as any[];
    },
  });

  const insights = useMemo(() => {
    const result: { type: "info" | "suggestion"; title: string; description: string; action?: string }[] = [];

    if (upcomingSessions.length === 0) {
      result.push({
        type: "info",
        title: "No upcoming bookings",
        description: "Once students start booking, you'll see your schedule here.",
      });
    }

    const eveningSlots = upcomingSessions.filter((s: any) => {
      const hour = new Date(s.scheduled_time).getHours();
      return hour >= 17 && hour <= 20;
    }).length;

    if (eveningSlots >= 2) {
      result.push({
        type: "suggestion",
        title: "Evening slots are popular",
        description: `${eveningSlots} of your upcoming sessions are in the 5–8 PM window. Consider adding more evening availability.`,
        action: "Add availability",
      });
    }

    return result;
  }, [upcomingSessions]);

  const nextAvailable = useMemo(() => {
    if (upcomingSessions.length === 0) return null;
    return upcomingSessions[0];
  }, [upcomingSessions]);

  return (
    <MentorLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title="Availability"
          description="Set when students can book sessions with you."
        />

        {upcomingSessions.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium tracking-[0.12em] uppercase text-muted-foreground">
                Next available
              </span>
            </div>
            <div className="space-y-2">
              {upcomingSessions.slice(0, 3).map((s: any, idx: number) => {
                const dt = parseISO(s.scheduled_time);
                const dayLabel = isToday(dt)
                  ? "Today"
                  : isTomorrow(dt)
                    ? "Tomorrow"
                    : format(dt, "EEE, MMM d");
                return (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {dayLabel} · {format(dt, "h:mm a")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.student?.full_name || "Student"} · {s.duration_mins} min
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Booked</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {insights.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium tracking-[0.12em] uppercase text-muted-foreground">
                Availability insight
              </span>
            </div>
            <div className="space-y-3">
              {insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-border/40 p-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    insight.type === "suggestion" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"
                  }`}>
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                    {insight.action && (
                      <Button variant="ghost" size="sm" className="mt-2 h-8 text-xs" asChild>
                        <Link to="/mentor/availability">{insight.action}</Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <MentorAvailability />
      </div>
    </MentorLayout>
  );
}
