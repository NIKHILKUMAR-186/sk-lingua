import { createFileRoute, Link } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/mentor/page-header";
import { SectionCard } from "@/components/mentor/section-card";
import { StatusBadge } from "@/components/mentor/status-badge";
import { ProfileCompletion } from "@/components/mentor/profile-completion";
import { PreviewDialog } from "@/components/mentor/preview-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  User,
  BookOpen,
  ExternalLink,
  Upload,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  Star,
  Globe,
  Clock,
  GraduationCap,
  Link as LinkIcon,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { uploadStorageFile } from "@/lib/storage";
import { getProfileCompletionPercent, type ProfileCompletionValues } from "@/lib/profile";
import { LANGUAGES } from "@/lib/languages";

export const Route = createFileRoute("/_authenticated/mentor/profile")({
  component: MentorProfileEdit,
});

type ProfileTab = "preview" | "edit";

function MentorProfileEdit() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();

  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("preview");
  const [saving, setSaving] = useState(false);

  const [values, setValues] = useState({
    full_name: "",
    headline: "",
    bio: "",
    about: "",
    state: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    native_language: "en",
    languages_taught: [] as string[],
    years_experience: "0",
    teaching_style: "",
    certifications: "",
    education: "",
    linkedin_url: "",
    website_url: "",
    youtube_url: "",
    availability_preview: "",
    avatar_url: "",
    cover_url: "",
  });

  const [initialValues, setInitialValues] = useState(values);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const { data: mp, isLoading: mpLoading } = useQuery({
    queryKey: ["mentor-profile", uid],
    enabled: !!uid,
    queryFn: async () =>
      (await supabase.from("mentor_profiles").select("*").eq("user_id", uid!).maybeSingle()).data,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["mentor-reviews", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("reviews")
          .select("*")
          .eq("mentor_id", uid!)
          .order("created_at", { ascending: false })
          .limit(3)
      ).data ?? [],
  });

  useEffect(() => {
    if (!uid) return;
    const next = {
      full_name: auth?.profile?.full_name ?? "",
      bio: auth?.profile?.bio ?? "",
      about: mp?.about ?? "",
      state: auth?.profile?.state ?? "",
      timezone: auth?.profile?.timezone ?? "",
      native_language: auth?.profile?.native_language ?? "en",
      avatar_url: auth?.profile?.avatar_url ?? "",
      cover_url: auth?.profile?.cover_url ?? "",
      linkedin_url: auth?.profile?.linkedin_url ?? "",
      website_url: auth?.profile?.website_url ?? "",
      youtube_url: auth?.profile?.youtube_url ?? "",
      headline: mp?.headline ?? "",
      languages_taught: mp?.languages_taught ?? [],
      certifications: (mp?.certifications ?? []).join("\n"),
      years_experience: String(mp?.years_experience ?? 0),
      teaching_style: mp?.teaching_style ?? "",
      education: mp?.education ?? "",
      availability_preview: mp?.availability_preview ?? "",
    };
    setValues(next);
    setInitialValues(next);
  }, [uid, auth?.profile, mp]);

  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  const completion = useMemo(
    () =>
      getProfileCompletionPercent(
        {
          ...(mp ?? {}),
          ...(auth?.profile ?? {}),
        } as ProfileCompletionValues,
        "mentor",
      ),
    [mp, auth?.profile],
  );

  function updateField(field: string, value: string | string[]) {
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
      years_experience: Number(values.years_experience) || 0,
      teaching_style: values.teaching_style || null,
      education: values.education || null,
      linkedin_url: values.linkedin_url || null,
      website_url: values.website_url || null,
      youtube_url: values.youtube_url || null,
      timezone: values.timezone || null,
      cover_url: values.cover_url || null,
      availability_preview: values.availability_preview || null,
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

    toast.success("Profile saved");
    setInitialValues(values);
    qc.invalidateQueries({ queryKey: ["auth-session"] });
    qc.invalidateQueries({ queryKey: ["mentor-profile", uid] });
  }

  function discardChanges() {
    setValues(initialValues);
    toast.success("Changes discarded");
  }

  const previewData = useMemo(() => {
    const studentMap = new Map<string, any>();
    return {
      name: values.full_name || "Mentor",
      avatar: values.avatar_url,
      headline: values.headline,
      bio: values.bio || values.about,
      languages: values.languages_taught,
      experience: values.years_experience,
      teachingStyle: values.teaching_style,
      certifications: values.certifications.split("\n").filter(Boolean),
      education: values.education,
      links: {
        linkedin: values.linkedin_url,
        website: values.website_url,
        youtube: values.youtube_url,
      },
      rating: mp?.rating_avg ?? null,
      totalReviews: mp?.total_reviews ?? 0,
    };
  }, [values, mp]);

  return (
    <MentorLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="My Profile"
          description="Manage how students discover and understand you."
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Preview profile
              </Button>
              {activeTab === "edit" && isDirty && (
                <>
                  <Button variant="ghost" size="sm" onClick={discardChanges}>
                    <X className="mr-1.5 h-4 w-4" />
                    Discard
                  </Button>
                  <Button size="sm" onClick={saveProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Save className="mr-1.5 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-1.5 h-4 w-4" />
                        Save changes
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProfileTab)}>
          <TabsList className="mb-6">
            <TabsTrigger value="preview">Profile preview</TabsTrigger>
            <TabsTrigger value="edit">Edit profile</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-6">
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="relative h-32 bg-gradient-to-r from-blue-50 to-indigo-50">
                {values.cover_url && (
                  <img
                    src={values.cover_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="px-6 pb-6">
                <div className="relative -mt-12 mb-4">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-muted shadow-sm">
                    {values.avatar_url ? (
                      <img
                        src={values.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <h2 className="text-xl font-display font-semibold text-foreground">
                  {previewData.name}
                </h2>
                {previewData.headline && (
                  <p className="mt-1 text-sm text-muted-foreground">{previewData.headline}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {previewData.languages.map((lang: string) => (
                    <Badge key={lang} variant="secondary" className="text-xs">
                      {lang}
                    </Badge>
                  ))}
                </div>

                {previewData.bio && (
                  <p className="mt-4 text-sm text-foreground/80 leading-relaxed">{previewData.bio}</p>
                )}

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{previewData.experience} years experience</span>
                  </div>
                  {previewData.rating !== null && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span>{Number(previewData.rating).toFixed(1)} ({previewData.totalReviews} reviews)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="h-4 w-4 text-primary" />
                    <span>{values.timezone || "Timezone not set"}</span>
                  </div>
                </div>

                {previewData.teachingStyle && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-foreground">Teaching style</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{previewData.teachingStyle}</p>
                  </div>
                )}

                {previewData.certifications.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-foreground">Certifications</h3>
                    <ul className="mt-2 space-y-1">
                      {previewData.certifications.map((cert: string) => (
                        <li key={cert} className="text-xs text-muted-foreground flex items-center gap-2">
                          <GraduationCap className="h-3.5 w-3.5 text-primary" />
                          {cert}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {previewData.education && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-foreground">Education</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{previewData.education}</p>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  {previewData.links.linkedin && (
                    <a
                      href={previewData.links.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                  )}
                  {previewData.links.website && (
                    <a
                      href={previewData.links.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="space-y-6">
            <ProfileCompletion values={values} mode="mentor" />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1 space-y-4">
                <SectionCard title="Profile media">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        Profile photo
                      </Label>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {values.avatar_url ? (
                            <img
                              src={values.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition">
                          <Upload className="h-3.5 w-3.5" />
                          {uploadingAvatar ? "Uploading..." : values.avatar_url ? "Replace" : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadFile(file, "avatar_url");
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Cover photo</Label>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {values.cover_url ? (
                            <img src={values.cover_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition">
                          <Upload className="h-3.5 w-3.5" />
                          {uploadingCover ? "Uploading..." : values.cover_url ? "Replace" : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadFile(file, "cover_url");
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <ProfileCompletion values={values} mode="mentor" />
              </div>

              <div className="lg:col-span-2 space-y-6">
                <SectionCard title="Basic information">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Full name</Label>
                      <Input
                        value={values.full_name}
                        onChange={(e) => updateField("full_name", e.target.value)}
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">State</Label>
                      <Input
                        value={values.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        placeholder="e.g., California"
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">Headline</Label>
                    <Input
                      value={values.headline}
                      onChange={(e) => updateField("headline", e.target.value)}
                      placeholder="e.g., Certified English conversation coach"
                    />
                  </div>
                </SectionCard>

                <SectionCard title="About you">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Bio</Label>
                    <Textarea
                      rows={4}
                      value={values.bio}
                      onChange={(e) => updateField("bio", e.target.value)}
                      placeholder="Tell students about yourself..."
                    />
                  </div>
                </SectionCard>

                <SectionCard title="Teaching identity">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Native language</Label>
                      <select
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                        value={values.native_language}
                        onChange={(e) => updateField("native_language", e.target.value)}
                      >
                        {LANGUAGES.filter((language) => language.code === "en").map((language) => (
                          <option key={language.code} value={language.code}>
                            {language.emoji} {language.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Years of experience</Label>
                      <Input
                        type="number"
                        value={values.years_experience}
                        onChange={(e) => updateField("years_experience", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">Languages taught</Label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.filter((language) => language.code === "en").map((language) => {
                        const selected = values.languages_taught.includes(language.code);
                        return (
                          <button
                            key={language.code}
                            type="button"
                            onClick={() => {
                              const next = selected
                                ? values.languages_taught.filter((item: string) => item !== language.code)
                                : [...values.languages_taught, language.code];
                              updateField("languages_taught", next);
                            }}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm transition",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:border-primary/30",
                            )}
                          >
                            {language.emoji} {language.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">Teaching style</Label>
                    <Input
                      value={values.teaching_style}
                      onChange={(e) => updateField("teaching_style", e.target.value)}
                      placeholder="e.g., Conversation-focused, structured lessons"
                    />
                  </div>
                </SectionCard>

                <SectionCard title="Credentials">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Certifications</Label>
                      <Textarea
                        rows={3}
                        value={values.certifications}
                        onChange={(e) => updateField("certifications", e.target.value)}
                        placeholder="One certification per line"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Education</Label>
                      <Textarea
                        rows={3}
                        value={values.education}
                        onChange={(e) => updateField("education", e.target.value)}
                        placeholder="Your educational background"
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Links">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">LinkedIn</Label>
                      <Input
                        value={values.linkedin_url}
                        onChange={(e) => updateField("linkedin_url", e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Website</Label>
                      <Input
                        value={values.website_url}
                        onChange={(e) => updateField("website_url", e.target.value)}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {activeTab === "edit" && isDirty && (
          <div className="sticky bottom-6 z-40 flex items-center justify-between rounded-xl border border-border/60 bg-card p-4 shadow-lg">
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={discardChanges}>
                Discard
              </Button>
              <Button size="sm" onClick={saveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <PreviewDialog open={showPreview} onClose={() => setShowPreview(false)}>
        <div className="relative h-32 bg-gradient-to-r from-blue-50 to-indigo-50">
          {values.cover_url && (
            <img src={values.cover_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="px-6 pb-6">
          <div className="relative -mt-10 mb-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-muted shadow-sm">
              {previewData.avatar ? (
                <img
                  src={previewData.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          </div>
          <h2 className="text-lg font-display font-semibold text-foreground">{previewData.name}</h2>
          {previewData.headline && (
            <p className="mt-1 text-sm text-muted-foreground">{previewData.headline}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {previewData.languages.map((lang: string) => (
              <Badge key={lang} variant="secondary" className="text-xs">
                {lang}
              </Badge>
            ))}
          </div>
          {previewData.bio && (
            <p className="mt-4 text-sm text-foreground/80 leading-relaxed">{previewData.bio}</p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              <span>{previewData.experience} years experience</span>
            </div>
            {previewData.rating !== null && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span>
                  {Number(previewData.rating).toFixed(1)} ({previewData.totalReviews} reviews)
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-4 w-4 text-primary" />
              <span>{values.timezone || "Timezone not set"}</span>
            </div>
          </div>
          {previewData.teachingStyle && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground">Teaching style</h3>
              <p className="mt-1 text-xs text-muted-foreground">{previewData.teachingStyle}</p>
            </div>
          )}
          {previewData.certifications.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground">Certifications</h3>
              <ul className="mt-2 space-y-1">
                {previewData.certifications.map((cert: string) => (
                  <li key={cert} className="text-xs text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    {cert}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {previewData.education && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground">Education</h3>
              <p className="mt-1 text-xs text-muted-foreground">{previewData.education}</p>
            </div>
          )}
        </div>
      </PreviewDialog>
    </MentorLayout>
  );
}