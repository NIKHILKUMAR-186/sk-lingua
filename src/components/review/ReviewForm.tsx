import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Paperclip, Star, Loader2 } from "lucide-react";
import { RatingStars } from "./RatingStars";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReviewFormProps {
  mentorId: string;
  sessionId: string;
  studentId: string;
  onSubmit: (payload: ReviewFormPayload) => Promise<void>;
  onCancel?: () => void;
}

export interface ReviewFormPayload {
  mentor_id: string;
  session_id: string;
  student_id: string;
  rating: number;
  teaching_quality_rating: number;
  communication_rating: number;
  knowledge_rating: number;
  punctuality_rating: number;
  friendliness_rating: number;
  recommend: boolean;
  review_text: string;
  attachment_url: string | null;
}

const RATING_CATEGORIES = [
  { key: "teaching_quality_rating", label: "Teaching Quality", description: "How well did they explain concepts?" },
  { key: "communication_rating", label: "Communication", description: "Clarity and responsiveness" },
  { key: "knowledge_rating", label: "Knowledge", description: "Depth of subject matter expertise" },
  { key: "punctuality_rating", label: "Punctuality", description: "Started and ended on time" },
  { key: "friendliness_rating", label: "Friendliness", description: "Approachability and rapport" },
] as const;

type CategoryKey = typeof RATING_CATEGORIES[number]["key"];

export function ReviewForm({ mentorId, sessionId, studentId, onSubmit, onCancel }: ReviewFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<CategoryKey, number>>({
    teaching_quality_rating: 0,
    communication_rating: 0,
    knowledge_rating: 0,
    punctuality_rating: 0,
    friendliness_rating: 0,
  });
  const [recommend, setRecommend] = useState(true);
  const [reviewText, setReviewText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCategoryRating = useCallback((key: CategoryKey, value: number) => {
    setCategoryRatings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const canGoNext = overallRating > 0;
  const canSubmit = categoryRatings.teaching_quality_rating > 0 &&
    categoryRatings.communication_rating > 0 &&
    categoryRatings.knowledge_rating > 0 &&
    categoryRatings.punctuality_rating > 0 &&
    categoryRatings.friendliness_rating > 0 &&
    reviewText.trim().length <= 500;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    try {
      let attachmentUrl: string | null = null;

      if (attachment) {
        setUploading(true);
        const path = `review-attachments/${sessionId}/${crypto.randomUUID()}-${attachment.name}`;
        const { error: uploadError } = await supabase.storage
          .from("review-attachments")
          .upload(path, attachment, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("review-attachments")
          .getPublicUrl(path);

        attachmentUrl = urlData.publicUrl;
        setUploading(false);
      }

      await onSubmit({
        mentor_id: mentorId,
        session_id: sessionId,
        student_id: studentId,
        rating: overallRating,
        ...categoryRatings,
        recommend,
        review_text: reviewText.trim(),
        attachment_url: attachmentUrl,
      });
    } catch (error) {
      toast.error((error as Error).message ?? "Failed to submit review");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-warning fill-warning" />
              Rate this session
            </CardTitle>
            <CardDescription>Share your experience to help others learn</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
              step === 1 ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary")}>1</span>
            <span className="h-px w-6 bg-border" />
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
              step === 2 ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground")}>2</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Overall Experience</div>
                <div className="flex justify-center">
                  <RatingStars
                    value={overallRating}
                    onChange={setOverallRating}
                    size="xl"
                    interactive
                  />
                </div>
                {overallRating > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {overallRating === 1 ? "Needs improvement" :
                     overallRating === 2 ? "Fair" :
                     overallRating === 3 ? "Good" :
                     overallRating === 4 ? "Very good" :
                     "Excellent!"}
                  </p>
                )}
                {overallRating === 0 && (
                  <p className="text-xs text-muted-foreground">Tap a star to rate</p>
                )}
              </div>

              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={onCancel} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={() => setStep(2)} disabled={!canGoNext}>
                  Continue to details
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Category Ratings */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Detailed Ratings</h3>
                  <p className="text-xs text-muted-foreground">Rate each aspect of the session</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {RATING_CATEGORIES.map((cat) => (
                    <div key={cat.key} className="rounded-lg border p-3 space-y-1.5">
                      <div className="text-sm font-medium">{cat.label}</div>
                      <RatingStars
                        value={categoryRatings[cat.key]}
                        onChange={(v) => handleCategoryRating(cat.key as CategoryKey, v)}
                        size="md"
                        interactive
                      />
                      <p className="text-[10px] text-muted-foreground">{cat.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommend */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="recommend" className="text-sm font-medium">Would you recommend this mentor?</Label>
                  <p className="text-xs text-muted-foreground">This helps other students decide</p>
                </div>
                <Switch
                  id="recommend"
                  checked={recommend}
                  onCheckedChange={setRecommend}
                />
              </div>

              {/* Review Text */}
              <div className="space-y-2">
                <Label htmlFor="review-text" className="text-sm font-medium">
                  Review
                  <span className="text-muted-foreground font-normal"> ({reviewText.length}/500)</span>
                </Label>
                <Textarea
                  id="review-text"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value.slice(0, 500))}
                  placeholder="What did you enjoy? What could be improved? Share your experience..."
                  className="min-h-[100px] resize-y"
                />
              </div>

              {/* Optional Attachment */}
              <div>
                <Label className="text-sm font-medium">Attachment (optional)</Label>
                <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-accent/50 transition-colors">
                  <Paperclip className="h-4 w-4" />
                  <span>{attachment ? attachment.name : "Attach a file (screenshot, document, etc.)"}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                  />
                </label>
                {attachment && (
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="mt-1 text-xs text-destructive hover:underline"
                  >
                    Remove file
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={!canSubmit || submitting || uploading}>
                  {uploading ? (
                    <>Uploading attachment...</>
                  ) : submitting ? (
                    <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Submitting...</>
                  ) : (
                    <><Star className="mr-1 h-4 w-4" /> Submit review</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

