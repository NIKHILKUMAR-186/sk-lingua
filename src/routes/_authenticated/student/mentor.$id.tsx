import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { MentorPublicProfile } from "@/components/mentor-public-profile";
import { BookingCalendar } from "@/components/booking-calendar";
import { BookingSummary } from "@/components/booking-summary";
import { MentorRatingSummary } from "@/components/review/MentorRatingSummary";
import { useMentorRatingSummary } from "@/hooks/use-reviews";
import {
  useAvailableSlots,
  useBookingRequest,
  calculateAvailableDates,
  type BookingSummary as BookingSummaryType,
} from "@/hooks/use-booking";
import { DashboardSkeleton } from "@/components/skeleton-loader";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/student/mentor/$id")({
  component: MentorProfile,
});

function MentorProfile() {
  const { id } = Route.useParams();
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Fetch mentor data
  const { data: mentor, isLoading } = useQuery({
    queryKey: ["mentor-full", id],
    queryFn: async () => {
      const [{ data: mp }, { data: profile }, { data: gigs }] = await Promise.all([
        supabase.from("mentor_profiles").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("gigs")
          .select("*")
          .eq("mentor_id", id)
          .eq("is_active", true)
          .eq("is_archived", false)
          .order("featured", { ascending: false }),
      ]);
      return { mp, profile, gigs: gigs ?? [] };
    },
  });

  // Reviews with new MentorRatingSummary
  const {
    reviews: summaryReviews,
    stats: summaryStats,
    isLoading: summaryLoading,
  } = useMentorRatingSummary(id);

  // Booking state
  const [selectedGig, setSelectedGig] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Get duration from selected gig
  const durationMins = useMemo(() => {
    if (!selectedGig || !mentor?.gigs) return 30;
    const gig = mentor.gigs.find((g) => g.id === selectedGig);
    return gig?.duration_mins || 30;
  }, [selectedGig, mentor?.gigs]);

  // Availability & slots
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

  const { slotOptions, groupedSlots } = useAvailableSlots(id, selectedDate, durationMins);

  // Available dates for calendar
  const availableDates = useMemo(() => {
    if (!availSlots.length) return [];
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 2);
    return calculateAvailableDates(availSlots, start, end);
  }, [availSlots]);

  // Booking mutation
  const bookingRequest = useBookingRequest(id);

  function handleSelectGig(gigId: string) {
    setSelectedGig(gigId === selectedGig ? null : gigId);
    setSelectedDate("");
    setSelectedSlot(null);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
  }

  function handleSelectSlot(slot: string | null) {
    setSelectedSlot(slot);
  }

  async function handleConfirmBooking() {
    if (!auth?.user || !selectedGig || !selectedSlot || !mentor?.mp || !mentor?.gigs) return;

    const gig = mentor.gigs.find((g) => g.id === selectedGig);
    if (!gig) return;

    const summary: BookingSummaryType = {
      mentorName: mentor.profile?.full_name || "Mentor",
      gigTitle: gig.title,
      gigPrice: gig.price,
      gigDuration: gig.duration_mins,
      date: selectedDate,
      slotLabel: slotOptions.find((s) => s.value === selectedSlot)?.label || "",
      total: gig.price,
      mentorId: id,
      gigId: gig.id,
      scheduledTime: selectedSlot,
      studentMessage: message,
    };

    try {
      await bookingRequest.mutateAsync(summary);
      toast.success("Booking request sent!");
      qc.invalidateQueries({ queryKey: ["sessions-date"] });
      navigate({ to: "/student/sessions" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Booking failed");
    }
  }

  if (isLoading) {
    return (
      <AppShell variant="student">
        <div className="mx-auto max-w-5xl">
          <DashboardSkeleton />
        </div>
      </AppShell>
    );
  }

  if (!mentor?.mp) {
    return (
      <AppShell variant="student">
        <div className="mx-auto max-w-5xl">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/student/explore" })}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="mt-8 text-center text-muted-foreground">Mentor not found.</div>
        </div>
      </AppShell>
    );
  }

  const hasSelectedGig = !!selectedGig;
  const hasSelectedDate = !!selectedDate;
  const hasSelectedSlot = !!selectedSlot;

  return (
    <AppShell variant="student">
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
          {/* Left column: Mentor profile */}
          <div className="space-y-6">
            <MentorPublicProfile
              mentor={mentor.mp}
              profile={mentor.profile}
              gigs={mentor.gigs}
              onSelectGig={handleSelectGig}
              selectedGigId={selectedGig}
            />

            {/* Reviews - Using new MentorRatingSummary */}
            <MentorRatingSummary
              stats={summaryStats}
              reviews={summaryReviews}
              isLoading={summaryLoading}
            />
          </div>

          {/* Right column: Booking flow */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            {/* Step indicator */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    hasSelectedGig
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  1
                </span>
                <span
                  className={
                    hasSelectedGig ? "text-foreground font-medium" : "text-muted-foreground"
                  }
                >
                  Gig
                </span>
              </div>
              <div className="h-px flex-1 bg-border mx-2" />
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    hasSelectedDate
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  2
                </span>
                <span
                  className={
                    hasSelectedDate ? "text-foreground font-medium" : "text-muted-foreground"
                  }
                >
                  Date
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
                  3
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

            {/* Booking Calendar */}
            {hasSelectedGig && (
              <BookingCalendar
                slots={availSlots as any}
                availableDates={availableDates}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                groupedSlots={groupedSlots}
                selectedSlot={selectedSlot}
                onSelectSlot={handleSelectSlot}
              />
            )}

            {/* Booking Summary */}
            {hasSelectedGig && hasSelectedSlot && mentor?.gigs && (
              <BookingSummary
                summary={{
                  mentorName: mentor.profile?.full_name || "Mentor",
                  gigTitle: mentor.gigs.find((g) => g.id === selectedGig)?.title || "",
                  gigPrice: mentor.gigs.find((g) => g.id === selectedGig)?.price || 0,
                  gigDuration: durationMins,
                  date: selectedDate,
                  slotLabel: slotOptions.find((s) => s.value === selectedSlot)?.label || "",
                  total: mentor.gigs.find((g) => g.id === selectedGig)?.price || 0,
                  mentorId: id,
                  gigId: selectedGig,
                  scheduledTime: selectedSlot,
                  studentMessage: message,
                }}
                message={message}
                onMessageChange={setMessage}
                onConfirm={handleConfirmBooking}
                isPending={bookingRequest.isPending}
              />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
