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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mentor/profile")({
  component: MentorProfileEdit,
});

function MentorProfileEdit() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const { data: mp } = useQuery({
    queryKey: ["mp-edit", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("mentor_profiles").select("*").eq("user_id", uid!).maybeSingle()).data,
  });
  const { data: gigs = [] } = useQuery({
    queryKey: ["mentor-gigs", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("gigs").select("*").eq("mentor_id", uid!).order("created_at")).data ?? [],
  });

  const [headline, setHeadline] = useState(""); const [bio, setBio] = useState("");
  const [rate, setRate] = useState("25"); const [langs, setLangs] = useState<string[]>([]);
  useEffect(() => { if (mp) { setHeadline(mp.headline ?? ""); setBio(mp.bio ?? ""); setRate(String(mp.hourly_rate)); setLangs(mp.languages_taught ?? []); } }, [mp]);

  async function saveProfile() {
    if (!uid) return;
    const { error } = await supabase.from("mentor_profiles").upsert({ user_id: uid, headline, bio, hourly_rate: Number(rate), languages_taught: langs });
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries(); }
  }

  const [gTitle, setGTitle] = useState(""); const [gDesc, setGDesc] = useState(""); const [gLang, setGLang] = useState("es"); const [gDur, setGDur] = useState("30"); const [gPrice, setGPrice] = useState("25");
  async function addGig() {
    if (!uid || !gTitle) return;
    const { error } = await supabase.from("gigs").insert({ mentor_id: uid, title: gTitle, description: gDesc, language: gLang, duration_mins: Number(gDur), price: Number(gPrice) });
    if (error) toast.error(error.message); else { toast.success("Gig added"); setGTitle(""); setGDesc(""); qc.invalidateQueries(); }
  }
  async function deleteGig(id: string) {
    const { error } = await supabase.from("gigs").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries();
  }

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-display">My profile & gigs</h1>
        <Card><CardHeader><CardTitle>Public profile</CardTitle></CardHeader><CardContent className="space-y-4">
          <div><Label>Headline</Label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} /></div>
          <div><Label>Bio</Label><Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
          <div><Label>Hourly rate (USD)</Label><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          <div><Label>Languages taught</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGES.map(l => { const on = langs.includes(l.code); return (
                <button key={l.code} type="button" onClick={() => setLangs(s => on ? s.filter(x => x !== l.code) : [...s, l.code])}
                  className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{l.emoji} {l.name}</button>
              ); })}
            </div>
          </div>
          <Button onClick={saveProfile}>Save profile</Button>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>My gigs</CardTitle></CardHeader><CardContent className="space-y-4">
          {gigs.map(g => (
            <div key={g.id} className="flex items-center justify-between rounded-lg border p-3">
              <div><div className="font-medium">{g.title}</div><div className="text-xs text-muted-foreground">{g.duration_mins}min • ${Number(g.price).toFixed(0)}</div></div>
              <Button size="icon" variant="ghost" onClick={() => deleteGig(g.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <div className="grid gap-2 rounded-lg border border-dashed p-4">
            <Label>Add new gig</Label>
            <Input placeholder="Title (e.g. 30-min Conversational Spanish)" value={gTitle} onChange={(e) => setGTitle(e.target.value)} />
            <Textarea placeholder="Description" value={gDesc} onChange={(e) => setGDesc(e.target.value)} />
            <div className="grid gap-2 sm:grid-cols-3">
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={gLang} onChange={(e) => setGLang(e.target.value)}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.emoji} {l.name}</option>)}
              </select>
              <Input type="number" placeholder="Minutes" value={gDur} onChange={(e) => setGDur(e.target.value)} />
              <Input type="number" placeholder="Price $" value={gPrice} onChange={(e) => setGPrice(e.target.value)} />
            </div>
            <Button onClick={addGig}><Plus className="mr-1 h-4 w-4" />Add gig</Button>
          </div>
        </CardContent></Card>
      </div>
    </AppShell>
  );
}
