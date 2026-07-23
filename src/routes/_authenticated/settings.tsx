import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LANGUAGES } from "@/lib/languages";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [country, setCountry] = useState(""); const [nl, setNl] = useState("en"); const [bio, setBio] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  useEffect(() => { if (auth?.profile) { setName(auth.profile.full_name ?? ""); setCountry(auth.profile.country ?? ""); setNl(auth.profile.native_language ?? "en"); setBio(auth.profile.bio ?? ""); } }, [auth]);

  async function save() {
    if (!auth?.user) return;
    const { error } = await supabase.from("profiles").update({ full_name: name, country, native_language: nl, bio }).eq("id", auth.user.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries(); }
  }
  const variant = auth?.role === "mentor" ? "mentor" : "student";
  return (
    <AppShell variant={variant}>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-display">Settings</h1>
        <Card><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent className="space-y-4">
          <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input value={auth?.user?.email ?? ""} disabled /></div>
          <div><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} /></div>
          <div><Label>Native language</Label>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={nl} onChange={(e) => setNl(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.emoji} {l.name}</option>)}
            </select>
          </div>
          <div><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} /></div>
          <Button onClick={save}>Save changes</Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Notifications</CardTitle></CardHeader><CardContent>
          <div className="flex items-center justify-between"><div><div className="font-medium">Email notifications</div><div className="text-xs text-muted-foreground">Session updates, streaks, reminders.</div></div><Switch checked={emailNotif} onCheckedChange={setEmailNotif} /></div>
        </CardContent></Card>
      </div>
    </AppShell>
  );
}
