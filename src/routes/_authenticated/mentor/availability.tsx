import { createFileRoute, Link } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { PageHeader } from "@/components/mentor/page-header";
import { MentorSectionHeader } from "@/components/mentor-design/MentorSectionHeader";
import { MentorStatusBadge } from "@/components/mentor-design/MentorStatusBadge";
import { MentorInsightCard } from "@/components/mentor-design/MentorInsightCard";
import { MentorPageContainer } from "@/components/mentor-design/MentorPageContainer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, Clock, CalendarDays } from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { useMemo } from "react";
import { MentorAvailability } from "@/components/mentor-availability";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      <MentorPageContainer>
        <PageHeader
          title="Availability"
          description="Set when students can book sessions with you."
        />

        {upcomingSessions.length > 0 && (
          <Card className="mentor-card p-5">
            <MentorSectionHeader
              title="Next available"
              className="mb-3"
              icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
            />
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
                    <MentorStatusBadge status="info" label="Booked" />
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {insights.length > 0 && (
          <Card className="mentor-card p-5">
            <MentorSectionHeader
              title="Availability insight"
              className="mb-3"
              icon={<Lightbulb className="h-4 w-4 text-hi-yellow" />}
            />
            <div className="space-y-3">
              {insights.map((insight, idx) => (
                <MentorInsightCard
                  key={idx}
                  icon={<Lightbulb className="h-4 w-4" />}
                  title={insight.title}
                  description={insight.description}
                  action={
                    insight.action ? (
                      <Button variant="ghost" size="sm" className="mt-2 h-8 text-xs" asChild>
                        <Link to="/mentor/availability">{insight.action}</Link>
                      </Button>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </Card>
        )}

        <MentorAvailability />
      </MentorPageContainer>
    </MentorLayout>
  );
}
