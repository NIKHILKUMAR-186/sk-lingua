import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/languages";
import { useState, useMemo } from "react";

export interface SearchFilters {
  query: string;
  language: string;
  minPrice: number;
  maxPrice: number;
  minRating: number;
  maxExperience: number;
  verifiedOnly: boolean;
  demoAvailable: boolean;
  category: string;
  level: string;
  sortBy: "rating" | "price_low" | "price_high" | "experience" | "popular";
}

const defaultFilters: SearchFilters = {
  query: "",
  language: "",
  minPrice: 0,
  maxPrice: 200,
  minRating: 0,
  maxExperience: 20,
  verifiedOnly: false,
  demoAvailable: false,
  category: "",
  level: "",
  sortBy: "rating",
};

export { defaultFilters };

export function useSearch() {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);

  const { data: mentors = [], isLoading } = useQuery({
    queryKey: ["search-mentors", filters],
    queryFn: async () => {
      let query = supabase
        .from("mentor_profiles")
        .select(
          "user_id, headline, bio, hourly_rate, rating_avg, total_reviews, total_students, total_sessions, languages_taught, years_experience, is_verified, demo_lesson_url, teaching_style, cover_url, availability_preview",
        )
        .eq("is_active", true);

      // Apply filters
      if (filters.language) {
        query = query.contains("languages_taught", [filters.language]);
      }
      if (filters.minPrice > 0) {
        query = query.gte("hourly_rate", filters.minPrice);
      }
      if (filters.maxPrice < 200) {
        query = query.lte("hourly_rate", filters.maxPrice);
      }
      if (filters.minRating > 0) {
        query = query.gte("rating_avg", filters.minRating);
      }
      if (filters.maxExperience < 20) {
        query = query.lte("years_experience", filters.maxExperience);
      }
      if (filters.verifiedOnly) {
        query = query.eq("is_verified", true);
      }
      if (filters.demoAvailable) {
        query = query.not("demo_lesson_url", "is", null);
      }

      // Sort
      switch (filters.sortBy) {
        case "price_low":
          query = query.order("hourly_rate", { ascending: true });
          break;
        case "price_high":
          query = query.order("hourly_rate", { ascending: false });
          break;
        case "experience":
          query = query.order("years_experience", { ascending: false });
          break;
        case "popular":
          query = query.order("total_sessions", { ascending: false });
          break;
        default:
          query = query.order("rating_avg", { ascending: false });
      }

      query = query.limit(60);

      const { data: m } = await query;
      if (!m?.length) return [];

      const ids = m.map((x: any) => x.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, state")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));

      let results = m.map((x: any) => ({ ...x, profile: byId.get(x.user_id) }));

      // Client-side text search
      if (filters.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((r: any) => {
          const searchText =
            `${r.profile?.full_name ?? ""} ${r.headline ?? ""} ${r.bio ?? ""} ${r.teaching_style ?? ""}`.toLowerCase();
          return searchText.includes(q);
        });
      }

      return results;
    },
  });

  const resetFilters = () => setFilters(defaultFilters);

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return { mentors, filters, isLoading, setFilters: updateFilter, resetFilters, defaultFilters };
}
