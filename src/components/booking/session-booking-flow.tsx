import { useMemo, useState, useEffect } from "react";
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
  Star,
  Shield,
  Sparkles,
  CalendarX,
  Check,
  Clock,
  ArrowRight,
  GraduationCap,
  Languages as LanguagesIcon,
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

const INTENTS: { id: Intent; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "This Week" },
  { id: "flexible", label: "I'm Flexible" },
];

const TIME_PREFS: TimePreference[] = ["morning", "afternoon", "evening", "any"];

export function SessionBookingFlow() {
  const { data: auth } = useAuth();
  const { data: rules } = useBookingRules();
  const durationMins = rules?.session_duration_minutes ?? 30;

  const today = startOfDay(new Date());
  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd");

  const [intent, setIntent] = useState<Intent>("today");
  const [timePref, setTimePref] = useState<TimePreference>("any");
  const [language, setLanguage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [selectedSlotValue, setSelectedSlotValue] = useState<string | null>(null);
  const [previewMentorId, setPreviewMentorId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [raceOpen, setRaceOpen] = useState(false);
  const [raceFailed, setRaceFailed] = useState<string | null>(null);

  const { availableMentors, mentorsLoading, dateAvailability } = useAvailableMentors(selectedDate);

  const criteria = useMemo(
    () => ({ intent, timePreference: timePref, selectedDate, language }),
    [intent, timePref, language, selectedDate],
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
    availableMentors.forEach((m) => m.languages_taught?.forEach((l) => langs.add(l)));
    return Array.from(langs).sort();
  }, [availableMentors]);

  const flexibleOptions = useMemo(
    () => dateAvailability.filter((a) => a.count > 0),
    [dateAvailability],
  );

  // Smart "next available" discovery — the earliest real slot across the ranked
  // results, surfaced as a quick-pick so students never have to hunt.
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

  // When the recommended set no longer contains the chosen mentor (e.g. date
  // changed), drop the stale selection.
  useEffect(() => {
    if (selectedMentorId && !selectedMentor) {
      setSelectedMentorId(null);
      setSelectedSlotValue(null);
    }
  }, [selectedMentorId, selectedMentor]);

  // When the mentor's available slots change (availability refresh), drop an
  // incompatible/vanished slot.
  useEffect(() => {
    if (
      selectedMentor &&
      selectedSlotValue &&
      !selectedMentor.availableSlots.some((s) => s.id === selectedSlotValue)
    ) {
      setSelectedSlotValue(null);
    }
  }, [selectedMentor, selectedSlotValue]);

  function firstAvailableDate(windowDays: number): string | null {
    for (let i = 0; i < windowDays; i++) {
      const ds = format(addDays(today, i), "yyyy-MM-dd");
      const a = dateAvailability.find((x) => x.dateStr === ds);
      if (a && a.count > 0) return ds;
    }
    return null;
  }

  function applyIntent(value: Intent) {
    setIntent(value);
    if (value === "today") {
      setSelectedDate(todayStr);
    } else if (value === "tomorrow") {
      setSelectedDate(tomorrowStr);
    } else {
      setSelectedDate(firstAvailableDate(7) ?? todayStr);
    }
  }

  function selectSlot(mentor: BookingMentorViewModel, slot: BookingSlotViewModel) {
    setSelectedMentorId(mentor.id);
    setSelectedSlotValue(slot.id);
  }

  function clearFilters() {
    setLanguage(null);
    setTimePref("any");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Book a Session</h1>
          <p className="mt-1 text-muted-foreground">
            Find the right mentor and time for your next session.
          </p>
        </div>

        {/* Intent */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">When would you like to learn?</div>
          <div className="flex flex-wrap gap-2">
            {INTENTS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => applyIntent(id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  intent === id
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border hover:border-primary/40 hover:bg-accent",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Time preference */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">Preferred time of day</div>
          <div className="flex flex-wrap gap-2">
            {TIME_PREFS.map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setTimePref(tp)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  timePref === tp
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {TIME_PREFERENCE_LABEL[tp]}
              </button>
            ))}
          </div>
        </div>

        {/* Date rail + language */}
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
              {allLanguages.slice(0, 6).map((l) => (
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

        {/* Results */}
        <div className="space-y-4">
          {!mentorsLoading && recommended.length > 0 && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-medium">Best options for you</span>
              <span className="text-sm text-muted-foreground">
                · {recommended.length} mentor{recommended.length !== 1 ? "s" : ""} available on{" "}
                {dateLabel(selectedDate)} matching your criteria
              </span>
            </div>
          )}

          {!mentorsLoading && nextSuggestion && (
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
              onPickDate={setSelectedDate}
              onFlexible={() => applyIntent("flexible")}
              onClear={clearFilters}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {recommended.map((mentor) => (
                <MentorResultCard
                  key={mentor.id}
                  mentor={mentor}
                  selectedDate={selectedDate}
                  selectedSlotId={selectedSlotValue}
                  durationMins={durationMins}
                  onSelectSlot={(slot) => selectSlot(mentor, slot)}
                  onPreview={() => setPreviewMentorId(mentor.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky summary — desktop right column */}
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        {selectedMentor && selectedSlot && (
          <StickyBookingSummary
            mentor={selectedMentor}
            slot={selectedSlot}
            date={selectedDate}
            durationMins={durationMins}
            onContinue={() => setConfirmOpen(true)}
          />
        )}
      </div>

      {/* Inline preview — stays on the booking page */}
      <MentorPreviewDrawer
        open={!!previewMentor}
        mentor={previewMentor!}
        date={selectedDate}
        selectedSlotId={selectedSlotValue}
        onSelectSlot={(slot) => previewMentor && selectSlot(previewMentor, slot)}
        onClose={() => setPreviewMentorId(null)}
      />

      {/* Confirmation — reuses existing booking / payment architecture */}
      {selectedMentor && selectedSlot && (
        <BookingConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          mentorId={selectedMentor.id}
          mentorName={selectedMentor.name}
          slot={{ value: selectedSlot.id, label: selectedSlot.label }}
          date={selectedDate}
          durationMins={durationMins}
          language={selectedMentor.primaryLanguage}
          onRaceConflict={() => {
            setConfirmOpen(false);
            setRaceFailed(selectedSlot.id);
            setRaceOpen(true);
          }}
        />
      )}

      {/* Race-condition recovery — one-click closest alternative */}
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
  durationMins,
  onSelectSlot,
  onPreview,
}: {
  mentor: BookingMentorViewModel;
  selectedDate: string;
  selectedSlotId?: string | null;
  durationMins: number;
  onSelectSlot: (slot: BookingSlotViewModel) => void;
  onPreview: () => void;
}) {
  return (
    <Card className="h-full transition-shadow duration-200 hover:shadow-md">
      <CardContent className="space-y-3 p-4">
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

        {/* Explainable recommendation */}
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

        {/* Actual available slots — book directly (mentor + slot as one decision) */}
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

        <Button variant="ghost" size="sm" className="w-full" onClick={onPreview}>
          Preview {mentor.name.split(" ")[0]}
        </Button>
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
          I'm flexible
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
