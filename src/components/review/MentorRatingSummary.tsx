import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, TrendingUp, Users, MessageSquare } from "lucide-react";
import { RatingStars } from "./RatingStars";
import { RatingBreakdown } from "./RatingBreakdown";
import { ReviewCard } from "./ReviewCard";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Review = Tables<"reviews"> & {
  student?: Pick<Tables<"profiles">, "id" | "full_name" | "avatar_url"> | null;
};

export interface MentorRatingStats {
  average: number;
  total: number;
  distribution: Record<number, number>;
  categoryAverages: {
    teachingQuality: number;
    communication: number;
    knowledge: number;
    punctuality: number;
    friendliness: number;
  };
  recommendRate: number;
}

interface MentorRatingSummaryProps {
  stats: MentorRatingStats;
  reviews: Review[];
  isLoading?: boolean;
  showReviews?: boolean;
  className?: string;
}

const CATEGORY_CONFIG = [
  { key: "teachingQuality" as const, label: "Teaching Quality", icon: Star },
  { key: "communication" as const, label: "Communication", icon: MessageSquare },
  { key: "knowledge" as const, label: "Knowledge", icon: TrendingUp },
  { key: "punctuality" as const, label: "Punctuality", icon: Users },
  { key: "friendliness" as const, label: "Friendliness", icon: Users },
] as const;

export function MentorRatingSummary({
  stats,
  reviews,
  isLoading,
  showReviews = true,
  className,
}: MentorRatingSummaryProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.total === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-8 text-center">
          <Star className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <div className="mt-2 text-sm font-medium text-muted-foreground">No reviews yet</div>
          <p className="text-xs text-muted-foreground/60">Reviews will appear once students complete sessions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-warning text-warning" />
          Mentor Rating & Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Overall Score */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="text-center shrink-0">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-5xl font-display font-bold"
            >
              {stats.average.toFixed(1)}
            </motion.div>
            <RatingStars value={stats.average} size="md" showValue={false} />
            <div className="mt-1 text-xs text-muted-foreground">{stats.total} review{stats.total !== 1 ? "s" : ""}</div>
          </div>

          <div className="flex-1 w-full">
            <RatingBreakdown distribution={stats.distribution} total={stats.total} />
          </div>
        </div>

        {/* Recommendation Rate */}
        {stats.recommendRate > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-success/5 border border-success/10 p-3">
            <div className="text-2xl font-display font-bold text-success">
              {stats.recommendRate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">
              of students recommend this mentor
            </div>
          </div>
        )}

        {/* Category Averages */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category Breakdown</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {CATEGORY_CONFIG.map((cat) => {
              const value = stats.categoryAverages[cat.key];
              return (
                <div key={cat.key} className="rounded-lg border p-3 transition-all hover:bg-accent/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <cat.icon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium">{cat.label}</span>
                    </div>
                    <span className="text-lg font-semibold tabular-nums">{value.toFixed(1)}</span>
                  </div>
                  <div className="mt-1">
                    <RatingStars value={value} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Reviews */}
        {showReviews && reviews.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Reviews
              </div>
              <span className="text-xs text-muted-foreground">Showing {Math.min(reviews.length, 5)} of {stats.total}</span>
            </div>
            <div className="space-y-2">
              {reviews.slice(0, 5).map((review) => (
                <ReviewCard key={review.id} review={review} variant="compact" />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

