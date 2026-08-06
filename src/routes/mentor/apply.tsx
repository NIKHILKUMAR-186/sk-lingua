import React, { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/mentor/apply")({
  component: MentorApplyPage,
});

function useAutosave(key: string, value: any) {
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(value));
    }, 1000);
    return () => clearTimeout(t);
  }, [key, value]);
}

function MentorApplyPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mentor-application-draft") || "{}");
    } catch {
      return {};
    }
  });

  useAutosave("mentor-application-draft", form);

  function updateField(k: string, v: any) {
    setForm((s: any) => ({ ...s, [k]: v }));
  }

  async function submit() {
    // basic validation
    if (
      !form.full_name ||
      !form.email ||
      !form.native_language ||
      !form.teaching_languages ||
      !form.resume
    ) {
      toast.error("Please fill required fields and upload resume");
      return;
    }

    try {
      const res = await fetch("/api/mentor-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submission failed");
      localStorage.removeItem("mentor-application-draft");
      toast.success("Application submitted");
      setStep(4);
    } catch (err: any) {
      toast.error(err?.message ?? String(err));
    }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-display">Apply to become a mentor</h1>
          <Link to="/">Back</Link>
        </div>
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Personal</p>
            <Input
              value={form.full_name || ""}
              onChange={(e: any) => updateField("full_name", e.target.value)}
              placeholder="Full name"
            />
            <Input
              value={form.email || ""}
              onChange={(e: any) => updateField("email", e.target.value)}
              placeholder="Email"
            />
            <Input
              value={form.phone_number || ""}
              onChange={(e: any) => updateField("phone_number", e.target.value)}
              placeholder="Phone number"
            />
            <div className="flex gap-2">
              <Button onClick={() => setStep(1)}>Next</Button>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Professional</p>
            <Input
              value={form.current_company || ""}
              onChange={(e: any) => updateField("current_company", e.target.value)}
              placeholder="Current company"
            />
            <Input
              value={form.current_role || ""}
              onChange={(e: any) => updateField("current_role", e.target.value)}
              placeholder="Current role"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={() => setStep(2)}>Next</Button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Documents</p>
            <input
              type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e: any) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const result = reader.result as string; // data:<mime>;base64,AAAA
                  const parts = result.split(",");
                  const b64 = parts[1];
                  updateField("resume", { fileName: f.name, contentBase64: b64, fileType: f.type });
                  toast.success("Resume attached");
                };
                reader.readAsDataURL(f);
              }}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Review & Submit</p>
            <div className="rounded-md border p-4">
              <p>
                <strong>Name:</strong> {form.full_name}
              </p>
              <p>
                <strong>Email:</strong> {form.email}
              </p>
              <p>
                <strong>Company:</strong> {form.current_company}
              </p>
              <p>
                <strong>Resume:</strong> {form.resume?.fileName}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={submit}>Submit application</Button>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-2xl">Thanks — application submitted</h2>
            <p>We will review your application and contact you via email.</p>
            <Button asChild>
              <Link to="/">Return home</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
