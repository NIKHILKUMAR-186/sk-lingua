import type { BookingSlotViewModel } from "@/lib/booking/view-models";
import { cn } from "@/lib/utils";

/**
 * SlotTimeline
 *
 * Compact, visual availability rail — communicates "what times can I actually
 * book?" at a glance without opening another page. Only truly-available slots
 * are rendered; nothing is invented.
 */
interface SlotTimelineProps {
  slots: BookingSlotViewModel[];
  selectedId?: string | null;
  onSelect: (slot: BookingSlotViewModel) => void;
  disabled?: boolean;
}

export function SlotTimeline({ slots, selectedId, onSelect, disabled }: SlotTimelineProps) {
  const available = slots.filter((s) => !s.disabled);

  if (available.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Available times"
      className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
    >
      {available.map((slot) => {
        const selected = slot.id === selectedId;
        return (
          <button
            key={slot.id}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onSelect(slot)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border text-foreground hover:border-primary/50 hover:bg-accent focus-visible:border-primary/50",
            )}
          >
            {slot.startLabel}
          </button>
        );
      })}
    </div>
  );
}
