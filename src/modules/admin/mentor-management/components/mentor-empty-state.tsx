import { Users } from "lucide-react";

export function MentorEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-14 text-center">
      <div className="rounded-full bg-muted/50 p-3">
        <Users className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
