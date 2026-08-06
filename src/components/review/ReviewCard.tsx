import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "./RatingStars";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ThumbsUp, Paperclip, CheckCircle2, Star } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Review = Tables<"reviews"> & {
  student?: Pick<Tables<"profiles">, "id" | "full_name" | "avatar_url"> | null;
};

interface ReviewCardProps {
  review: Review;
  showSessionInfo?: boolean;
  variant?: "default" | "compact" | "detailed";
}

const CATEGORY_LABELS: Record<string, string> = {
  teaching_quality_rating: "Teaching Quality",
  communication_rating: "Communication",
  knowledge_rating: "Knowledge",
  punctuality_rating: "Punctuality",
  friendliness_rating: "Friendliness",
};

const CATEGORY_KEYS = [
  "teaching_quality_rating",
  "communication_rating",
  "knowledge_rating",
  "punctuality_rating",
  "friendliness_rating",
] as const;

export function ReviewCard({ review, showSessionInfo, variant = "default" }: ReviewCardProps) {
  const studentName = review.student?.full_name ?? "Anonymous";
  const studentAvatar = review.student?.avatar_url ?? undefined;
  const isCompact = variant === "compact";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "overflow-hidden transition-all hover:shadow-soft",
          review.recommend === false && "border-destructive/20",
        )}
      >
        <CardContent className={cn("p-4", isCompact ? "space-y-2" : "space-y-3")}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={studentAvatar} alt={studentName} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {studentName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate">{studentName}</span>
                  {review.is_verified && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{format(new Date(review.created_at), "MMM d, yyyy")}</span>
                  {showSessionInfo && review.session_id && (
                    <>
                      <span>•</span>
                      <span>Session</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <RatingStars value={review.rating} size="sm" />
              {review.recommend === true && <ThumbsUp className="h-3 w-3 text-success ml-1" />}
            </div>
          </div>

          {/* Category Ratings (detailed variant only) */}
          {variant === "detailed" && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {CATEGORY_KEYS.map((key) => {
                const val = review[key as keyof typeof review] as number | null;
                if (!val) return null;
                return (
                  <div key={key} className="rounded-md bg-muted/50 p-1.5 text-center">
                    <div className="text-[10px] text-muted-foreground truncate">
                      {CATEGORY_LABELS[key]}
                    </div>
                    <div className="flex justify-center">
                      <RatingStars value={val} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Review Text */}
          {review.review_text && (
            <p className="text-sm text-muted-foreground leading-relaxed">"{review.review_text}"</p>
          )}

          {/* Fallback to comment */}
          {!review.review_text && review.comment && (
            <p className="text-sm text-muted-foreground leading-relaxed">"{review.comment}"</p>
          )}

          {/* Attachment */}
          {review.attachment_url && (
            <a
              href={review.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Paperclip className="h-3 w-3" />
              View attachment
            </a>
          )}

          {/* Recommend indicator */}
          {review.recommend === false && (
            <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">
              Does not recommend
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
