import { cn } from "@/lib/utils";

interface MentorDateChipProps {
  month: string;
  day: string | number;
  className?: string;
}

export function MentorDateChip({ month, day, className }: MentorDateChipProps) {
  return (
    <div className={cn("mentor-date-chip", className)}>
      <span className="mentor-date-chip-month">{month}</span>
      <span className="mentor-date-chip-day">{day}</span>
    </div>
  );
}
