import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ProfileField } from "@/lib/mentor-domain";

export function MentorProfileProgress({
  percent,
  fields,
  className,
}: {
  percent: number;
  fields: ProfileField[];
  className?: string;
}) {
  const color = percent >= 80 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-red-500";
  const completed = fields.filter((f) => f.complete).length;
  const total = fields.length || 1;

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card p-5", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Profile quality</p>
          <p className="mt-1 text-2xl font-display tracking-tight">{percent}%</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {completed} of {total} sections complete
          </p>
        </div>
        <div className="h-12 w-12 rounded-full border-4 border-muted relative">
          <div
            className={cn(
              "absolute inset-0 rounded-full border-4 border-transparent border-t-current",
              color,
            )}
            style={{ transform: `rotate(${percent * 3.6}deg)` }}
          />
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            {f.complete ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            )}
            <span className="text-xs text-muted-foreground">{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
