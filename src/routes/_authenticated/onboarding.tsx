import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GraduationCap, Users, Languages, Loader2 } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"student" | "mentor">(
    auth?.role === "mentor" || auth?.user?.user_metadata?.intended_role === "mentor" ? "mentor" : "student",
  );
  const [fullName, setFullName] = useState(auth?.profile?.full_name ?? "");
  const [country, setCountry] = useState("");
  const [nativeLang, setNativeLang] = useState("en");
  const [bio, setBio] = useState("");
  const [teachingLangs, setTeachingLangs] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState("25");
  const [headline, setHeadline] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (auth?.role) setRole(auth.role === "admin" ? "student" : auth.role);
    else if (auth?.user?.user_metadata?.intended_role === "mentor") setRole("mentor");
    if (auth?.profile?.onboarded) navigate({ to: auth.role === "mentor" ? "/mentor/dashboard" : "/student/dashboard" });
  }, [auth, navigate]);

  async function finish() {
    if (!auth?.user) return;
    setSaving(true);
    try {
      console.group("Profile");
      console.log("onboarding save", { userId: auth.user.id, role });

      const { error: roleError } = await supabase.from("user_roles").upsert({ user_id: auth.user.id, role }, { onConflict: "user_id,role" });
      if (roleError) {
        console.error("Role save failed", roleError);
        throw roleError;
      }

      const { error: profileError } = await supabase.from("profiles").update({
        full_name: fullName, country, native_language: nativeLang, bio, onboarded: true,
      }).eq("id", auth.user.id);
      if (profileError) {
        console.error("Profile save failed", profileError);
        throw profileError;
      }

      if (role === "mentor") {
        const { error: mentorProfileError } = await supabase.from("mentor_profiles").upsert({
          user_id: auth.user.id, headline, bio, languages_taught: teachingLangs,
          hourly_rate: Number(hourlyRate),
        });
        if (mentorProfileError) {
          console.error("Mentor profile save failed", mentorProfileError);
          throw mentorProfileError;
        }
      }
      console.groupEnd();
      await qc.invalidateQueries();
      toast.success("You're all set!");
      navigate({ to: role === "mentor" ? "/mentor/dashboard" : "/student/dashboard" });
    } catch (e) {
      console.error("Profile onboarding failed", e);
      console.groupEnd();
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hero-gradient">
            <Languages className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-display">Lingua</span>
        </div>
        <Card>
          <CardHeader>
            <div className="mb-2 text-xs font-mono text-muted-foreground">STEP {step} OF {role === "mentor" ? 3 : 2}</div>
            <CardTitle className="text-2xl font-display">
              {step === 1 && "Welcome! What brings you here?"}
              {step === 2 && "Tell us about you"}
              {step === 3 && "Set up your mentor profile"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "You can always switch or add roles later."}
              {step === 2 && "This helps mentors and students get to know you."}
              {step === 3 && "You can edit these anytime."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 1 && (
              <>
                <RadioGroup value={role} onValueChange={(v) => setRole(v as "student" | "mentor")} className="grid grid-cols-2 gap-4">
                  <label htmlFor="on-s" className={`flex cursor-pointer flex-col items-start gap-3 rounded-xl border-2 p-6 ${role === "student" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="student" id="on-s" className="sr-only" />
                    <GraduationCap className="h-7 w-7 text-student" />
                    <div><div className="font-semibold">Learn a language</div><div className="text-xs text-muted-foreground">Find mentors, book sessions, build streaks.</div></div>
                  </label>
                  <label htmlFor="on-m" className={`flex cursor-pointer flex-col items-start gap-3 rounded-xl border-2 p-6 ${role === "mentor" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="mentor" id="on-m" className="sr-only" />
                    <Users className="h-7 w-7 text-mentor" />
                    <div><div className="font-semibold">Teach a language</div><div className="text-xs text-muted-foreground">Create gigs, accept bookings, earn money.</div></div>
                  </label>
                </RadioGroup>
                <Button className="w-full" onClick={() => setStep(2)}>Continue</Button>
              </>
            )}
            {step === 2 && (
              <>
                <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Spain" /></div>
                <div>
                  <Label>Native language</Label>
                  <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={nativeLang} onChange={(e) => setNativeLang(e.target.value)}>
                    {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.emoji} {l.name}</option>)}
                  </select>
                </div>
                <div><Label>Short bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people a bit about yourself…" /></div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  {role === "mentor"
                    ? <Button className="flex-1" onClick={() => setStep(3)}>Continue</Button>
                    : <Button className="flex-1" onClick={finish} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish"}</Button>}
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div><Label>Professional headline</Label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Native Spanish speaker | 5 yrs teaching" /></div>
                <div>
                  <Label>Languages you teach</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LANGUAGES.map((l) => {
                      const on = teachingLangs.includes(l.code);
                      return (
                        <button type="button" key={l.code}
                          onClick={() => setTeachingLangs((s) => on ? s.filter(x => x !== l.code) : [...s, l.code])}
                          className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                        >{l.emoji} {l.name}</button>
                      );
                    })}
                  </div>
                </div>
                <div><Label>Hourly rate (USD)</Label><Input type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} /></div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button className="flex-1" onClick={finish} disabled={saving || teachingLangs.length === 0}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish setup"}</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
