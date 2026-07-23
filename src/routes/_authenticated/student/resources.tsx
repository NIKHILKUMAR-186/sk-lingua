import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ExternalLink } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";

export const Route = createFileRoute("/_authenticated/student/resources")({
  component: Resources,
});

function Resources() {
  const { data: resources = [] } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => (await supabase.from("resources").select("*").order("created_at", { ascending: false }).limit(60)).data ?? [],
  });

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-4xl space-y-6">
        <div><h1 className="text-3xl font-display">Learning resources</h1><p className="text-muted-foreground">Materials shared by mentors.</p></div>
        {resources.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No resources yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {resources.map((r) => {
              const lang = LANGUAGES.find((l) => l.code === r.language);
              return (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer">
                  <Card className="h-full transition hover:shadow-soft"><CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></div>
                        <div><div className="font-semibold">{r.title}</div>{lang && <div className="text-xs text-muted-foreground">{lang.emoji} {lang.name}</div>}</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {r.description && <p className="mt-3 text-sm text-muted-foreground">{r.description}</p>}
                  </CardContent></Card>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
