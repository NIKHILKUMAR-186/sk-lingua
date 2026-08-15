import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { MentorPublicProfile } from "@/components/mentor-public-profile";
import { BookingCalendar } from "@/components/booking-calendar";
import {
  SessionConfirmCard,
  BookingSuccessCard,
} from "@/components/session-confirm-card";
import { MentorRatingSummary } from "@/components/review/MentorRatingSummary";
import { useMentorRatingSummary } from "@/hooks/use-reviews";
import { useAvailableSlots, calculateAvailableDates } from "@/hooks/use-booking";
import { useConfirmBooking } from "@/hooks/use-student-booking";
import { useStudentSubscription } from "@/hooks/use-subscriptions";
import { format } from "date-fns";
import { DashboardSkeleton } from "@/components/skeleton-loader";

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

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ scheduled_time: string } | null>(null);

  const slotDurationMins = 30;

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
      ).data ?? [],
  });

  const { slotOptions, groupedSlots } = useAvailableSlots(id, selectedDate, slotDurationMins);

  const availableDates = useMemo(() => {
    if (!availSlots.length) return [];
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 2);
    return calculateAvailableDates(availSlots, start, end);
  }, [availSlots]);

  const confirmBooking = useConfirmBooking();
  const { data: subscription } = useStudentSubscription(auth?.user?.id ?? null);
  const usableBefore =
    (subscription?.current_session_slots ?? 0) + (subscription?.bonus_slots ?? 0);
  const usableAfter = Math.max(0, usableBefore - 1);

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
  }

  function handleSelectSlot(slot: string | null) {
    setSelectedSlot(slot);
  }

  async function handleConfirmBooking() {
    if (!selectedSlot) return;

    try {
      const booking = await confirmBooking.mutateAsync({
        mentorId: id,
        scheduledStart: selectedSlot,
        durationMins: slotDurationMins,
      });
      setBooked(booking ?? { scheduled_time: selectedSlot });
      setSelectedSlot(null);
      qc.invalidateQueries({ queryKey: ["sessions-date"] });
      toast.success("Session booked!");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Unable to book this session. Please try again.",
      );
    }
  }

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

  const hasSelectedDate = !!selectedDate;
  const hasSelectedSlot = !!selectedSlot;

  return (
    <StudentLayout>
      <div className="mx-auto max-w-6xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/student/explore" })}
          className="mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to mentors
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <MentorPublicProfile
              mentor={mentor.mp}
              profile={mentor.profile}
            />

            <MentorRatingSummary
              stats={summaryStats}
              reviews={summaryReviews}
              isLoading={summaryLoading}
            />
          </div>

          <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    hasSelectedDate
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  1
                </span>
                <span
                  className={
                    hasSelectedDate ? "text-foreground font-medium" : "text-muted-foreground"
                  }
                >
                  Select Date
                </span>
              </div>
              <div className="h-px flex-1 bg-border mx-2" />
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    hasSelectedSlot
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  2
                </span>
                <span
                  className={
                    hasSelectedSlot ? "text-foreground font-medium" : "text-muted-foreground"
                  }
                >
                  Book
                </span>
              </div>
            </div>

            <BookingCalendar
              slots={availSlots as any}
              availableDates={availableDates}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              groupedSlots={groupedSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={handleSelectSlot}
            />

            {booked ? (
              <BookingSuccessCard
                mentorName={mentor.profile?.full_name || "Mentor"}
                dateLabel={format(new Date(booked.scheduled_time), "d MMM yyyy")}
                slotLabel={format(new Date(booked.scheduled_time), "h:mm a")}
                sessionsRemaining={usableAfter}
                onViewSessions={() => navigate({ to: "/student/sessions" })}
              />
            ) : hasSelectedSlot ? (
              <SessionConfirmCard
                mentorName={mentor.profile?.full_name || "Mentor"}
                date={selectedDate}
                slotLabel={slotOptions.find((s) => s.value === selectedSlot)?.label || ""}
                durationMins={slotDurationMins}
                sessionsBefore={usableBefore}
                sessionsAfter={usableAfter}
                isPending={confirmBooking.isPending}
                onConfirm={handleConfirmBooking}
                onCancel={() => setSelectedSlot(null)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
