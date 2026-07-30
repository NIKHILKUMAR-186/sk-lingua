import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { MentorRatingStats } from "@/components/review/MentorRatingSummary";

type Review = Tables<"reviews"> & {
  student?: Pick<Tables<"profiles">, "id" | "full_name" | "avatar_url"> | null;
};

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
        supabase
          .from("reviews")
          .select("*")
          .eq("mentor_id", mentorId!)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("profiles").select("id, full_name, avatar_url"),
      ]);

      const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p]));
      return (reviewsData ?? []).map((r) => ({
        ...r,
        student: profileMap.get(r.student_id) ?? null,
      })) as Review[];
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

      if (r.teaching_quality_rating) stats.clarityAvg += r.teaching_quality_rating;
      if (r.communication_rating) stats.engagementAvg += r.communication_rating;
      if (r.knowledge_rating) stats.expertiseAvg += r.knowledge_rating;
      if (r.punctuality_rating) stats.punctualityAvg += r.punctuality_rating;
    });

    const reviewsWithRatings = reviews.filter((r) => r.teaching_quality_rating).length || 1;
    stats.clarityAvg = stats.clarityAvg / reviewsWithRatings;
    stats.engagementAvg = stats.engagementAvg / reviewsWithRatings;
    stats.expertiseAvg = stats.expertiseAvg / reviewsWithRatings;
    stats.punctualityAvg = stats.punctualityAvg / reviewsWithRatings;
  }

  return { reviews, stats, isLoading };
}

export function useMentorRatingSummary(mentorId?: string) {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews-summary", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      const [{ data: reviewsData }, { data: profilesData }] = await Promise.all([
        supabase
          .from("reviews")
          .select("*")
          .eq("mentor_id", mentorId!)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("profiles").select("id, full_name, avatar_url"),
      ]);

      const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p]));
      return (reviewsData ?? []).map((r) => ({
        ...r,
        student: profileMap.get(r.student_id) ?? null,
      })) as Review[];
    },
  });

  const stats: MentorRatingStats = {
    average: 0,
    total: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    categoryAverages: {
      teachingQuality: 0,
      communication: 0,
      knowledge: 0,
      punctuality: 0,
      friendliness: 0,
    },
    recommendRate: 0,
  };

  if (reviews.length > 0) {
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    stats.average = sum / total;
    stats.total = total;

    let tqSum = 0, tqCount = 0;
    let commSum = 0, commCount = 0;
    let knowSum = 0, knowCount = 0;
    let punctSum = 0, punctCount = 0;
    let friendSum = 0, friendCount = 0;
    let recommendCount = 0;

    reviews.forEach((r) => {
      const star = Math.round(r.rating);
      if (star >= 1 && star <= 5) stats.distribution[star]++;

      if (r.teaching_quality_rating) { tqSum += r.teaching_quality_rating; tqCount++; }
      if (r.communication_rating) { commSum += r.communication_rating; commCount++; }
      if (r.knowledge_rating) { knowSum += r.knowledge_rating; knowCount++; }
      if (r.punctuality_rating) { punctSum += r.punctuality_rating; punctCount++; }
      if (r.friendliness_rating) { friendSum += r.friendliness_rating; friendCount++; }
      if (r.recommend === true) recommendCount++;
    });

    stats.categoryAverages = {
      teachingQuality: tqCount > 0 ? tqSum / tqCount : 0,
      communication: commCount > 0 ? commSum / commCount : 0,
      knowledge: knowCount > 0 ? knowSum / knowCount : 0,
      punctuality: punctCount > 0 ? punctSum / punctCount : 0,
      friendliness: friendCount > 0 ? friendSum / friendCount : 0,
    };

    stats.recommendRate = (recommendCount / total) * 100;
  }

  return { reviews, stats, isLoading };
}

export function useCreateReview() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
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
    }) => {
      const { error } = await supabase.from("reviews").insert(payload);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["reviews", variables.mentor_id] });
      qc.invalidateQueries({ queryKey: ["reviews-summary", variables.mentor_id] });
      qc.invalidateQueries({ queryKey: ["session-workspace"] });
    },
  });
}

