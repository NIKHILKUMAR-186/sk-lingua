import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMentorApplication } from "@/hooks/use-mentor-application";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, FileText, Save, ArrowLeft, ArrowRight } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { ResumePreview } from "@/components/resume-preview";
import { ApplicationTimeline } from "@/components/application-timeline";
import { APPLICATION_STATUS_LABELS } from "@/lib/mentorApplications";
import { cn } from "@/lib/utils";

const MAX_RESUME_SIZE = 10 * 1024 * 1024;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = [
  "Morning (6am-12pm)",
  "Afternoon (12pm-5pm)",
  "Evening (5pm-9pm)",
  "Night (9pm-12am)",
];
const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "India",
  "Germany",
  "France",
  "Spain",
  "Brazil",
  "Mexico",
  "Japan",
  "China",
  "South Korea",
  "Other",
];
const QUALS = [
  "High School",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD / Doctorate",
  "Teaching Certification",
  "TEFL / TESOL",
  "Other",
];
const CERTS = ["TEFL", "TESOL", "CELTA", "DELTA", "IELTS Examiner", "Other"];
const STEPS = [
  { id: 1, label: "Personal" },
  { id: 2, label: "Professional" },
  { id: 3, label: "Availability" },
  { id: 4, label: "Profile" },
  { id: 5, label: "Resume" },
  { id: 6, label: "Review" },
];

// Single source of truth for required fields and their human-readable labels.
const REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "full_name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "phone_number", label: "Phone Number" },
  { key: "country", label: "Country" },
  { key: "state", label: "State" },
  { key: "city", label: "City" },
  { key: "native_language", label: "Native Language" },
  { key: "teaching_languages", label: "Teaching Languages" },
  { key: "years_of_experience", label: "Years of Experience" },
  { key: "current_occupation", label: "Current Occupation" },
  { key: "highest_qualification", label: "Highest Qualification" },
  { key: "bio", label: "Bio" },
];

export function MentorApplicationForm() {
  const { data: auth } = useAuth();
  const { draft, setDraft, saveDraft, replaceResume, saving, isLoading } = useMentorApplication();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  if (isLoading || !draft) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show status page if already submitted
  if (draft?.status && draft.status !== "draft" && draft.status !== "submitted") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Application {APPLICATION_STATUS_LABELS[draft.status] ?? draft.status}
            </CardTitle>
            <CardDescription>
              Application ID: {draft.application_id_display ?? draft.id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Current Status</p>
              <Badge className="mt-2">
                {APPLICATION_STATUS_LABELS[draft.status] ?? draft.status}
              </Badge>
            </div>
            {draft.id ? <ApplicationTimeline applicationId={draft.id} /> : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  function update(field: string, value: any) {
    setDraft({ ...(draft ?? {}), [field]: value });
  }

  function toggleArray(field: string, value: string) {
    const current = draft?.[field] ?? [];
    const next = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    update(field, next);
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!auth?.user) {
      toast.error("Please sign in to upload your resume.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeError(null);
    if (file.size > MAX_RESUME_SIZE) {
      setResumeError("Resume must be under 10 MB.");
      return;
    }
    if (file.type !== "application/pdf") {
      setResumeError("Only PDF files are allowed.");
      return;
    }
    try {
      await replaceResume(file);
      toast.success("Resume uploaded successfully");
    } catch (err: any) {
      setResumeError(err?.message ?? "Failed to upload resume");
    }
  }

  function validateApplication(): string[] {
    const missing: string[] = [];
    for (const field of REQUIRED_FIELDS) {
      const value = draft?.[field.key];
      const isEmpty =
        value == null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === "number" && Number.isNaN(value));
      if (isEmpty) missing.push(field.label);
    }
    // Resume is required — check for the stored reference (path or url), not a File object.
    const hasResume = draft?.resume_path || draft?.resume_url;
    if (!hasResume) missing.push("Resume");
    return missing;
  }

  async function handleSubmit() {
    if (!auth?.user) {
      toast.error("Please sign in to submit your application.");
      return;
    }
    const missing = validateApplication();
    if (missing.length > 0) {
      toast.error(`Missing required fields: ${missing.join(", ")}`);
      // Jump to the first step that has a missing field for a better UX.
      const firstMissingKey = REQUIRED_FIELDS.find((f) => missing.includes(f.label))?.key;
      if (firstMissingKey === "native_language") setStep(1);
      else if (["teaching_languages", "years_of_experience", "current_occupation", "highest_qualification"].includes(firstMissingKey ?? "")) setStep(2);
      else if (firstMissingKey === "bio") setStep(4);
      else if (firstMissingKey === "resume") setStep(5);
      return;
    }
    setSubmitting(true);
    try {
      // Persist the draft first so we have a stable row id to update.
      const saved = (await saveDraft()) as any;
      const applicationId = draft?.id ?? (Array.isArray(saved) ? saved?.[0]?.id : saved?.id);
      if (!applicationId) {
        throw new Error("Could not determine application id after saving draft.");
      }
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("mentor_applications")
        .update({ status: "submitted" })
        .eq("id", applicationId);
      if (error) throw error;
      await (supabase as any).from("mentor_application_status_history").insert([
        {
          application_id: applicationId,
          new_status: "submitted",
          changed_by: auth?.user?.id,
          notes: "Application submitted by applicant",
        },
      ]);
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (admins) {
        for (const admin of admins) {
          await (supabase as any).from("notifications").insert([
            {
              user_id: admin.user_id,
              title: "New Mentor Application",
              body: `${draft.full_name} submitted a mentor application.`,
              category: "general",
              kind: "mentor_application",
              related_id: applicationId,
              link: "/admin/mentor-applications",
            },
          ]);
        }
      }
      await (supabase as any).from("notifications").insert([
        {
          user_id: auth?.user?.id,
          title: "Application Submitted",
          body: "Your mentor application has been submitted successfully.",
          category: "general",
          kind: "mentor_application",
          related_id: applicationId,
        },
      ]);
      toast.success("Application submitted successfully!");
      setDraft({ ...draft, id: applicationId, status: "submitted" });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  const isLast = step === STEPS.length;
  const isFirst = step === 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              step === s.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {s.id}. {s.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {STEPS.find((s) => s.id === step)?.label} Details
          </CardTitle>
          <CardDescription>
            Step {step} of {STEPS.length} — your progress is saved automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={draft.full_name ?? ""}
                  onChange={(e) => update("full_name", e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={draft.email ?? ""}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone_number">Phone *</Label>
                <Input
                  id="phone_number"
                  value={draft.phone_number ?? ""}
                  onChange={(e) => update("phone_number", e.target.value)}
                  placeholder="+1 555 000 0000"
                />
              </div>
              <div>
                <Label htmlFor="country">Country *</Label>
                <select
                  id="country"
                  value={draft.country ?? ""}
                  onChange={(e) => update("country", e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="state">State / Region *</Label>
                <Input
                  id="state"
                  value={draft.state ?? ""}
                  onChange={(e) => update("state", e.target.value)}
                  placeholder="State or region"
                />
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={draft.city ?? ""}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="native_language">Native Language *</Label>
                <select
                  id="native_language"
                  value={draft.native_language ?? ""}
                  onChange={(e) => update("native_language", e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select native language</option>
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.emoji} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Languages You Teach *</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => {
                    const selected = (draft.teaching_languages ?? []).includes(lang.code);
                    return (
                      <button
                        type="button"
                        key={lang.code}
                        onClick={() => toggleArray("teaching_languages", lang.code)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {lang.emoji} {lang.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label htmlFor="years_of_experience">Years of Experience *</Label>
                <Input
                  id="years_of_experience"
                  type="number"
                  min={0}
                  value={draft.years_of_experience ?? ""}
                  onChange={(e) => update("years_of_experience", Number(e.target.value))}
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <Label htmlFor="current_occupation">Current Occupation *</Label>
                <Input
                  id="current_occupation"
                  value={draft.current_occupation ?? ""}
                  onChange={(e) => update("current_occupation", e.target.value)}
                  placeholder="e.g. Language Teacher"
                />
              </div>
              <div>
                <Label htmlFor="highest_qualification">Highest Qualification *</Label>
                <select
                  id="highest_qualification"
                  value={draft.highest_qualification ?? ""}
                  onChange={(e) => update("highest_qualification", e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select qualification</option>
                  {QUALS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="teaching_experience">Teaching Experience</Label>
                <Textarea
                  id="teaching_experience"
                  value={draft.teaching_experience ?? ""}
                  onChange={(e) => update("teaching_experience", e.target.value)}
                  placeholder="Describe your teaching experience"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Certifications</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CERTS.map((cert) => {
                    const selected = (draft.certifications ?? []).includes(cert);
                    return (
                      <button
                        type="button"
                        key={cert}
                        onClick={() => toggleArray("certifications", cert)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {cert}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Available Days</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAYS.map((day) => {
                    const selected = (draft.available_days ?? []).includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleArray("available_days", day)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Available Time Slots</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SLOTS.map((slot) => {
                    const selected = (draft.available_time_slots ?? []).includes(slot);
                    return (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => toggleArray("available_time_slots", slot)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={draft.timezone ?? ""}
                  onChange={(e) => update("timezone", e.target.value)}
                  placeholder="e.g. America/New_York"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="bio">Bio *</Label>
                <Textarea
                  id="bio"
                  value={draft.bio ?? ""}
                  onChange={(e) => update("bio", e.target.value)}
                  placeholder="Tell us about yourself and your teaching philosophy"
                  rows={4}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    value={draft.linkedin_url ?? ""}
                    onChange={(e) => update("linkedin_url", e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div>
                  <Label htmlFor="portfolio_url">Portfolio (optional)</Label>
                  <Input
                    id="portfolio_url"
                    value={draft.portfolio_url ?? ""}
                    onChange={(e) => update("portfolio_url", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">Upload your resume (PDF only)</p>
                <p className="text-xs text-muted-foreground">Maximum size: 10 MB</p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleResumeUpload}
                  className="mt-4 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                />
                {resumeError && <p className="mt-2 text-sm text-red-500">{resumeError}</p>}
              </div>
              {draft.resume_path || draft.resume_url ? (
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{draft.resume_file_name}</span>
                  <Badge variant="outline" className="ml-auto">
                    Uploaded
                  </Badge>
                </div>
              ) : null}
              <ResumePreview
                url={draft.resume_url}
                path={draft.resume_path}
                fileName={draft.resume_file_name}
              />
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Personal Details</h3>
                <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                  <div>
                    <strong>Name:</strong> {draft.full_name}
                  </div>
                  <div>
                    <strong>Email:</strong> {draft.email}
                  </div>
                  <div>
                    <strong>Phone:</strong> {draft.phone_number}
                  </div>
                  <div>
                    <strong>Location:</strong>{" "}
                    {[draft.city, draft.state, draft.country].filter(Boolean).join(", ")}
                  </div>
                  <div>
                    <strong>Native Language:</strong>{" "}
                    {LANGUAGES.find((l) => l.code === draft.native_language)?.name ??
                      draft.native_language}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Professional Details</h3>
                <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                  <div>
                    <strong>Languages:</strong>{" "}
                    {(draft.teaching_languages ?? [])
                      .map((c: string) => LANGUAGES.find((l) => l.code === c)?.name ?? c)
                      .join(", ")}
                  </div>
                  <div>
                    <strong>Experience:</strong> {draft.years_of_experience} years
                  </div>
                  <div>
                    <strong>Occupation:</strong> {draft.current_occupation}
                  </div>
                  <div>
                    <strong>Qualification:</strong> {draft.highest_qualification}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Availability</h3>
                <div className="mt-2 text-sm">
                  <div>
                    <strong>Days:</strong>{" "}
                    {(draft.available_days ?? []).join(", ") || "Not specified"}
                  </div>
                  <div>
                    <strong>Time Slots:</strong>{" "}
                    {(draft.available_time_slots ?? []).join(", ") || "Not specified"}
                  </div>
                  <div>
                    <strong>Timezone:</strong> {draft.timezone || "Not specified"}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Profile</h3>
                <p className="mt-2 text-sm">{draft.bio}</p>
                {draft.linkedin_url && (
                  <p className="mt-2 text-sm">
                    <strong>LinkedIn:</strong> {draft.linkedin_url}
                  </p>
                )}
                {draft.portfolio_url && (
                  <p className="mt-2 text-sm">
                    <strong>Portfolio:</strong> {draft.portfolio_url}
                  </p>
                )}
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Resume</h3>
                <p className="mt-2 text-sm">{draft.resume_file_name ?? "No resume uploaded"}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={isFirst}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => void saveDraft()} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}{" "}
                Save Draft
              </Button>
              {!isLast ? (
                <Button onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => void handleSubmit()} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}{" "}
                  Submit Application
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}