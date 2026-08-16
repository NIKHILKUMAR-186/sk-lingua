import { cn } from "@/lib/utils";
import { getProfileCompletionPercent, type ProfileCompletionValues } from "@/lib/profile";
import { AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileCompletionProps {
  values: ProfileCompletionValues;
  mode: "mentor" | "student";
  onImprove?: (field: string) => void;
}

const mentorFieldLabels: Record<string, { label: string; action?: string }> = {
  avatar_url: { label: "Add a profile photo" },
  full_name: { label: "Complete your full name" },
  headline: { label: "Add a headline" },
  bio: { label: "Add a short bio" },
  state: { label: "Add your location" },
  native_language: { label: "Set your native language" },
  languages_taught: { label: "Add languages you teach" },
  years_experience: { label: "Add years of experience" },
  teaching_style: { label: "Describe your teaching style" },
  certifications: { label: "Add certifications" },
  education: { label: "Complete education" },
  linkedin_url: { label: "Add LinkedIn profile" },
  website_url: { label: "Add your website" },
  youtube_url: { label: "Add YouTube channel" },
  availability_preview: { label: "Set availability preview" },
  cover_url: { label: "Add a cover photo" },
};

export function ProfileCompletion({ values, mode, onImprove }: ProfileCompletionProps) {
  const percent = getProfileCompletionPercent(values, mode);
  const fields = mode === "mentor"
    ? ["avatar_url", "full_name", "headline", "bio", "state", "native_language", "languages_taught", "years_experience", "teaching_style", "certifications", "education", "linkedin_url", "website_url", "youtube_url", "availability_preview", "cover_url"]
    : ["avatar_url", "full_name", "bio", "state", "timezone", "native_language", "learning_goal", "target_language", "current_level", "interests", "linkedin_url", "github_url"];

  const missing = fields.filter((f) => {
    const v = (values as any)[f];
    if (v === null || v === undefined) return true;
    if (typeof v === "string") return v.trim().length === 0;
    if (Array.isArray(v)) return v.length === 0;
    return false;
  });

  const recommendations = missing.slice(0, 3).map((f) => ({
    field: f,
    label: mentorFieldLabels[f as keyof typeof mentorFieldLabels]?.label || f,
  }));

  const color = percent >= 80 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-red-500";
  const textColor = percent >= 80 ? "text-emerald-700" : percent >= 50 ? "text-amber-700" : "text-red-700";
  const bgColor = percent >= 80 ? "bg-emerald-50" : percent >= 50 ? "bg-amber-50" : "bg-red-50";

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Profile completion</p>
          <p className="mt-1 text-2xl font-display tracking-tight">{percent}%</p>
        </div>
        <div className="h-10 w-10 rounded-full border-[3px] border-muted relative">
          <div
            className={cn("absolute inset-0 rounded-full border-[3px] border-transparent border-t-current", color)}
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

      {recommendations.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {recommendations.length} improvement{recommendations.length !== 1 ? "s" : ""} recommended
          </p>
          {recommendations.map((rec) => (
            <button
              key={rec.field}
              type="button"
              onClick={() => onImprove?.(rec.field)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border border-border/40 p-2.5 text-left transition hover:border-primary/30 hover:bg-accent/20",
              )}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-xs text-foreground">{rec.label}</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      {percent >= 80 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Your profile looks great!</span>
        </div>
      )}
    </div>
  );
}