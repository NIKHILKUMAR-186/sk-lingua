import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { MentorPublicProfile } from "@/components/mentor-public-profile";
import { MentorRatingSummary } from "@/components/review/MentorRatingSummary";
import { useMentorRatingSummary } from "@/hooks/use-reviews";
import { format } from "date-fns";
import { DashboardSkeleton } from "@/components/skeleton-loader";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/student/mentor/$id")({
  component: MentorProfile,
});

function MentorProfile() {
  const { id } = Route.useParams();
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: mentor, isLoading } = useQuery({
    queryKey: ["mentor-full", id],
    queryFn: async () => {
      const [{ data: mp }, { data: profile }] = await Promise.all([
        supabase.from("mentor_profiles").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      ]);
      return { mp, profile };
    },
  });

  const {
    reviews: summaryReviews,
    stats: summaryStats,
    isLoading: summaryLoading,
  } = useMentorRatingSummary(id);

  const { data: availSlots = [] } = useQuery({
    queryKey: ["availability-slots", id],
    enabled: !!id,
    queryFn: async () =>
      (
        await supabase
          .from("availability_slots")
          .select("*")
          .eq("mentor_id", id)
          .eq("is_available", true)
          .order("start_time", { ascending: true })
          .limit(20)
      ).data ?? [],
  });

  const nextSlots = useMemo(() => {
    const now = new Date();
    return availSlots.filter((s) => new Date(s.start_time) > now).slice(0, 3);
  }, [availSlots]);

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-5xl">
          <DashboardSkeleton />
        </div>
      </StudentLayout>
    );
  }

  if (!mentor?.mp) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-5xl">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/student/explore" })}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="mt-8 text-center text-muted-foreground">Mentor not found.</div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/student/explore" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to mentors
        </Button>

        <MentorPublicProfile mentor={mentor.mp} profile={mentor.profile} />

        {/* Availability preview */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" /> Availability
            </h2>
            {nextSlots.length > 0 ? (
              <div className="space-y-2">
                {nextSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {format(new Date(slot.start_time), "d MMM yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(slot.start_time), "h:mm a")} · 30 min
                      </div>
                    </div>
                    <Button size="sm" asChild>
                      <Link to="/student/book-session" search={{ mentor: id }}>
                        Book
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming availability shown. Check the booking page for the latest slots.
              </p>
            )}
            <div className="mt-4">
              <Button asChild className="w-full sm:w-auto">
                <Link to="/student/book-session" search={{ mentor: id }}>
                  See all availability
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <MentorRatingSummary
          stats={summaryStats}
          reviews={summaryReviews}
          isLoading={summaryLoading}
        />
      </div>
    </StudentLayout>
  );
}
