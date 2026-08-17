import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { formatRating, type MentorDetail } from "@/lib/mentor-domain";

export function MentorReviews({ mentor }: { mentor: MentorDetail }) {
  const { recent, totalReviews, avgRating } = mentor.reviews;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Student reviews</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalReviews === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reviews yet. Reviews appear after completed sessions.
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display">{formatRating(avgRating)}</span>
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < Math.round(avgRating)
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-200",
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                from {totalReviews} review{totalReviews !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-3">
              {recent.map((r) => (
                <div key={r.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{initials(r.studentName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.studentName || "Student"}</span>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3 w-3",
                              i < r.rating ? "text-amber-400 fill-amber-400" : "text-slate-200",
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(r.createdAt)}
                      </span>
                    </div>
                    {r.reviewText && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{r.reviewText}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return ts;
  }
}
