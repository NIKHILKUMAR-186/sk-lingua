import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";
import { Star, MapPin, ArrowRight, Loader2, Users } from "lucide-react";

type MentorRow = {
  user_id: string;
  headline: string | null;
  hourly_rate: number | null;
  rating_avg: number | null;
  total_reviews: number | null;
  languages_taught: string[] | null;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    state: string | null;
  } | null;
};

export function FeaturedMentors() {
  const { data: mentors = [], isLoading, isError } = useQuery<MentorRow[]>({
    queryKey: ["featured-mentors"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("mentor_profiles")
        .select("user_id, headline, hourly_rate, rating_avg, total_reviews, languages_taught")
        .eq("is_active", true)
        .order("rating_avg", { ascending: false })
        .limit(6);
      if (error) throw error;
      if (!rows?.length) return [];

      const ids = rows.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, state")
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((m) => ({ ...m, profile: byId.get(m.user_id) ?? null }));
    },
    staleTime: 60_000,
  });

  return (
    <section id="mentors" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
      <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Meet the mentors</p>
          <h2 className="mt-3 text-4xl leading-tight tracking-tight sm:text-5xl">
            Learn with people who've lived it.
          </h2>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Every mentor is verified, reviewed, and chosen for how they teach — not just what they know.
          </p>
        </div>
        <Button asChild variant="outline" className="group shrink-0">
          <Link to="/auth" search={{ mode: "signup" } as never}>
            Explore all mentors
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </Reveal>

      <div className="mt-12">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-border">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm">Finding the best mentors…</span>
            </div>
          </div>
        ) : isError ? (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              We couldn't load mentors right now. Please refresh.
            </p>
          </div>
        ) : mentors.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-16 text-center">
            <p className="text-muted-foreground">
              No mentors yet —{" "}
              <Link to="/become-a-mentor" className="font-semibold text-primary underline underline-offset-4">
                become the first!
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mentors.map((m, i) => {
              const p = m.profile;
              const langs = m.languages_taught ?? [];
              return (
                <Reveal key={m.user_id} delay={(i % 3) * 80}>
                  <article className="group flex h-full flex-col rounded-[1.5rem] border border-border/80 bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div className="h-14 w-14 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 to-electric/15">
                          {p?.avatar_url ? (
                            <img src={p.avatar_url} alt={p?.full_name ?? "Mentor"} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
                              {(p?.full_name ?? "M")[0]}
                            </span>
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-success" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{p?.full_name ?? "Mentor"}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {p?.state ?? "Worldwide"}
                        </div>
                      </div>
                      <div className="ml-auto flex items-center gap-1 rounded-lg bg-warning/10 px-2 py-1 text-xs font-semibold text-warning-foreground">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        {Number(m.rating_avg ?? 0).toFixed(1)}
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-2 flex-1 text-sm text-muted-foreground">
                      {m.headline ?? "Passionate about teaching my language."}
                    </p>

                    {langs.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {langs.slice(0, 3).map((l) => (
                          <span key={l} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {l}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
                      <div>
                        <span className="text-lg font-semibold">${Number(m.hourly_rate ?? 20).toFixed(0)}</span>
                        <span className="text-xs text-muted-foreground">/hr</span>
                      </div>
                      <Button asChild size="sm" variant="ghost" className="group/btn">
                        <Link to="/auth" search={{ mode: "signup" } as never}>
                          Book
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                        </Link>
                      </Button>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
