import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, StarHalf } from "lucide-react";
import type { ReviewStats } from "@/hooks/use-reviews";

interface ReviewStatsProps {
  stats: ReviewStats;
}

function StarRating({ value, size = "sm" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-6 w-6" : size === "md" ? "h-5 w-5" : "h-4 w-4";
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = value >= i;
    const half = !filled && value >= i - 0.5;
    stars.push(
      <Star
        key={i}
        className={`${sizeClass} ${filled ? "fill-warning text-warning" : half ? "fill-warning/50 text-warning" : "text-muted-foreground/30"} transition-colors`}
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

export function ReviewStatsCard({ stats }: ReviewStatsProps) {
  if (stats.total === 0) return null;

  const categories = [
    { label: "Clarity", value: stats.clarityAvg },
    { label: "Engagement", value: stats.engagementAvg },
    { label: "Expertise", value: stats.expertiseAvg },
    { label: "Punctuality", value: stats.punctualityAvg },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-5xl font-display font-bold">{stats.average.toFixed(1)}</div>
            <StarRating value={stats.average} size="md" />
            <div className="mt-1 text-sm text-muted-foreground">{stats.total} reviews</div>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star] || 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-8 text-right text-muted-foreground">{star}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-warning transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <div key={cat.label} className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">{cat.label}</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-lg font-semibold">{cat.value.toFixed(1)}</div>
                <StarRating value={cat.value} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export { StarRating };

