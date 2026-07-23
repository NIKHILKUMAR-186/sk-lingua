import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LANGUAGES } from "@/lib/languages";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mentor/resources")({
  component: MentorResources,
});

function MentorResources() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const { data: resources = [] } = useQuery({
    queryKey: ["mentor-resources", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("resources").select("*").eq("mentor_id", uid!).order("created_at", { ascending: false })).data ?? [],
  });
  const [title, setTitle] = useState(""); const [url, setUrl] = useState(""); const [desc, setDesc] = useState(""); const [lang, setLang] = useState("es");
  async function add() {
    if (!uid || !title || !url) return;
    const { error } = await supabase.from("resources").insert({ mentor_id: uid, title, url, description: desc, language: lang, is_public: true });
    if (error) toast.error(error.message); else { toast.success("Added"); setTitle(""); setUrl(""); setDesc(""); qc.invalidateQueries(); }
  }
  async function del(id: string) {
    await supabase.from("resources").delete().eq("id", id); qc.invalidateQueries();
  }
  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-display">Resources</h1>
        <Card><CardHeader><CardTitle>Add resource</CardTitle></CardHeader><CardContent className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
          <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div><Label>Language</Label>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.emoji} {l.name}</option>)}
            </select>
          </div>
          <Button onClick={add}>Share resource</Button>
        </CardContent></Card>
        <div className="space-y-2">
          {resources.map(r => (
            <Card key={r.id}><CardContent className="flex items-center justify-between p-4">
              <div><div className="font-medium">{r.title}</div><a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{r.url}</a></div>
              <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </CardContent></Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
