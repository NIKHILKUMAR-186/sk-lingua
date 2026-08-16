import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DateSelectorProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  dateAvailability: { dateStr: string; count: number }[];
}

export function DateSelector({
  selectedDate,
  onSelectDate,
  dateAvailability,
}: DateSelectorProps) {
  const today = startOfDay(new Date());
  const availabilityMap = new Map(
    dateAvailability.map((d) => [d.dateStr, d.count])
  );

  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  const hasAvailability = (dateStr: string) => {
    return (availabilityMap.get(dateStr) || 0) > 0;
  };

  const getDayLabel = (date: Date, dateStr: string): string => {
    if (isSameDay(date, today)) return "Today";
    const tomorrow = addDays(today, 1);
    if (isSameDay(date, tomorrow)) return "Tomorrow";
    return format(date, "EEE");
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="hidden shrink-0 md:flex"
        onClick={() => {
          const current = new Date(selectedDate + "T00:00:00");
          const prev = addDays(current, -7);
          onSelectDate(format(prev, "yyyy-MM-dd"));
        }}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
        {dates.map((date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const isSelected = isSameDay(date, new Date(selectedDate + "T00:00:00"));
          const available = hasAvailability(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-sm transition-all min-w-[60px] ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : available
                    ? "bg-muted/50 hover:bg-muted text-foreground"
                    : "bg-muted/20 text-muted-foreground/50 cursor-not-allowed"
              }`}
              disabled={!available && !isSelected}
            >
              <span className="text-xs font-medium">{getDayLabel(date, dateStr)}</span>
              <span className="text-lg font-bold leading-none">{format(date, "d")}</span>
              {available && !isSelected && (
                <span className="text-[10px] text-muted-foreground">
                  {availabilityMap.get(dateStr)} mentor{availabilityMap.get(dateStr) !== 1 ? "s" : ""}
                </span>
              )}
              {isSelected && (
                <span className="text-[10px] opacity-80">Selected</span>
              )}
            </button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="hidden shrink-0 md:flex"
        onClick={() => {
          const current = new Date(selectedDate + "T00:00:00");
          const next = addDays(current, 7);
          onSelectDate(format(next, "yyyy-MM-dd"));
        }}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
