import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ExternalLink, Download } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";

export const Route = createFileRoute("/_authenticated/student/resources")({
  component: Resources,
});

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Resources() {
  const { data: auth } = useAuth();
  const { data: resources = [] } = useQuery({
    queryKey: ["student-resources", auth?.user?.id],
    enabled: !!auth?.user,
    queryFn: async () => (await supabase.from("resources").select("*").order("created_at", { ascending: false }).limit(60)).data ?? [],
  });

  const sessionResources = resources.filter((resource) => resource.visibility === "session" && resource.student_id === auth?.user?.id);
  const publicResources = resources.filter((resource) => resource.visibility === "public");

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-5xl space-y-6">
        <div><h1 className="text-3xl font-display">Resources</h1><p className="text-muted-foreground">Access materials shared by your mentors and session homework.</p></div>
        {sessionResources.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Session resources</h2><Badge>Protected</Badge></div>
            <div className="grid gap-4 md:grid-cols-2">
              {sessionResources.map((resource) => (
                <Card key={resource.id}><CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{resource.title}</div>
                      <div className="text-xs text-muted-foreground">{resource.session_id ? `Session ${resource.session_id.slice(0, 8)}` : "Session resource"}</div>
                    </div>
                    <Badge variant="secondary">{resource.resource_type === "file" ? "File" : "Link"}</Badge>
                  </div>
                  {resource.description ? <p className="mt-3 text-sm text-muted-foreground">{resource.description}</p> : null}
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{resource.file_name ? `${resource.file_name} · ${formatBytes(resource.file_size)}` : "External link"}</span>
                    <a href={resource.storage_url || resource.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                      <Download className="h-3.5 w-3.5" /> Open
                    </a>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Public resources</h2><Badge>Open</Badge></div>
          {publicResources.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No public resources available yet.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {publicResources.map((resource) => {
                const lang = LANGUAGES.find((l) => l.code === resource.language);
                return (
                  <Card key={resource.id} className="transition hover:shadow-soft">
                    <CardContent>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></div>
                          <div>
                            <div className="font-semibold">{resource.title}</div>
                            {lang ? <div className="text-xs text-muted-foreground">{lang.emoji} {lang.name}</div> : null}
                          </div>
                        </div>
                        <a href={resource.storage_url || resource.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      {resource.description ? <p className="mt-3 text-sm text-muted-foreground">{resource.description}</p> : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
