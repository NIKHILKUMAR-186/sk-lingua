import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ProfileEditor, type ProfileEditorValues } from "@/components/profile-editor";
import { useAuth } from "@/hooks/use-auth";
import { useNotificationPreferences } from "@/hooks/use-notifications";
import { NotificationPreferencesForm } from "@/modules/subscriptions/components/notification-preferences-form";
import { uploadStorageFile } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Bell, Lock, Globe, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const initialStudentValues: ProfileEditorValues = {
  full_name: "",
  headline: "",
  bio: "",
  about: "",
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

export const Route = createFileRoute("/_authenticated/student/student-settings")({
  component: StudentSettingsPage,
});

export function StudentSettingsPage() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const userId = auth?.user?.id;
  const { data: notificationPrefs, isLoading: prefsLoading } = useNotificationPreferences(
    userId ?? null,
  );

  const [values, setValues] = useState<ProfileEditorValues>(initialStudentValues);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

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

  async function sendPasswordResetEmail() {
    if (!auth?.user?.email) return;
    setResettingPassword(true);

    const { error } = await supabase.auth.resetPasswordForEmail(auth.user.email);
    setResettingPassword(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Password reset email sent to ${auth.user.email}`);
  }

  if (!auth?.user) {
    return (
      <AppShell variant="student">
        <div>Loading...</div>
      </AppShell>
    );
  }

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-5xl space-y-6 py-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-3xl font-display">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences and security.</p>
          </div>
        </div>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
              {prefsLoading ? (
                <div className="text-center text-muted-foreground">Loading preferences...</div>
              ) : (
                <NotificationPreferencesForm
                  preferences={notificationPrefs}
                  userId={userId!}
                  loading={prefsLoading}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold">Account privacy</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Your student profile information is shared with mentors so they can understand
                  your learning goals. Your email address is kept private and used only for account
                  access and important notifications.
                </p>
                <div className="mt-6 space-y-3 text-sm">
                  <div>
                    <span className="font-medium">Email</span>: {auth.user.email ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium">Role</span>: Student
                  </div>
                  <div>
                    <span className="font-medium">Profile visibility</span>: Visible to mentors
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold">Privacy controls</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Manage how you receive communications and keep your account secure in the other
                  tabs. We do not share your email without consent.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold">Password recovery</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Send a password reset link to your account email if you need to update your
                  password.
                </p>
                <button
                  className="mt-4 inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={sendPasswordResetEmail}
                  disabled={resettingPassword || !auth.user.email}
                >
                  {resettingPassword ? "Sending reset email..." : "Send reset email"}
                </button>
              </div>
              <div className="rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold">Session security</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  If you suspect unauthorized access, sign out from your browser and update your
                  password using the reset link.
                </p>
                <div className="mt-4 rounded-lg bg-secondary/5 p-4 text-sm">
                  <div className="font-medium">Current device</div>
                  <div className="text-muted-foreground mt-1">Secure browser session</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="language" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">Student profile settings</h2>
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
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">Appearance & locale</h2>
              <div className="space-y-4">
                <div className="rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold">Theme</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Choose light, dark, or follow system preference.
                  </p>
                  <div className="mt-4">
                    <select
                      value={localStorage.getItem("theme") || "system"}
                      onChange={(e: any) => {
                        localStorage.setItem("theme", e.target.value);
                        window.location.reload();
                      }}
                      className="rounded-md border px-2 py-1"
                    >
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold">Language</h3>
                  <p className="text-sm text-muted-foreground mt-2">Preferred UI language</p>
                  <div className="mt-4">
                    <input
                      value={localStorage.getItem("lang") || "en"}
                      onChange={(e: any) => localStorage.setItem("lang", e.target.value)}
                      className="rounded-md border px-2 py-1"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold">Timezone</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Set your preferred timezone for schedule display
                  </p>
                  <div className="mt-4">
                    <input
                      value={
                        localStorage.getItem("timezone") ||
                        Intl.DateTimeFormat().resolvedOptions().timeZone
                      }
                      onChange={(e: any) => localStorage.setItem("timezone", e.target.value)}
                      className="rounded-md border px-2 py-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
