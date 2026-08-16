import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock, GraduationCap, ChevronRight, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  type BookingMentorViewModel,
  type BookingSlotViewModel,
  dateLabel,
} from "@/lib/booking/view-models";

/**
 * StickyBookingSummary
 *
 * Desktop: a sticky right-column card. Mobile: a fixed bottom action bar.
 * It only appears once a mentor + slot have been chosen, animating in subtly —
 * never a large empty panel before selection.
 */
interface StickyBookingSummaryProps {
  mentor: BookingMentorViewModel;
  slot: BookingSlotViewModel;
  date: string;
  durationMins: number;
  onContinue: () => void;
  isPending?: boolean;
}

export function StickyBookingSummary({
  mentor,
  slot,
  date,
  durationMins,
  onContinue,
  isPending,
}: StickyBookingSummaryProps) {
  const summaryInner = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Your session
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={mentor.avatarUrl || undefined} alt={mentor.name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {mentor.nameInitial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-semibold leading-tight">
            <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{mentor.name}</span>
          </div>
          <div className="truncate text-xs text-muted-foreground">{mentor.primaryLanguage}</div>
        </div>
      </div>
      <Separator className="my-3" />
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{dateLabel(date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{slot.startLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{durationMins} min</span>
        </div>
      </div>
      <Button className="mt-4 w-full" size="lg" onClick={onContinue} disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Continue"}
        {!isPending && <ChevronRight className="ml-2 h-4 w-4" />}
      </Button>
    </>
  );

  return (
    <AnimatePresence>
      <motion.div
        key={`${mentor.id}-${slot.id}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        aria-live="polite"
      >
        {/* Desktop sticky card */}
        <Card className="hidden rounded-2xl border-primary/20 shadow-sm lg:block">
          <CardContent className="p-5">{summaryInner}</CardContent>
        </Card>

        {/* Mobile/tablet fixed bottom bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-lg lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{mentor.name}</div>
              <div className="text-xs text-muted-foreground">
                {dateLabel(date)} · {slot.startLabel} · {durationMins} min
              </div>
            </div>
            <Button onClick={onContinue} disabled={isPending} className="shrink-0">
              {isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : "Continue"}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
