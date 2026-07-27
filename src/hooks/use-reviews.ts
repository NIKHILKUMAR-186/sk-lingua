import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReviewStats {
  average: number;
  total: number;
  distribution: Record<number, number>;
  clarityAvg: number;
  engagementAvg: number;
  expertiseAvg: number;
  punctualityAvg: number;
}

export function useReviews(mentorId?: string) {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      const [{ data: reviewsData }, { data: profilesData }] = await Promise.all([
        supabase.from("reviews").select("*").eq("mentor_id", mentorId!).order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("id, full_name, avatar_url"),
      ]);

      const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p]));
      return (reviewsData ?? []).map((r) => ({
        ...r,
        student: profileMap.get(r.student_id),
      }));
    },
  });

  const stats: ReviewStats = {
    average: 0,
    total: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    clarityAvg: 0,
    engagementAvg: 0,
    expertiseAvg: 0,
    punctualityAvg: 0,
  };

  if (reviews.length > 0) {
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    stats.average = sum / total;
    stats.total = total;

    reviews.forEach((r) => {
      const star = Math.round(r.rating);
      if (star >= 1 && star <= 5) stats.distribution[star]++;

      if (r.clarity_rating) stats.clarityAvg += r.clarity_rating;
      if (r.engagement_rating) stats.engagementAvg += r.engagement_rating;
      if (r.expertise_rating) stats.expertiseAvg += r.expertise_rating;
      if (r.punctuality_rating) stats.punctualityAvg += r.punctuality_rating;
    });

    const reviewsWithRatings = reviews.filter((r) => r.clarity_rating).length || 1;
    stats.clarityAvg = stats.clarityAvg / reviewsWithRatings;
    stats.engagementAvg = stats.engagementAvg / reviewsWithRatings;
    stats.expertiseAvg = stats.expertiseAvg / reviewsWithRatings;
    stats.punctualityAvg = stats.punctualityAvg / reviewsWithRatings;
  }

  return { reviews, stats, isLoading };
}

