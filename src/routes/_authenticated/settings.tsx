import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ProfileEditor, type ProfileEditorValues } from "@/components/profile-editor";
import { uploadStorageFile } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LANGUAGES } from "@/lib/languages";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const initialStudentValues: ProfileEditorValues = {
  full_name: "",
  headline: "",
  bio: "",
  state: "",
  timezone: "",
  native_language: "en",
  languages_taught: [],
  years_experience: "0",
  hourly_rate: "0",
  teaching_style: "",
  certifications: "",
  education: "",
  linkedin_url: "",
  website_url: "",
  youtube_url: "",
  availability_preview: "",
  avatar_url: "",
  cover_url: "",
  learning_goal: "",
  target_language: "",
  current_level: "",
  interests: "",
  github_url: "",
};

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [values, setValues] = useState<ProfileEditorValues>(initialStudentValues);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);

  useEffect(() => {
    if (!auth?.profile) return;
    setValues({
      ...initialStudentValues,
      full_name: auth.profile.full_name ?? "",
      bio: auth.profile.bio ?? "",
      state: auth.profile.state ?? "",
      native_language: auth.profile.native_language ?? "en",
      avatar_url: auth.profile.avatar_url ?? "",
      cover_url: auth.profile.cover_url ?? "",
      timezone: auth.profile.timezone ?? "",
      linkedin_url: auth.profile.linkedin_url ?? "",
      github_url: auth.profile.github_url ?? "",
      website_url: auth.profile.website_url ?? "",
      youtube_url: auth.profile.youtube_url ?? "",
      learning_goal: auth.profile.learning_goal ?? "",
      target_language: auth.profile.target_language ?? "",
      current_level: auth.profile.current_level ?? "",
      interests: auth.profile.interests ?? "",
    });
  }, [auth?.profile]);

  function updateField(field: keyof ProfileEditorValues, value: string | string[]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function uploadFile(file: File, field: "avatar_url" | "cover_url") {
    if (!auth?.user?.id) return;
    if (field === "avatar_url") setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const upload = await uploadStorageFile(file, `student/${auth.user.id}`);
      setValues((current) => ({ ...current, [field]: upload.publicUrl }));
      toast.success(`${field === "avatar_url" ? "Profile photo" : "Cover photo"} uploaded`);
    } catch (error) {
      toast.error((error as Error).message ?? "Upload failed");
    } finally {
      if (field === "avatar_url") setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  }

  async function saveProfile() {
    if (!auth?.user) return;
    setSaving(true);

    const profilePayload = {
      full_name: values.full_name || null,
      avatar_url: values.avatar_url || null,
      cover_url: values.cover_url || null,
      bio: values.bio || null,
      state: values.state || null,
      native_language: values.native_language || null,
      timezone: values.timezone || null,
      linkedin_url: values.linkedin_url || null,
      github_url: values.github_url || null,
      website_url: values.website_url || null,
      youtube_url: values.youtube_url || null,
      learning_goal: values.learning_goal || null,
      target_language: values.target_language || null,
      current_level: values.current_level || null,
      interests: values.interests || null,
    };

    const { error } = await supabase.from("profiles").update(profilePayload).eq("id", auth.user.id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["auth-session"] });
  }

  if (auth?.role === "student") {
    return (
      <AppShell variant="student">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h1 className="text-3xl font-display">Student profile</h1>
            <p className="text-muted-foreground">Tell mentors about your learning goals and interests.</p>
          </div>
          <ProfileEditor
            mode="student"
            values={values}
            saving={saving}
            onChange={updateField}
            onSave={saveProfile}
            onAvatarUpload={(file) => uploadFile(file, "avatar_url")}
            onCoverUpload={(file) => uploadFile(file, "cover_url")}
            uploadingAvatar={uploadingAvatar}
            uploadingCover={uploadingCover}
          />
        </div>
      </AppShell>
    );
  }

  const variant = auth?.role === "mentor" ? "mentor" : "student";

  return (
    <AppShell variant={variant}>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-display">Settings</h1>
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Full name</Label><input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={auth?.profile?.full_name ?? ""} disabled /></div>
            <div><Label>Email</Label><input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={auth?.user?.email ?? ""} disabled /></div>
            <div><Label>State</Label><input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={auth?.profile?.state ?? ""} disabled /></div>
            <div><Label>Native language</Label><select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={auth?.profile?.native_language ?? "en"} disabled>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.emoji} {l.name}</option>)}
            </select></div>
            <div><Label>Bio</Label><textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={auth?.profile?.bio ?? ""} disabled /></div>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Notifications</CardTitle></CardHeader><CardContent>
          <div className="flex items-center justify-between"><div><div className="font-medium">Email notifications</div><div className="text-xs text-muted-foreground">Session updates, streaks, reminders.</div></div><Switch checked={emailNotif} onCheckedChange={setEmailNotif} /></div>
        </CardContent></Card>
      </div>
    </AppShell>
  );
}
