import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LANGUAGES } from "@/lib/languages";
import { useState, useMemo } from "react";
import { Star, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/explore")({
  component: Explore,
});

function Explore() {
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<string>("");

  const { data: mentors = [] } = useQuery({
    queryKey: ["explore-mentors"],
    queryFn: async () => {
      const { data: m } = await supabase.from("mentor_profiles")
        .select("user_id, headline, bio, hourly_rate, rating_avg, total_reviews, languages_taught")
        .eq("is_active", true).order("rating_avg", { ascending: false }).limit(60);
      if (!m?.length) return [];
      const ids = m.map((x) => x.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url, country").in("id", ids);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      return m.map((x) => ({ ...x, profile: byId.get(x.user_id) }));
    },
  });

  const filtered = useMemo(() => {
    return mentors.filter((m) => {
      if (lang && !m.languages_taught?.includes(lang)) return false;
      if (q) {
        const s = `${m.profile?.full_name ?? ""} ${m.headline ?? ""} ${m.bio ?? ""}`.toLowerCase();
        if (!s.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [mentors, q, lang]);

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Find your mentor</h1>
          <p className="text-muted-foreground">Real people, ready to teach.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search mentors, styles, languages…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="">Any language</option>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.emoji} {l.name}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">No mentors match your filters.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <Link key={m.user_id} to="/student/mentor/$id" params={{ id: m.user_id }}>
                <Card className="h-full transition hover:shadow-soft">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
                        {m.profile?.avatar_url ? <img src={m.profile.avatar_url} className="h-full w-full object-cover" alt="" /> : null}
                      </div>
                      <div><div className="font-semibold">{m.profile?.full_name ?? "Mentor"}</div><div className="text-xs text-muted-foreground">{m.profile?.country}</div></div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{m.headline}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {m.languages_taught?.slice(0, 3).map((c) => {
                        const l = LANGUAGES.find((x) => x.code === c);
                        return <Badge key={c} variant="secondary" className="text-xs">{l?.emoji} {l?.name ?? c}</Badge>;
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <div className="flex items-center gap-1 text-sm"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{Number(m.rating_avg).toFixed(1)} <span className="text-xs text-muted-foreground">({m.total_reviews})</span></div>
                      <div className="text-sm font-semibold">${Number(m.hourly_rate).toFixed(0)}<span className="text-xs text-muted-foreground">/hr</span></div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
