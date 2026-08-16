import { cn } from "@/lib/utils";

interface ProfileStrengthProps {
  percent: number;
  label?: string;
  className?: string;
}

export function ProfileStrength({ percent, label, className }: ProfileStrengthProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const color = clamped >= 80 ? "bg-emerald-500" : clamped >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card p-5", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Profile strength</p>
          <p className="mt-1 text-2xl font-display">{clamped}%</p>
          {label && <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>}
        </div>
        <div className="h-12 w-12 rounded-full border-4 border-muted relative">
          <div
            className={cn(
              "absolute inset-0 rounded-full border-4 border-transparent border-t-current",
              color,
            )}
            style={{ transform: `rotate(${clamped * 3.6}deg)` }}
          />
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
