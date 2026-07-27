import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameDay, isBefore, startOfDay } from "date-fns";
import { DAY_KEYS } from "@/lib/booking";
import type { SlotOption, TimeGroup } from "@/hooks/use-booking";
import { TIME_GROUP_LABELS } from "@/hooks/use-booking";
import { cn } from "@/lib/utils";

interface BookingCalendarProps {
  slots: Array<{ day_of_week: string; is_available: boolean }>;
  availableDates: Date[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  groupedSlots: Record<TimeGroup, SlotOption[]>;
  selectedSlot: string | null;
  onSelectSlot: (slot: string | null) => void;
}

function isDateAvailable(date: Date, availableDates: Date[]): boolean {
  return availableDates.some((d) => isSameDay(d, date));
}

export function BookingCalendar({
  slots,
  availableDates,
  selectedDate,
  onSelectDate,
  groupedSlots,
  selectedSlot,
  onSelectSlot,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfDay(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const weeks = useMemo(() => {
    const days: Date[][] = [];
    let current = calendarStart;
    while (current <= calendarEnd || days.length === 0) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(current);
        current = addDays(current, 1);
      }
      days.push(week);
      if (current > calendarEnd) break;
    }
    return days;
  }, [calendarStart, calendarEnd]);

  const hasSlots = Object.values(groupedSlots).some((group) => group.length > 0);

  const groupOrder: TimeGroup[] = ["morning", "afternoon", "evening", "night"];

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((date, i) => {
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isSelected = selectedDate && isSameDay(date, new Date(selectedDate));
              const isDisabled = isBefore(date, today) || !isDateAvailable(date, availableDates);
              const isToday = isSameDay(date, today);

              return (
                <button
                  key={i}
                  disabled={!isCurrentMonth || isDisabled}
                  onClick={() => {
                    if (!isDisabled && isCurrentMonth) {
                      onSelectDate(format(date, "yyyy-MM-dd"));
                    }
                  }}
                  className={cn(
                    "relative flex h-10 w-full items-center justify-center rounded-lg text-sm transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !isCurrentMonth && "text-muted-foreground/30",
                    isCurrentMonth && !isDisabled && "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    isDisabled && "text-muted-foreground/30 cursor-not-allowed",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                    isToday && !isSelected && "ring-1 ring-primary",
                  )}
                >
                  {format(date, "d")}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Time slots */}
      {selectedDate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Available times for {format(new Date(selectedDate), "EEEE, MMM d")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasSlots ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <Clock className="h-8 w-8 text-muted-foreground/50" />
                <p>No available slots for this date.</p>
                <p className="text-xs">Try selecting a different date.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupOrder.map((group) => {
                  const slots = groupedSlots[group];
                  if (!slots?.length) return null;
                  const groupInfo = TIME_GROUP_LABELS[group];
                  return (
                    <div key={group}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">{groupInfo.icon}</span>
                        <span className="text-sm font-medium">{groupInfo.label}</span>
                        <span className="text-xs text-muted-foreground">
                          ({slots.filter((s) => !s.disabled).length} available)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.value}
                            disabled={slot.disabled}
                            onClick={() => onSelectSlot(selectedSlot === slot.value ? null : slot.value)}
                            className={cn(
                              "relative flex items-center justify-center rounded-lg border px-3 py-2.5 text-sm transition-all",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              slot.disabled
                                ? "border-muted bg-muted/30 text-muted-foreground/50 cursor-not-allowed line-through"
                                : selectedSlot === slot.value
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                  : "border-border hover:border-primary/50 hover:bg-accent/50 cursor-pointer"
                            )}
                          >
                            {slot.label}
                            {!slot.disabled && selectedSlot === slot.value && (
                              <CheckCircle2 className="absolute -right-1.5 -top-1.5 h-4 w-4 text-primary-foreground bg-primary rounded-full" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

