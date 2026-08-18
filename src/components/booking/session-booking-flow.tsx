import { useMemo, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useAvailableMentors, type AvailableMentor } from "@/hooks/use-available-mentors";
import { useBookingRules } from "@/hooks/use-booking-rules";
import { addDays, format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { DateSelector } from "@/components/date-selector";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Star,
  Shield,
  Sparkles,
  CalendarX,
  Check,
  Clock,
  ArrowRight,
  GraduationCap,
  Languages as LanguagesIcon,
  MessageSquare,
  TrendingUp,
  Target,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { BookingConfirmDialog } from "@/components/booking-confirm-dialog";
import { SlotTimeline } from "@/components/booking/slot-timeline";
import { StickyBookingSummary } from "@/components/booking/sticky-booking-summary";
import { MentorPreviewDrawer } from "@/components/booking/mentor-preview-drawer";
import { RaceConditionRecovery } from "@/components/booking/race-condition-recovery";
import {
  getRecommendedMentors,
  type BookingMentorViewModel,
  type BookingSlotViewModel,
  type Intent,
  type TimePreference,
  TIME_PREFERENCE_LABEL,
  dateLabel,
  timestampLabel,
} from "@/lib/booking/view-models";
import { toast } from "sonner";
import { createSlotHold, releaseSlotHold, type BookingHold } from "@/lib/slot-holds";

const GOALS = [
  { id: "speaking", label: "Speaking", icon: MessageSquare },
  { id: "grammar", label: "Grammar", icon: GraduationCap },
  { id: "pronunciation", label: "Pronunciation", icon: TrendingUp },
  { id: "confidence", label: "Confidence", icon: Target },
  { id: "fluency", label: "Fluency", icon: Sparkles },
  { id: "interview", label: "Interview Prep", icon: Shield },
] as const;

const TIME_PREFS: TimePreference[] = ["morning", "afternoon", "evening", "any"];

interface SessionBookingFlowProps {
  preselectedMentorId?: string | null;
}

export function SessionBookingFlow({ preselectedMentorId }: SessionBookingFlowProps) {
  const { data: auth } = useAuth();
  const { data: rules } = useBookingRules();
  const durationMins = rules?.session_duration_minutes ?? 30;

  const today = startOfDay(new Date());
  const todayStr = format(today, "yyyy-MM-dd");

  const [goal, setGoal] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>(todayStr);
  const [filterTimePref, setFilterTimePref] = useState<TimePreference>("any");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [selectedSlotValue, setSelectedSlotValue] = useState<string | null>(null);
  const [previewMentorId, setPreviewMentorId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [raceOpen, setRaceOpen] = useState(false);
  const [raceFailed, setRaceFailed] = useState<string | null>(null);
  const [hold, setHold] = useState<BookingHold | null>(null);
  const [isCreatingHold, setIsCreatingHold] = useState(false);

  const { availableMentors, mentorsLoading, dateAvailability } = useAvailableMentors(filterDate);

  const criteria = useMemo(
    () => ({ intent: "today" as Intent, timePreference: filterTimePref, selectedDate: filterDate, language, selectedGoal: goal }),
    [filterTimePref, filterDate, language, goal],
  );

  const recommended = useMemo(
    () => getRecommendedMentors(availableMentors, criteria),
    [availableMentors, criteria],
  );

  const selectedMentor = useMemo(
    () => recommended.find((m) => m.id === selectedMentorId) ?? null,
    [recommended, selectedMentorId],
  );

  const selectedSlot = useMemo(
    () => selectedMentor?.availableSlots.find((s) => s.id === selectedSlotValue) ?? null,
    [selectedMentor, selectedSlotValue],
  );

  const previewMentor = useMemo(
    () => recommended.find((m) => m.id === previewMentorId) ?? null,
    [recommended, previewMentorId],
  );

  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    availableMentors.forEach((m) => {
      const langsArray = Array.isArray(m.languages) ? m.languages : [];
      langsArray.forEach((l) => langs.add(l));
    });
    return Array.from(langs).sort();
  }, [availableMentors]);

  const flexibleOptions = useMemo(
    () => dateAvailability.filter((a) => a.count > 0),
    [dateAvailability],
  );

  const nextSuggestion = useMemo(() => {
    let best: { mentor: BookingMentorViewModel; slot: BookingSlotViewModel } | null = null;
    for (const m of recommended) {
      for (const s of m.availableSlots) {
        if (!best || new Date(s.startIso).getTime() < new Date(best.slot.startIso).getTime()) {
          best = { mentor: m, slot: s };
        }
      }
    }
    return best;
  }, [recommended]);

  useEffect(() => {
    if (selectedMentorId && !selectedMentor) {
      if (hold?.id) releaseSlotHold(hold.id);
      setSelectedMentorId(null);
      setSelectedSlotValue(null);
      setHold(null);
    }
  }, [selectedMentorId, selectedMentor, hold]);

  useEffect(() => {
    if (
      selectedMentor &&
      selectedSlotValue &&
      !selectedMentor.availableSlots.some((s) => s.id === selectedSlotValue)
    ) {
      if (hold?.id) releaseSlotHold(hold.id);
      setSelectedSlotValue(null);
      setHold(null);
    }
  }, [selectedMentor, selectedSlotValue, hold]);

  useEffect(() => {
    return () => {
      if (hold?.id) {
        releaseSlotHold(hold.id);
      }
    };
  }, [hold]);

  useEffect(() => {
    if (!preselectedMentorId || !recommended.length) return;
    const exists = recommended.some((m) => m.id === preselectedMentorId);
    if (exists && !selectedMentorId) {
      setSelectedMentorId(preselectedMentorId);
    }
  }, [preselectedMentorId, recommended, selectedMentorId]);

  const createHoldForSlot = useCallback(
    async (mentorId: string, slotValue: string) => {
      setIsCreatingHold(true);
      setHold(null);
      try {
        const result = await createSlotHold({
          mentorId,
          scheduledStart: slotValue,
          durationMins,
        });
        if (result.success && result.hold) {
          setHold(result.hold);
        } else {
          toast.error(result.error || "Unable to reserve slot.");
          setSelectedSlotValue(null);
        }
      } catch (e) {
        toast.error("Unable to reserve slot.");
        setSelectedSlotValue(null);
      } finally {
        setIsCreatingHold(false);
      }
    },
    [durationMins],
  );

  function selectSlot(mentor: BookingMentorViewModel, slot: BookingSlotViewModel) {
    setSelectedMentorId(mentor.id);
    setSelectedSlotValue(slot.id);
    createHoldForSlot(mentor.id, slot.id);
  }

  function clearFilters() {
    setGoal(null);
    setLanguage(null);
    setFilterDate(todayStr);
    setFilterTimePref("any");
  }

  const hasActiveFilters = goal || language || filterDate !== todayStr || filterTimePref !== "any";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Book a Session</h1>
          <p className="mt-1 text-muted-foreground">
            Choose what you want to learn, pick a mentor, and book a time that works for you.
          </p>
        </div>

        <Card className="border-border/70">
          <CardContent className="p-4 md:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 space-y-2">
                <div className="text-sm font-medium text-foreground">What would you like to work on?</div>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoal(goal === g.id ? null : g.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        goal === g.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <g.icon className="h-3.5 w-3.5" />
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 sm:w-48">
                <div className="text-sm font-medium text-foreground">Language</div>
                <select
                  value={language ?? ""}
                  onChange={(e) => setLanguage(e.target.value || null)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Any language</option>
                  {allLanguages.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Sheet open={showFilters} onOpenChange={setShowFilters}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filters
                      {hasActiveFilters && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {[goal, language, filterDate !== todayStr, filterTimePref !== "any"].filter(Boolean).length}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>Refine your search</SheetTitle>
                      <SheetDescription>
                        These filters help narrow down mentors. Results update automatically.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-6">
                      <div className="space-y-3">
                        <div className="text-sm font-medium">Date</div>
                        <DateSelector
                          selectedDate={filterDate}
                          onSelectDate={setFilterDate}
                          dateAvailability={dateAvailability}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">Preferred time of day</div>
                        <div className="flex flex-wrap gap-2">
                          {TIME_PREFS.map((tp) => (
                            <button
                              key={tp}
                              type="button"
                              onClick={() => setFilterTimePref(tp)}
                              className={cn(
                                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                filterTimePref === tp
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:bg-accent",
                              )}
                            >
                              {TIME_PREFERENCE_LABEL[tp]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                          <X className="h-4 w-4" />
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {goal && (
                  <Badge variant="secondary" className="gap-1">
                    {GOALS.find((g) => g.id === goal)?.label}
                    <button type="button" onClick={() => setGoal(null)} className="ml-1 hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {language && (
                  <Badge variant="secondary" className="gap-1">
                    {language}
                    <button type="button" onClick={() => setLanguage(null)} className="ml-1 hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterDate !== todayStr && (
                  <Badge variant="secondary" className="gap-1">
                    {dateLabel(filterDate)}
                    <button type="button" onClick={() => setFilterDate(todayStr)} className="ml-1 hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterTimePref !== "any" && (
                  <Badge variant="secondary" className="gap-1">
                    {TIME_PREFERENCE_LABEL[filterTimePref]}
                    <button type="button" onClick={() => setFilterTimePref("any")} className="ml-1 hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!mentorsLoading && recommended.length > 0 && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-medium">Available mentors</span>
              <span className="text-sm text-muted-foreground">
                · {recommended.length} mentor{recommended.length !== 1 ? "s" : ""} available on{" "}
                {dateLabel(filterDate)}
              </span>
            </div>
          )}

          {!mentorsLoading && nextSuggestion && !selectedMentor && (
            <button
              type="button"
              onClick={() => selectSlot(nextSuggestion.mentor, nextSuggestion.slot)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-left transition hover:border-primary/40 hover:bg-primary/10"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Clock className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
                  Next available
                </span>
                <span className="block font-semibold">
                  {timestampLabel(nextSuggestion.slot.startIso)} · with {nextSuggestion.mentor.name}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            </button>
          )}

          {mentorsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-2/3 rounded" />
                          <Skeleton className="h-3 w-1/2 rounded" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-full rounded" />
                      <Skeleton className="h-3 w-3/4 rounded" />
                      <div className="flex gap-2 pt-1">
                        <Skeleton className="h-8 w-16 rounded-full" />
                        <Skeleton className="h-8 w-16 rounded-full" />
                        <Skeleton className="h-8 w-16 rounded-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recommended.length === 0 ? (
            <SmartEmptyState
              flexibleOptions={flexibleOptions}
              hasAny={flexibleOptions.length > 0}
              onPickDate={setFilterDate}
              onFlexible={() => {
                setFilterDate(todayStr);
                setFilterTimePref("any");
              }}
              onClear={clearFilters}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {recommended.map((mentor) => (
                <MentorResultCard
                  key={mentor.id}
                  mentor={mentor}
                  selectedDate={filterDate}
                  selectedSlotId={selectedSlotValue}
                  selectedMentorId={selectedMentorId}
                  durationMins={durationMins}
                  onSelectSlot={(slot) => selectSlot(mentor, slot)}
                  onPreview={() => setPreviewMentorId(mentor.id)}
                  onSelectMentor={() => setSelectedMentorId(mentor.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        {selectedMentor && selectedSlot && (
          <StickyBookingSummary
            mentor={selectedMentor}
            slot={selectedSlot}
            date={filterDate}
            durationMins={durationMins}
            onContinue={() => setConfirmOpen(true)}
            isPending={isCreatingHold}
          />
        )}
      </div>

      {previewMentor && (
        <MentorPreviewDrawer
          open={!!previewMentor}
          mentor={previewMentor}
          date={filterDate}
          selectedSlotId={selectedSlotValue}
          onSelectSlot={(slot) => previewMentor && selectSlot(previewMentor, slot)}
          onClose={() => setPreviewMentorId(null)}
        />
      )}

      {selectedMentor && selectedSlot && (
        <BookingConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          mentorId={selectedMentor.id}
          mentorName={selectedMentor.name}
          slot={{ value: selectedSlot.id, label: selectedSlot.label }}
          date={filterDate}
          durationMins={durationMins}
          language={selectedMentor.primaryLanguage}
          holdId={hold?.id}
          onRaceConflict={() => {
            setConfirmOpen(false);
            setRaceFailed(selectedSlot.id);
            setRaceOpen(true);
          }}
        />
      )}

      <RaceConditionRecovery
        open={raceOpen}
        mentor={selectedMentor}
        failedSlotValue={raceFailed}
        onSelectAlternative={(slot) => {
          if (selectedMentor) selectSlot(selectedMentor, slot);
          setRaceOpen(false);
          toast.success("New time selected — review and continue.");
        }}
        onDismiss={() => setRaceOpen(false)}
      />
    </div>
  );
}

function MentorResultCard({
  mentor,
  selectedDate,
  selectedSlotId,
  selectedMentorId,
  durationMins,
  onSelectSlot,
  onPreview,
  onSelectMentor,
}: {
  mentor: BookingMentorViewModel;
  selectedDate: string;
  selectedSlotId?: string | null;
  selectedMentorId?: string | null;
  durationMins: number;
  onSelectSlot: (slot: BookingSlotViewModel) => void;
  onPreview: () => void;
  onSelectMentor: () => void;
}) {
  const isSelected = selectedMentorId === mentor.id;

  return (
    <Card className={cn("h-full transition-shadow duration-200", isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-md")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11">
            <AvatarImage src={mentor.avatarUrl || undefined} alt={mentor.name} />
            <AvatarFallback className="bg-primary/10 text-primary">
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
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {mentor.rating != null && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {mentor.rating.toFixed(1)} ({mentor.totalReviews})
                </span>
              )}
              {mentor.yearsExperience > 0 && <span>{mentor.yearsExperience} yr</span>}
              <span className="flex items-center gap-1">
                <LanguagesIcon className="h-3 w-3" />
                {mentor.languages.slice(0, 2).join(", ") || "English"}
              </span>
            </div>
          </div>
        </div>

        {mentor.reasons.length > 0 && (
          <div className="rounded-xl bg-primary/5 p-2.5">
            <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3 w-3" />
              Why we recommend {mentor.name.split(" ")[0]}
            </div>
            <ul className="mt-1.5 space-y-1">
              {mentor.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Available {dateLabel(selectedDate)}</span>
            {durationMins > 0 && <span>{durationMins}-min session</span>}
          </div>
          <SlotTimeline
            slots={mentor.availableSlots}
            selectedId={selectedSlotId}
            onSelect={onSelectSlot}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={onSelectMentor}
          >
            {isSelected ? "Selected" : `Book with ${mentor.name.split(" ")[0]}`}
          </Button>
          <Button variant="ghost" size="sm" onClick={onPreview}>
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SmartEmptyState({
  flexibleOptions,
  hasAny,
  onPickDate,
  onFlexible,
  onClear,
}: {
  flexibleOptions: { dateStr: string; count: number }[];
  hasAny: boolean;
  onPickDate: (dateStr: string) => void;
  onFlexible: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
        <CalendarX className="h-7 w-7 text-muted-foreground/70" />
      </div>
      <h3 className="text-lg font-semibold">No mentors are available for this exact time.</h3>

      {hasAny ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Here are the closest options — tap to see their availability.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {flexibleOptions.slice(0, 6).map((opt) => (
              <button
                key={opt.dateStr}
                type="button"
                onClick={() => onPickDate(opt.dateStr)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:border-primary/50 hover:bg-accent"
              >
                {dateLabel(opt.dateStr)} · {opt.count} mentor{opt.count !== 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          No sessions are available in the selected window.
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onFlexible}>
          I&apos;m flexible
        </Button>
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear filters
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <a href="/student/explore">View all mentors</a>
        </Button>
      </div>
    </div>
  );
}