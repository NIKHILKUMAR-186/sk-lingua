import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ExploreErrorBoundary } from "@/components/explore-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Shield,
  GraduationCap,
  Languages,
  CalendarX,
  ArrowRight,
  Clock,
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  Target,
  MessageSquare,
  TrendingUp,
  Video,
} from "lucide-react";
import { useAvailableMentors } from "@/hooks/use-available-mentors";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { DateSelector } from "@/components/date-selector";
import {
  getRecommendedMentors,
  type BookingMentorViewModel,
  dateLabel,
  mentorFitSignal,
  TIME_PREFERENCE_LABEL,
  type TimePreference,
} from "@/lib/booking/view-models";
import { useStudentLearningState } from "@/hooks/use-student-learning-state";
import { useHasUsedDemoSession } from "@/hooks/use-demo-bookings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/student/explore")({
  component: ExplorePage,
});

type SortOption = "recommended" | "rating" | "experience" | "earliest";

const GOALS = [
  { id: "speaking", label: "Speaking", icon: MessageSquare },
  { id: "grammar", label: "Grammar", icon: GraduationCap },
  { id: "pronunciation", label: "Pronunciation", icon: TrendingUp },
  { id: "confidence", label: "Confidence", icon: Target },
  { id: "fluency", label: "Fluency", icon: Sparkles },
  { id: "interview", label: "Interview Prep", icon: Shield },
] as const;

function ExplorePage() {
  const queryClient = useQueryClient();
  const { data: auth } = useAuth();
  const { data: demoUsage = { used: false } } = useHasUsedDemoSession(auth?.user?.id ?? null);
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [language, setLanguage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState<string | null>(null);
  const [timePref, setTimePref] = useState<TimePreference>("any");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const { availableMentors, mentorsLoading, dateAvailability } = useAvailableMentors(selectedDate);
  const learningState = useStudentLearningState();

  useRealtimeSubscription({
    channel: "discover-mentors-availability",
    table: "availability_slots",
    event: "*",
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["available-mentors-list"] });
      queryClient.invalidateQueries({ queryKey: ["availability-slots-all"] });
      queryClient.invalidateQueries({ queryKey: ["date-availability-preview"] });
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["available-mentors-list"] });
      queryClient.invalidateQueries({ queryKey: ["availability-slots-all"] });
      queryClient.invalidateQueries({ queryKey: ["date-availability-preview"] });
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["available-mentors-list"] });
      queryClient.invalidateQueries({ queryKey: ["availability-slots-all"] });
      queryClient.invalidateQueries({ queryKey: ["date-availability-preview"] });
    },
    filter: undefined,
  });

  useRealtimeSubscription({
    channel: "discover-mentors-sessions",
    table: "sessions",
    event: "*",
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions-date-range"] });
      queryClient.invalidateQueries({ queryKey: ["available-mentors-list"] });
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions-date-range"] });
      queryClient.invalidateQueries({ queryKey: ["available-mentors-list"] });
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions-date-range"] });
      queryClient.invalidateQueries({ queryKey: ["available-mentors-list"] });
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

  const filteredAndSorted = useMemo(() => {
    const list = [...mentors];
    if (sortBy === "rating") {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === "experience") {
      list.sort((a, b) => b.yearsExperience - a.yearsExperience);
    } else if (sortBy === "earliest") {
      list.sort((a, b) =>
        (a.earliestSlot?.startIso || "").localeCompare(b.earliestSlot?.startIso || ""),
      );
    }
    return list;
  }, [mentors, sortBy]);

  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    availableMentors.forEach((m) => m.languages_taught?.forEach((l) => langs.add(l)));
    return Array.from(langs).sort();
  }, [availableMentors]);

  const allStyles = useMemo(() => {
    const s = new Set<string>();
    availableMentors.forEach((m) => {
      if (m.teaching_style) s.add(m.teaching_style);
    });
    return Array.from(s).sort();
  }, [availableMentors]);

  const slotInPref = (group: string): boolean => {
    if (timePref === "any") return true;
    if (timePref === "evening") return group === "evening" || group === "night";
    return group === timePref;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return filteredAndSorted.filter((m) => {
      if (style && (m.teachingStyle || "") !== style) return false;
      if (
        timePref !== "any" &&
        !m.availableSlots.some((s) =>
          timePref === "evening"
            ? s.group === "evening" || s.group === "night"
            : s.group === timePref,
        )
      )
        return false;
      if (selectedGoal && !m.reasons.some((r) => r.toLowerCase().includes(selectedGoal))) {
        // Soft filter: still show mentors but they won't be "recommended" for this goal
      }
      if (q) {
        const hay = [m.name, m.headline, m.bio, m.teachingStyle, m.primaryLanguage, ...m.languages]
          .filter((x): x is string => !!x)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filteredAndSorted, query, style, timePref, selectedGoal]);

  const hasActiveFilters = !!query || !!language || !!style || timePref !== "any";

  function clearFilters() {
    setQuery("");
    setLanguage(null);
    setStyle(null);
    setTimePref("any");
    setShowMoreFilters(false);
    setSelectedGoal(null);
  }

  const selectedDateLabel = dateLabel(selectedDate);

  const nextAvailableDate = useMemo(() => {
    const next = dateAvailability.find((a) => a.count > 0 && a.dateStr > selectedDate);
    return next || null;
  }, [dateAvailability, selectedDate]);

  return (
    <StudentLayout>
      <ExploreErrorBoundary>
        <div className="mx-auto max-w-5xl space-y-8">
          <div>
            <h1 className="text-3xl font-display tracking-tight">Find a Mentor</h1>
            <p className="mt-1 text-muted-foreground">
              Explore mentors and find someone who matches your learning goals.
            </p>
          </div>

          {learningState.state === "TRIAL_REQUIRED" && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Video className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">Start with a demo</h3>
                    <p className="text-sm text-muted-foreground">
                      Book a personalized demo session to find your ideal mentor.
                    </p>
                  </div>
                </div>
                <Button asChild size="lg" className="shrink-0 gap-2">
                  <Link to="/student/demo-session">
                    Book a Demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {learningState.state === "TRIAL_COMPLETED_NO_SUBSCRIPTION" && (
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-background">
              <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                    <Sparkles className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">Choose a plan</h3>
                    <p className="text-sm text-muted-foreground">
                      Your demo is complete. Pick a plan to start booking regular sessions.
                    </p>
                  </div>
                </div>
                <Button asChild size="lg" variant="default" className="shrink-0 gap-2">
                  <Link to="/student/pricing">
                    View Plans
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Goal Selection */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">
              What would you like to improve?
            </div>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setSelectedGoal(selectedGoal === goal.id ? null : goal.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                    selectedGoal === goal.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <goal.icon className="h-3.5 w-3.5" />
                  {goal.label}
                </button>
              ))}
            </div>
          </div>

          <DateSelector
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            dateAvailability={dateAvailability}
          />

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, language, style or topic…"
              className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-9 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Search mentors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Language</span>
              {allLanguages.length > 0 ? (
                <>
                  <Button
                    variant={language === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLanguage(null)}
                  >
                    All
                  </Button>
                  {allLanguages.slice(0, 6).map((lang) => (
                    <Button
                      key={lang}
                      variant={language === lang ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLanguage(lang === language ? null : lang)}
                    >
                      {lang}
                    </Button>
                  ))}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Loading languages…</span>
              )}

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowMoreFilters((v) => !v)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                More filters
                {(style || timePref !== "any") && (
                  <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort</span>
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

          {/* Progressive "More filters" */}
          {showMoreFilters && (
            <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
              {allStyles.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Teaching style</span>
                  <button
                    type="button"
                    onClick={() => setStyle(null)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium",
                      !style
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    All
                  </button>
                  {allStyles.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStyle(s === style ? null : s)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium",
                        style === s
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Time preference</span>
                {(["any", "morning", "afternoon", "evening"] as TimePreference[]).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setTimePref(tp)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium",
                      timePref === tp
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {TIME_PREFERENCE_LABEL[tp]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!demoUsage.used && (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-4 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Not sure where to start?</p>
                  <p className="text-xs text-muted-foreground">
                    Book a demo and let us help you find the right mentor.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="mt-3 sm:mt-0">
                  <Link to="/student/demo-session">Book a demo</Link>
                </Button>
              </CardContent>
            </Card>
          )}

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
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                <CalendarX className="h-7 w-7 text-muted-foreground/60" />
              </div>
              {hasActiveFilters ? (
                <>
                  <h3 className="text-lg font-semibold">No mentors match your filters</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try a different search or clear your filters to see more options.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold">
                    No mentors with open slots on {selectedDateLabel}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try another date, or browse all mentors to find one that fits your schedule.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {nextAvailableDate && (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedDate(nextAvailableDate.dateStr)}
                      >
                        {format(parseISO(nextAvailableDate.dateStr), "d MMM")} ·{" "}
                        {nextAvailableDate.count} mentor
                        {nextAvailableDate.count !== 1 ? "s" : ""} available
                      </Button>
                    )}
                    <Button asChild variant="outline">
                      <Link to="/student/explore">Browse mentors</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {!mentorsLoading && filtered.length > 0 && (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-medium">
                    {filtered.length} mentor{filtered.length !== 1 ? "s" : ""} available
                  </span>
                  <span className="text-sm text-muted-foreground">
                    · {selectedDate ? `on ${selectedDateLabel}` : "flexible dates"}
                  </span>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((mentor) => (
                  <MentorCard
                    key={mentor.id}
                    mentor={mentor}
                    selectedDate={selectedDate}
                    fit={mentorFitSignal(mentor)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </ExploreErrorBoundary>
    </StudentLayout>
  );
}

function MentorCard({
  mentor,
  selectedDate,
  fit,
}: {
  mentor: BookingMentorViewModel;
  selectedDate: string;
  fit?: string | null;
}) {
  return (
    <Card className="flex h-full flex-col transition-shadow duration-200 hover:shadow-md">
      <CardContent className="flex flex-1 flex-col p-5">
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
            {mentor.headline && (
              <p className="truncate text-xs text-muted-foreground">{mentor.headline}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {mentor.rating != null && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {mentor.rating.toFixed(1)}
                  {mentor.totalReviews > 0 && <span>({mentor.totalReviews})</span>}
                </span>
              )}
              {mentor.yearsExperience > 0 && <span>· {mentor.yearsExperience} yr</span>}
            </div>
          </div>
        </div>

        {mentor.bio && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{mentor.bio}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {mentor.languages.length > 0 && (
            <span className="flex items-center gap-1">
              <Languages className="h-3 w-3" /> {mentor.languages.slice(0, 2).join(", ")}
            </span>
          )}
          {mentor.teachingStyle && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" /> {mentor.teachingStyle}
            </span>
          )}
        </div>

        {fit && (
          <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-primary/5 px-2.5 py-2 text-xs text-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            {fit}
          </div>
        )}

        {mentor.earliestSlot && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            Next available {dateLabel(selectedDate)} at {mentor.earliestSlot.startLabel}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <Button size="sm" asChild className="w-full">
            <Link to={`/student/mentor/$id`} params={{ id: mentor.id }}>
              View Profile
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild className="w-full">
            <Link to="/student/book-session" search={{ mentor: mentor.id }}>
              See availability
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
