import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfileEditor, type ProfileEditorValues } from "@/components/profile-editor";
import { uploadStorageFile } from "@/lib/storage";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MentorAvailability } from "@/components/mentor-availability";
import { GigManager } from "@/components/gig-manager";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";

const initialValues: ProfileEditorValues = {
  full_name: "",
  headline: "",
  bio: "",
  about: "",
  state: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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

export const Route = createFileRoute("/_authenticated/mentor/profile")({
  component: MentorProfileEdit,
});

function MentorProfileEdit() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const { data: mp } = useQuery({
    queryKey: ["mentor-profile", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("mentor_profiles").select("*").eq("user_id", uid!).maybeSingle()).data,
  });
  const [values, setValues] = useState<ProfileEditorValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (!uid) return;
    setValues({
      ...initialValues,
      full_name: auth?.profile?.full_name ?? "",
      bio: auth?.profile?.bio ?? "",
      about: mp?.about ?? "",
      state: auth?.profile?.state ?? "",
      native_language: auth?.profile?.native_language ?? "en",
      avatar_url: auth?.profile?.avatar_url ?? "",
      cover_url: auth?.profile?.cover_url ?? "",
      timezone: auth?.profile?.timezone ?? "",
      linkedin_url: auth?.profile?.linkedin_url ?? "",
      website_url: auth?.profile?.website_url ?? "",
      youtube_url: auth?.profile?.youtube_url ?? "",
      headline: mp?.headline ?? "",
      hourly_rate: String(mp?.hourly_rate ?? 0),
      languages_taught: mp?.languages_taught ?? [],
      certifications: (mp?.certifications ?? []).join("\n"),
      years_experience: String(mp?.years_experience ?? 0),
      teaching_style: mp?.teaching_style ?? "",
      education: mp?.education ?? "",
      availability_preview: mp?.availability_preview ?? "",
    });
  }, [uid, auth?.profile, mp]);

  function updateField(field: keyof ProfileEditorValues, value: string | string[]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function uploadFile(file: File, field: "avatar_url" | "cover_url") {
    if (!uid) return;
    if (field === "avatar_url") setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const upload = await uploadStorageFile(file, `mentor/${uid}`);
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
    if (!uid) return;
    setSaving(true);

    const profilePayload = {
      id: uid,
      full_name: values.full_name || null,
      avatar_url: values.avatar_url || null,
      cover_url: values.cover_url || null,
      state: values.state || null,
      native_language: values.native_language || null,
      bio: values.bio || null,
      timezone: values.timezone || null,
      linkedin_url: values.linkedin_url || null,
      website_url: values.website_url || null,
      youtube_url: values.youtube_url || null,
    };

    const mentorPayload = {
      user_id: uid,
      headline: values.headline || null,
      bio: values.bio || null,
      about: values.about || null,
      languages_taught: values.languages_taught,
      certifications: values.certifications.split("\n").filter(Boolean),
      hourly_rate: Number(values.hourly_rate) || 0,
      years_experience: Number(values.years_experience) || 0,
      teaching_style: values.teaching_style || null,
      education: values.education || null,
      linkedin_url: values.linkedin_url || null,
      website_url: values.website_url || null,
      youtube_url: values.youtube_url || null,
      timezone: values.timezone || null,
      cover_url: values.cover_url || null,
      availability_preview: values.availability_preview || null,
      availability: {},
      is_active: true,
    };

    const [{ error: profileError }, { error: mentorError }] = await Promise.all([
      supabase.from("profiles").upsert(profilePayload),
      supabase.from("mentor_profiles").upsert(mentorPayload),
    ]);

    setSaving(false);

    if (profileError || mentorError) {
      toast.error(profileError?.message ?? mentorError?.message ?? "Unable to save profile");
      return;
    }

    toast.success("Mentor profile saved");
    qc.invalidateQueries({ queryKey: ["auth-session"] });
    qc.invalidateQueries({ queryKey: ["mentor-profile", uid] });
  }

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-display">Mentor profile & gigs</h1>
          <p className="text-muted-foreground">Manage your professional profile, teaching services, and availability.</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="gigs">Gigs & services</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileEditor
              mode="mentor"
              values={values}
              saving={saving}
              onChange={updateField}
              onSave={saveProfile}
              onAvatarUpload={(file) => uploadFile(file, "avatar_url")}
              onCoverUpload={(file) => uploadFile(file, "cover_url")}
              uploadingAvatar={uploadingAvatar}
              uploadingCover={uploadingCover}
            />
          </TabsContent>

          <TabsContent value="gigs">
            {uid && <GigManager mentorId={uid} />}
          </TabsContent>

          <TabsContent value="availability">
            <MentorAvailability />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

