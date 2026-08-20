import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Reveal } from "./reveal";
import { Star, ShieldCheck, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LandingMentor {
  user_id: string;
  headline: string | null;
  bio: string | null;
  rating_avg: number;
  total_reviews: number;
  total_students: number;
  total_sessions: number;
  languages_taught: string[];
  years_experience: number;
  is_verified: boolean;
  teaching_style: string | null;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export function LandingRealMentors() {
  const { data: mentors = [], isLoading } = useQuery<LandingMentor[]>({
    queryKey: ["landing-mentors"],
    queryFn: async () => {
      const { data: mps, error: mpsError } = await supabase
        .from("mentor_profiles")
        .select(
          "user_id, headline, bio, rating_avg, total_reviews, total_students, total_sessions, languages_taught, years_experience, is_verified, teaching_style",
        )
        .eq("is_active", true)
        .order("total_sessions", { ascending: false })
        .limit(6);

      if (mpsError) throw mpsError;
      if (!mps?.length) return [];

      const ids = mps.map((x) => x.user_id);
      const { data: profs, error: profsError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);

      if (profsError) throw profsError;

      const byId = new Map((profs ?? []).map((p) => [p.id, p]));

      return mps.map((x) => ({
        ...x,
        profile: byId.get(x.user_id) || null,
      })) as LandingMentor[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const displayMentors = mentors.slice(0, 3);

  return (
    <section id="mentors" className="relative overflow-hidden" style={{ backgroundColor: "#f8f9fa" }}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <Reveal className="max-w-2xl">
          <p className="landing-text-mono mb-4">REAL MENTORS</p>
          <h2 className="landing-text-heading lg:landing-text-heading-lg">
            Learn with people who&rsquo;ve lived it.
          </h2>
          <p className="landing-text-body mt-4">
            Every mentor is verified, reviewed, and chosen for how they teach — not just what they know.
          </p>
        </Reveal>

        {isLoading ? (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="landing-card animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-bone" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-bone" />
                    <div className="h-3 w-1/2 rounded bg-bone" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full rounded bg-bone" />
                  <div className="h-3 w-2/3 rounded bg-bone" />
                </div>
              </div>
            ))}
          </div>
        ) : displayMentors.length === 0 ? (
          <div className="mt-14 text-center">
            <p className="landing-text-body">No mentors available at the moment. Please check back soon.</p>
          </div>
        ) : (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayMentors.map((mentor, i) => (
              <Reveal key={mentor.user_id} delay={i * 100}>
                <div className="landing-card-hover flex h-full flex-col">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          background: "linear-gradient(135deg, #6647f0 0%, #0091ff 100%)",
                          color: "#ffffff",
                          fontFamily: "var(--landing-font-plus-jakarta-sans)",
                        }}
                      >
                        {mentor.profile?.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "M"}
                      </div>
                      {mentor.is_verified && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
                          style={{
                            borderColor: "#ffffff",
                            backgroundColor: "#00c07a",
                          }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="truncate text-sm font-semibold"
                          style={{
                            color: "#090c1d",
                            fontFamily: "var(--landing-font-plus-jakarta-sans)",
                          }}
                        >
                          {mentor.profile?.full_name || "Mentor"}
                        </span>
                        {mentor.is_verified && (
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: "#00c07a" }} />
                        )}
                      </div>
                      <div
                        className="text-xs"
                        style={{
                          color: "#646464",
                          fontFamily: "var(--landing-font-inter)",
                        }}
                      >
                        {mentor.languages_taught?.join(", ") || "English"} · {mentor.years_experience} years
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "#6647f0", fontFamily: "var(--landing-font-plus-jakarta-sans)" }}>
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {mentor.rating_avg?.toFixed(2) || "4.9"}
                    </div>
                    <span
                      className="text-xs"
                      style={{
                        color: "#838383",
                        fontFamily: "var(--landing-font-inter)",
                      }}
                    >
                      {mentor.total_sessions?.toLocaleString() || 0} sessions
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="landing-tag">{mentor.teaching_style || "Conversation"}</span>
                    <span
                      className="rounded-full px-3 py-1.5 text-xs font-medium"
                      style={{
                        border: "1px solid #6ee7b7",
                        backgroundColor: "#f0fdf4",
                        color: "#065f46",
                        fontFamily: "var(--landing-font-plus-jakarta-sans)",
                      }}
                    >
                      Available now
                    </span>
                  </div>

                  <div className="mt-auto pt-4">
                    <Link
                      to="/auth"
                      search={{ mode: "signup" } as never}
                      className="landing-btn-filled w-full justify-center no-underline"
                    >
                      <Video className="h-4 w-4" />
                      Book session
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
