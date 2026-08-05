import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useEffect, useState } from "react";
import { useMentorApplication } from "@/hooks/use-mentor-application";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResumePreview } from "@/components/resume-preview";
import { ApplicationTimeline } from '@/components/application-timeline';
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mentor/application")({
  component: MentorApplicationRoute,
});

function MentorApplicationRoute() {
  const { draft, setDraft, saveDraft, replaceResume, saving, isLoading } = useMentorApplication();
  const [step, setStep] = useState(1);

  useEffect(() => { if (!draft) return; }, [draft]);

  if (isLoading || !draft) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  function update(field: string, value: any) {
    setDraft({ ...(draft ?? {}), [field]: value });
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await replaceResume(file);
    } catch (err) { console.error(err); }
  }

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-display">Mentor application</h1>
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="mb-3 text-sm text-muted-foreground">Step {step} of 4</div>
            {step === 1 && (
              <div className="space-y-3">
                <Label>Full name</Label>
                <Input value={draft.full_name ?? ""} onChange={(e) => update("full_name", e.target.value)} />
                <Label>Email</Label>
                <Input value={draft.email ?? ""} onChange={(e) => update("email", e.target.value)} />
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => setStep(2)}>Next</Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <Label>Teaching languages</Label>
                <Input value={(draft.teaching_languages ?? []).join(", ")} onChange={(e) => update("teaching_languages", e.target.value.split(",").map(s => s.trim()))} />
                <Label>Experience</Label>
                <Textarea value={draft.experience ?? ""} onChange={(e) => update("experience", e.target.value)} />
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setStep(3)}>Next</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <Label>Why apply</Label>
                <Textarea value={draft.why_apply ?? ""} onChange={(e) => update("why_apply", e.target.value)} />
                <Label>Teaching methodology</Label>
                <Textarea value={draft.teaching_methodology ?? ""} onChange={(e) => update("teaching_methodology", e.target.value)} />
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button onClick={() => setStep(4)}>Next</Button>
                </div>
              </div>
            )}

          {step === 4 && (
              <div className="space-y-3">
                <Label>Resume</Label>
                <input type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFileChange} />
                <ResumePreview url={draft.resume_url} fileName={draft.resume_file_name} />
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
                  <Button onClick={async () => {
                    // Basic validation
                    if (!draft.full_name || !draft.email) {
                      toast.error('Please provide your full name and email.');
                      setStep(1);
                      return;
                    }
                    try {
                      await saveDraft();
                      toast.success('Application submitted');
                    } catch (err: any) {
                      toast.error(err?.message ?? String(err));
                    }
                  }} disabled={saving}>{saving ? 'Saving…' : 'Submit application'}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {draft?.id ? (
          <div className="rounded-lg border p-4">
            <ApplicationTimeline applicationId={draft.id} />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
