import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Users, Languages, Loader2 } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STORAGE_KEY = "lingua-onboarding-draft";
const TOTAL_STEPS = 5;

type OnboardingRole = "student" | "mentor" | "both";

type DraftState = {
  role: OnboardingRole;
  fullName: string;
  state: string;
  nativeLang: string;
  bio: string;
  targetLanguage: string;
  currentLevel: string;
  learningGoal: string;
  headline: string;
  teachingLangs: string[];
  hourlyRate: string;
};

const roleCards: Record<
  OnboardingRole,
  { title: string; description: string; icon: typeof GraduationCap }
> = {
  student: {
    title: "Student",
    description: "Learn faster with one-on-one mentors and guided practice.",
    icon: GraduationCap,
  },
  mentor: {
    title: "Mentor",
    description: "Share your expertise, create sessions, and grow your income.",
    icon: Users,
  },
  both: {
    title: "Both",
    description: "Teach and learn with one account for maximum flexibility.",
    icon: Languages,
  },
};

const initialDraft: DraftState = {
  role: "student",
  fullName: "",
  state: "",
  nativeLang: "en",
  bio: "",
  targetLanguage: "es",
  currentLevel: "",
  learningGoal: "",
  headline: "",
  teachingLangs: [],
  hourlyRate: "25",
};

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  const isStudent = draft.role === "student" || draft.role === "both";
  const isMentor = draft.role === "mentor" || draft.role === "both";

  useEffect(() => {
    if (!auth?.user) return;
    if (auth.profile?.onboarded) {
      navigate({ to: auth.role === "mentor" ? "/mentor/dashboard" : "/student/dashboard" });
      return;
    }

    const initialState: DraftState = {
      ...initialDraft,
      role:
        auth.role === "mentor" || auth.user?.user_metadata?.intended_role === "mentor"
          ? "mentor"
          : "student",
      fullName: auth.profile?.full_name ?? "",
      state: auth.profile?.state ?? "",
      nativeLang: auth.profile?.native_language ?? "en",
      bio: auth.profile?.bio ?? "",
      targetLanguage: auth.profile?.target_language ?? "es",
      currentLevel: auth.profile?.current_level ?? "",
      learningGoal: auth.profile?.learning_goal ?? "",
    };

    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      try {
        setDraft((current) => ({ ...current, ...JSON.parse(saved) }));
      } catch {
        setDraft(initialState);
      }
    } else {
      setDraft(initialState);
    }
    setHydrated(true);
  }, [auth, navigate]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  function updateDraft(updates: Partial<DraftState>) {
    setDraft((current) => ({ ...current, ...updates }));
  }

  async function finish() {
    if (!auth?.user) return;
    if (!draft.fullName.trim()) {
      toast.error("Please enter your full name before finishing.");
      setStep(3);
      return;
    }
    if (isMentor && draft.teachingLangs.length === 0) {
      toast.error("Select at least one language you teach.");
      setStep(4);
      return;
    }

    setSaving(true);
    try {
      const roleRows: { user_id: string; role: "student" | "mentor" }[] =
        draft.role === "both"
          ? [
              { user_id: auth.user.id, role: "student" },
              { user_id: auth.user.id, role: "mentor" },
            ]
          : [{ user_id: auth.user.id, role: draft.role as "student" | "mentor" }];

      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(roleRows, { onConflict: "user_id,role" });
      if (roleError) throw roleError;

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: auth.user.id,
          full_name: draft.fullName,
          state: draft.state,
          native_language: draft.nativeLang,
          bio: draft.bio,
          onboarded: true,
          target_language: draft.targetLanguage,
          current_level: draft.currentLevel,
          learning_goal: draft.learningGoal,
        },
        { onConflict: "id" },
      );
      if (profileError) throw profileError;

      if (isMentor) {
        const { error: mentorProfileError } = await supabase.from("mentor_profiles").upsert(
          {
            user_id: auth.user.id,
            headline: draft.headline,
            bio: draft.bio,
            languages_taught: draft.teachingLangs,
            hourly_rate: Number(draft.hourlyRate) || 0,
          },
          { onConflict: "user_id" },
        );
        if (mentorProfileError) throw mentorProfileError;
      }

      await qc.invalidateQueries();
      window.localStorage.removeItem(STORAGE_KEY);
      toast.success("Your account is ready.");
      navigate({
        to:
          draft.role === "mentor"
            ? "/mentor/dashboard"
            : draft.role === "student"
              ? "/student/dashboard"
              : "/mentor/dashboard",
      });
    } catch (error) {
      console.error("Onboarding save failed", error);
      toast.error(error instanceof Error ? error.message : "Failed to complete onboarding.");
    } finally {
      setSaving(false);
    }
  }

  if (!auth?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading your onboarding session…</p>
      </div>
    );
  }

  const progressValue = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-[2rem] bg-background/95 p-8 shadow-2xl shadow-slate-950/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-primary">Onboarding</p>
              <h1 className="mt-3 text-4xl font-display">
                Set up your Lingua account in five simple steps.
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
                Choose your role, complete your profile, and unlock the learner or mentor experience
                optimized for your goals.
              </p>
            </div>
            <div className="min-w-[240px] rounded-3xl border border-border bg-slate-950/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Progress</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              <p className="mt-3 text-sm font-medium">
                Step {step} of {TOTAL_STEPS}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {step === 1 && "Welcome to Lingua"}
                {step === 2 && "Choose your starting role"}
                {step === 3 && "Complete your profile"}
                {step === 4 && "Tell us about your goals"}
                {step === 5 && "Review and launch"}
              </CardTitle>
              <CardDescription>
                {step === 1 &&
                  "A thoughtful onboarding path for learners, mentors, and both roles."}
                {step === 2 &&
                  "Pick the experience that matches your goals. You can always switch later."}
                {step === 3 && "Add the details that help mentors and learners connect with you."}
                {step === 4 && "Share your learning and teaching preferences for a stronger start."}
                {step === 5 && "Review your onboarding details before you begin."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 1 && (
                <div className="space-y-6">
                  <div className="rounded-3xl border border-border bg-slate-50 p-6">
                    <p className="text-sm font-semibold">What to expect</p>
                    <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                      <li>• A guided setup in five clean steps.</li>
                      <li>• Smart role support for student, mentor, or both.</li>
                      <li>• A personalized profile and preference experience.</li>
                    </ul>
                  </div>
                  <Button className="w-full" onClick={() => setStep(2)}>
                    Start setup
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(roleCards).map(([value, card]) => {
                      const isActive = draft.role === value;
                      const Icon = card.icon;
                      return (
                        <label
                          key={value}
                          className={`group cursor-pointer rounded-3xl border p-6 transition ${isActive ? "border-primary bg-primary/5" : "border-border bg-background"}`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={value}
                            checked={draft.role === value}
                            onChange={() => updateDraft({ role: value as OnboardingRole })}
                            className="sr-only"
                          />
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <Icon className="h-5 w-5" />
                          </div>
                          <p className="text-lg font-semibold">{card.title}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button className="flex-1" onClick={() => setStep(3)}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="full-name">Full name</Label>
                    <Input
                      id="full-name"
                      value={draft.fullName}
                      onChange={(e) => updateDraft({ fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={draft.state}
                      onChange={(e) => updateDraft({ state: e.target.value })}
                      placeholder="Spain"
                    />
                  </div>
                  <div>
                    <Label htmlFor="native-language">Native language</Label>
                    <select
                      id="native-language"
                      value={draft.nativeLang}
                      onChange={(e) => updateDraft({ nativeLang: e.target.value })}
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {LANGUAGES.map((language) => (
                        <option key={language.code} value={language.code}>
                          {language.emoji} {language.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="bio">Short bio</Label>
                    <Textarea
                      id="bio"
                      value={draft.bio}
                      onChange={(e) => updateDraft({ bio: e.target.value })}
                      placeholder="Tell people a bit about yourself…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button className="flex-1" onClick={() => setStep(4)}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  {isStudent && (
                    <div className="space-y-4 rounded-3xl border border-border bg-background p-6">
                      <p className="text-base font-semibold">Learning preferences</p>
                      <div>
                        <Label htmlFor="target-language">Target language</Label>
                        <select
                          id="target-language"
                          value={draft.targetLanguage}
                          onChange={(e) => updateDraft({ targetLanguage: e.target.value })}
                          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {LANGUAGES.map((language) => (
                            <option key={language.code} value={language.code}>
                              {language.emoji} {language.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="current-level">Current Level</Label>

                        <Select
                          value={draft.currentLevel}
                          onValueChange={(value) => updateDraft({ currentLevel: value })}
                        >
                          <SelectTrigger className="mt-1 w-full">
                            <SelectValue placeholder="Select your current level" />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="A1">Beginner (A1)</SelectItem>
                            <SelectItem value="B1">Intermediate (B1)</SelectItem>
                            <SelectItem value="C1">Advanced (C1)</SelectItem>
                            <SelectItem value="C2">Proficient / Native (C2)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Label htmlFor="current-level">Current level</Label>
                        <Input
                          id="current-level"
                          value={draft.currentLevel}
                          onChange={(e) => updateDraft({ currentLevel: e.target.value })}
                          placeholder="Beginner, Intermediate, Advanced"
                        />
                      </div>
                      <div>
                        <Label htmlFor="learning-goal">Learning goal</Label>
                        <Textarea
                          id="learning-goal"
                          value={draft.learningGoal}
                          onChange={(e) => updateDraft({ learningGoal: e.target.value })}
                          placeholder="I want to speak confidently in everyday conversations."
                        />
                      </div>
                    </div>
                  )}
                  {isMentor && (
                    <div className="space-y-4 rounded-3xl border border-border bg-background p-6">
                      <p className="text-base font-semibold">Mentor profile</p>
                      <div>
                        <Label htmlFor="headline">Professional headline</Label>
                        <Input
                          id="headline"
                          value={draft.headline}
                          onChange={(e) => updateDraft({ headline: e.target.value })}
                          placeholder="Native Spanish speaker | 5 years teaching"
                        />
                      </div>
                      <div>
                        <Label>Languages you teach</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {LANGUAGES.map((language) => {
                            const selected = draft.teachingLangs.includes(language.code);
                            return (
                              <button
                                type="button"
                                key={language.code}
                                onClick={() =>
                                  updateDraft({
                                    teachingLangs: selected
                                      ? draft.teachingLangs.filter((code) => code !== language.code)
                                      : [...draft.teachingLangs, language.code],
                                  })
                                }
                                className={`rounded-full border px-3 py-1.5 text-sm ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                              >
                                {language.emoji} {language.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="hourly-rate">Hourly rate (USD)</Label>
                        <Input
                          id="hourly-rate"
                          type="number"
                          min={0}
                          value={draft.hourlyRate}
                          onChange={(e) => updateDraft({ hourlyRate: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      Back
                    </Button>
                    <Button className="flex-1" onClick={() => setStep(5)}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <div className="space-y-4 rounded-3xl border border-border bg-background p-6">
                    <p className="text-base font-semibold">Review your onboarding</p>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <strong>Role:</strong> {draft.role}
                      </div>
                      <div>
                        <strong>Name:</strong> {draft.fullName || "Not provided"}
                      </div>
                      <div>
                        <strong>State:</strong> {draft.state || "Not provided"}
                      </div>
                      <div>
                        <strong>Native language:</strong>{" "}
                        {LANGUAGES.find((l) => l.code === draft.nativeLang)?.name ??
                          draft.nativeLang}
                      </div>
                      {isStudent && (
                        <>
                          <div>
                            <strong>Target language:</strong>{" "}
                            {LANGUAGES.find((l) => l.code === draft.targetLanguage)?.name ??
                              draft.targetLanguage}
                          </div>
                          <div>
                            <strong>Current level:</strong> {draft.currentLevel || "Not provided"}
                          </div>
                          <div>
                            <strong>Learning goal:</strong> {draft.learningGoal || "Not provided"}
                          </div>
                        </>
                      )}
                      {isMentor && (
                        <>
                          <div>
                            <strong>Headline:</strong> {draft.headline || "Not provided"}
                          </div>
                          <div>
                            <strong>Languages taught:</strong>{" "}
                            {draft.teachingLangs.length
                              ? draft.teachingLangs
                                  .map(
                                    (code) => LANGUAGES.find((l) => l.code === code)?.name ?? code,
                                  )
                                  .join(", ")
                              : "None selected"}
                          </div>
                          <div>
                            <strong>Hourly rate:</strong> ${draft.hourlyRate || "0"}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(4)}>
                      Back
                    </Button>
                    <Button className="flex-1" onClick={finish} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish onboarding"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <aside className="rounded-3xl border border-border bg-background p-6 shadow-sm shadow-slate-900/5">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Need help?</p>
            <h2 className="mt-4 text-lg font-semibold">Get set up quickly</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Follow each step to capture your role, profile, and preferences. You can always update
              this later in settings.
            </p>
            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border bg-slate-50 p-3">
                Step 2 selects your account type.
              </div>
              <div className="rounded-2xl border border-border bg-slate-50 p-3">
                Step 3 captures your public profile.
              </div>
              <div className="rounded-2xl border border-border bg-slate-50 p-3">
                Step 4 collects either learning or teaching details.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
