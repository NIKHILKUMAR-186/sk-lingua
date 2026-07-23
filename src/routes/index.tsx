import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LANGUAGES } from "@/lib/languages";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Flame, Search, Video, CheckCircle2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lingua — Learn a language from a real human" },
      { name: "description", content: "Book 1-on-1 video lessons with real human mentors. Build daily streaks and level up in Spanish, Japanese, French and more." },
      { property: "og:title", content: "Lingua — Learn a language from a real human" },
      { property: "og:description", content: "Book 1-on-1 video lessons with real mentors. Build daily streaks." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data: featured = [] } = useQuery({
    queryKey: ["featured-mentors"],
    queryFn: async () => {
      const { data: mentors } = await supabase
        .from("mentor_profiles")
        .select("user_id, headline, hourly_rate, rating_avg, total_reviews, languages_taught")
        .eq("is_active", true)
        .order("rating_avg", { ascending: false })
        .limit(6);
      if (!mentors?.length) return [];
      const ids = mentors.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url, country").in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return mentors.map((m) => ({ ...m, profile: byId.get(m.user_id) ?? null }));
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Real humans, not AI tutors
            </div>
            <h1 className="text-5xl leading-[1.05] font-display sm:text-7xl">
              Learn any language,<br />
              <span className="italic text-primary">from a real human.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Book 1-on-1 video sessions with mentors from around the world.
              Build a daily streak. Actually stick with it.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/auth" search={{ mode: "signup" } as never}>Start learning free</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/auth" search={{ mode: "signup", role: "mentor" } as never}>Become a mentor</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Flame className="h-4 w-4 text-flame" /> 10,000+ streaks</div>
              <div className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-warning text-warning" /> 4.9 avg rating</div>
              <div className="flex items-center gap-1.5"><Video className="h-4 w-4 text-primary" /> Live video calls</div>
            </div>
          </div>
        </div>
      </section>

      {/* Languages */}
      <section id="languages" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-display sm:text-4xl">Popular languages</h2>
            <p className="mt-2 text-muted-foreground">Find a mentor in any of these — and dozens more.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {LANGUAGES.map((lang) => (
            <Link key={lang.code} to="/auth" search={{ mode: "signup" } as never}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-soft"
            >
              <span className="text-3xl">{lang.emoji}</span>
              <span className="text-sm font-medium">{lang.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-muted/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-display sm:text-4xl">How Lingua works</h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { icon: Search, title: "Find a mentor", desc: "Browse verified mentors by language, price, and availability." },
              { icon: Video, title: "Book a session", desc: "Pick a time. Join the live video call right from your dashboard." },
              { icon: Flame, title: "Build your streak", desc: "Earn points, badges, and keep your daily streak alive." },
            ].map((step, i) => (
              <div key={step.title} className="relative rounded-2xl border border-border bg-card p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-hero-gradient text-white">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="mb-2 text-xs font-mono text-muted-foreground">STEP {i + 1}</div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured mentors */}
      <section id="mentors" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-display sm:text-4xl">Top-rated mentors</h2>
        <p className="mt-2 text-muted-foreground">Real people, real conversations.</p>
        {featured.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
            No mentors yet — <Link to="/auth" search={{ mode: "signup", role: "mentor" } as never} className="text-primary underline">become the first!</Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((m) => {
              const p = m.profile;
              return (
                <Card key={m.user_id} className="overflow-hidden transition hover:shadow-soft">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
                        {p?.avatar_url ? <img src={p.avatar_url} alt={p.full_name ?? ""} className="h-full w-full object-cover" /> : null}
                      </div>
                      <div>
                        <div className="font-semibold">{p?.full_name ?? "Mentor"}</div>
                        <div className="text-xs text-muted-foreground">{p?.country ?? "—"}</div>
                      </div>
                    </div>
                    <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{m.headline}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="font-medium">{Number(m.rating_avg).toFixed(1)}</span>
                        <span className="text-muted-foreground">({m.total_reviews})</span>
                      </div>
                      <div className="text-sm font-semibold">${Number(m.hourly_rate).toFixed(0)}<span className="text-xs text-muted-foreground">/hr</span></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Become a mentor CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-warm-gradient p-10 text-white sm:p-16">
          <h2 className="max-w-2xl text-4xl font-display sm:text-5xl">Teach the language you love. On your schedule.</h2>
          <p className="mt-4 max-w-xl text-white/90">Set your own price, build a following, and get paid to share your language.</p>
          <div className="mt-8 flex flex-wrap gap-6 text-sm">
            {["Set your own hours", "Keep 90% of earnings", "Global student base"].map((t) => (
              <div key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {t}</div>
            ))}
          </div>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link to="/auth" search={{ mode: "signup", role: "mentor" } as never}>Become a mentor</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div>© {new Date().getFullYear()} Lingua. Learn from real humans.</div>
          <div className="flex gap-6"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Contact</a></div>
        </div>
      </footer>
    </div>
  );
}
