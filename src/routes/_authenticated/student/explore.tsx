import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Star,
  Shield,
  GraduationCap,
  Languages,
  PlayCircle,
  Users,
  CalendarX,
  ArrowRight,
} from "lucide-react";
import { useAvailableMentors } from "@/hooks/use-available-mentors";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { DateSelector } from "@/components/date-selector";
import {
  getRecommendedMentors,
  type BookingMentorViewModel,
  dateLabel,
} from "@/lib/booking/view-models";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/student/explore")({
  component: DiscoverMentors,
});

function DiscoverMentors() {
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [language, setLanguage] = useState<string | null>(null);

  const { availableMentors, mentorsLoading, dateAvailability } = useAvailableMentors(selectedDate);

  useRealtimeSubscription({
    channel: "discover-mentors-availability",
    table: "availability_slots",
    event: "*",
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["available-mentors-list"] });
      queryClient.invalidateQueries({ queryKey: ["availability-slots-day"] });
      queryClient.invalidateQueries({ queryKey: ["date-availability-preview"] });
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["available-mentors-list"] });
      queryClient.invalidateQueries({ queryKey: ["availability-slots-day"] });
      queryClient.invalidateQueries({ queryKey: ["date-availability-preview"] });
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["available-mentors-list"] });
      queryClient.invalidateQueries({ queryKey: ["availability-slots-day"] });
      queryClient.invalidateQueries({ queryKey: ["date-availability-preview"] });
    },
    filter: undefined,
  });

  useRealtimeSubscription({
    channel: "discover-mentors-sessions",
    table: "sessions",
    event: "*",
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions-date-all"] });
      queryClient.invalidateQueries({ queryKey: ["sessions-date-all", selectedDate] });
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions-date-all"] });
      queryClient.invalidateQueries({ queryKey: ["sessions-date-all", selectedDate] });
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions-date-all"] });
      queryClient.invalidateQueries({ queryKey: ["sessions-date-all", selectedDate] });
    },
    filter: undefined,
  });

  const criteria = useMemo(
    () => ({ intent: "today" as const, timePreference: "any" as const, selectedDate, language }),
    [selectedDate, language],
  );

  const mentors = useMemo(
    () => getRecommendedMentors(availableMentors, criteria),
    [availableMentors, criteria],
  );

  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    availableMentors.forEach((m) => m.languages_taught?.forEach((l) => langs.add(l)));
    return Array.from(langs).sort();
  }, [availableMentors]);

  return (
    <StudentLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Discover Mentors</h1>
          <p className="mt-1 text-muted-foreground">
            Meet the people who can help you reach your learning goals.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-3">
          <DateSelector
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            dateAvailability={dateAvailability}
          />
          {allLanguages.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Language</span>
              <button
                type="button"
                onClick={() => setLanguage(null)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium",
                  language === null
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                All
              </button>
              {allLanguages.slice(0, 8).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l === language ? null : l)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium",
                    language === l
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        {mentorsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 rounded" />
                        <Skeleton className="h-3 w-1/2 rounded" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-3 w-2/3 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : mentors.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
              <CalendarX className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold">
              No mentors with open slots on {dateLabel(selectedDate)}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another date, or use Book a Session for the best available options.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/student/book">
                Book a Session <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mentors.map((mentor) => (
              <DiscoverMentorCard key={mentor.id} mentor={mentor} selectedDate={selectedDate} />
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

function DiscoverMentorCard({
  mentor,
  selectedDate,
}: {
  mentor: BookingMentorViewModel;
  selectedDate: string;
}) {
  return (
    <Card className="flex h-full flex-col transition-shadow duration-200 hover:shadow-md">
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 rounded-xl">
            <AvatarImage src={mentor.avatarUrl || undefined} alt={mentor.name} />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
              {mentor.nameInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold">{mentor.name}</span>
              {mentor.isVerified && (
                <Shield className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Verified" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {mentor.rating != null && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {mentor.rating.toFixed(1)}
                </span>
              )}
              {mentor.totalReviews > 0 && <span>({mentor.totalReviews})</span>}
              {mentor.yearsExperience > 0 && <span>· {mentor.yearsExperience} yr</span>}
            </div>
          </div>
        </div>

        {mentor.headline && <p className="mt-3 text-sm font-medium">{mentor.headline}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {mentor.languages.length > 0 && (
            <span className="flex items-center gap-1">
              <Languages className="h-3 w-3" /> {mentor.languages.join(", ")}
            </span>
          )}
          {mentor.teachingStyle && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" /> Style: {mentor.teachingStyle}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {mentor.raw.total_students || 0} students
          </span>
        </div>

        {mentor.introVideoUrl && (
          <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <PlayCircle className="h-3 w-3" /> Intro video
          </div>
        )}

        {mentor.bio && (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{mentor.bio}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link to="/student/mentor/$id" params={{ id: mentor.id }}>
              View Mentor
            </Link>
          </Button>
          <Button size="sm" asChild className="flex-1">
            <Link to="/student/book">Book a Session</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
