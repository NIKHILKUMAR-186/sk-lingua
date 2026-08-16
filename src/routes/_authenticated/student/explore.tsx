import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { DateSelector } from "@/components/date-selector";
import { MentorCard } from "@/components/mentor-card";
import { Button } from "@/components/ui/button";
import { ExploreErrorBoundary } from "@/components/explore-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Users, CalendarX } from "lucide-react";
import { useAvailableMentors } from "@/hooks/use-available-mentors";
import { useQueryClient } from "@tanstack/react-query";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

export const Route = createFileRoute("/_authenticated/student/explore")({
  component: ExplorePage,
});

type SortOption = "recommended" | "rating" | "experience" | "earliest";

function ExplorePage() {
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");

  const { availableMentors, mentorsLoading, dateAvailability, selectedDate: _sd, dayKey } =
    useAvailableMentors(selectedDate);

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

  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    availableMentors.forEach((m) => {
      m.languages_taught?.forEach((l) => langs.add(l));
    });
    return Array.from(langs).sort();
  }, [availableMentors]);

  const filteredAndSorted = useMemo(() => {
    let result = [...availableMentors];

    if (languageFilter) {
      result = result.filter((m) => m.languages_taught?.includes(languageFilter));
    }

    switch (sortBy) {
      case "rating":
        result.sort((a, b) => b.rating_avg - a.rating_avg);
        break;
      case "experience":
        result.sort((a, b) => b.years_experience - a.years_experience);
        break;
      case "earliest":
        result.sort((a, b) => {
          const aTime = a.earliestSlot ? parseISO(a.earliestSlot.value).getTime() : Infinity;
          const bTime = b.earliestSlot ? parseISO(b.earliestSlot.value).getTime() : Infinity;
          return aTime - bTime;
        });
        break;
      case "recommended":
      default:
        result.sort((a, b) => {
          const scoreA = a.rating_avg * 10 + a.total_sessions * 0.1 + a.totalAvailable * 5;
          const scoreB = b.rating_avg * 10 + b.total_sessions * 0.1 + b.totalAvailable * 5;
          return scoreB - scoreA;
        });
        break;
    }

    return result;
  }, [availableMentors, languageFilter, sortBy]);

  const nextAvailableDate = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const current = new Date(selectedDate + "T00:00:00");
    for (let i = 1; i < 14; i++) {
      const d = addDays(current, i);
      const ds = format(d, "yyyy-MM-dd");
      const avail = dateAvailability.find((a) => a.dateStr === ds);
      if (avail && avail.count > 0) {
        return avail;
      }
    }
    return null;
  }, [selectedDate, dateAvailability]);

  const selectedDateObj = parseISO(selectedDate);
  const selectedDateLabel = isSameDay(selectedDateObj, new Date())
    ? "Today"
    : isSameDay(selectedDateObj, addDays(new Date(), 1))
      ? "Tomorrow"
      : format(selectedDateObj, "d MMM");

  return (
    <StudentLayout>
      <ExploreErrorBoundary>
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-3xl font-display">Find your mentor</h1>
            <p className="text-muted-foreground">
              Choose a date and book an available session.
            </p>
          </div>

          <DateSelector
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            dateAvailability={dateAvailability}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter:</span>
              {allLanguages.length > 0 ? (
                <>
                  <Button
                    variant={languageFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLanguageFilter(null)}
                  >
                    All
                  </Button>
                  {allLanguages.slice(0, 6).map((lang) => (
                    <Button
                      key={lang}
                      variant={languageFilter === lang ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLanguageFilter(lang)}
                    >
                      {lang}
                    </Button>
                  ))}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Loading languages...</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="recommended">Recommended</option>
                <option value="rating">Highest rated</option>
                <option value="experience">Most experienced</option>
                <option value="earliest">Earliest available</option>
              </select>
            </div>
          </div>

          {mentorsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4 rounded" />
                          <Skeleton className="h-3 w-1/2 rounded" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-full rounded" />
                      <Skeleton className="h-3 w-2/3 rounded" />
                      <div className="space-y-2 pt-2">
                        <Skeleton className="h-10 w-full rounded-lg" />
                        <Skeleton className="h-10 w-full rounded-lg" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                <CalendarX className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-semibold">
                No mentors available on {selectedDateLabel}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try selecting another date from the calendar above.
              </p>
              {nextAvailableDate && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSelectedDate(nextAvailableDate.dateStr)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {nextAvailableDate.count} mentor{nextAvailableDate.count !== 1 ? "s" : ""} available on{" "}
                  {format(parseISO(nextAvailableDate.dateStr), "d MMM")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSorted.map((mentor) => (
                <MentorCard
                  key={mentor.user_id}
                  mentor={mentor}
                  selectedDate={selectedDate}
                />
              ))}
            </div>
          )}
        </div>
      </ExploreErrorBoundary>
    </StudentLayout>
  );
}