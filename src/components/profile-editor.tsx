import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES } from "@/lib/languages";
import { ImagePlus, UploadCloud, Loader2 } from "lucide-react";
import type { ChangeEvent } from "react";

export type ProfileEditorValues = {
  full_name: string;
  headline: string;
  bio: string;
  about: string;
  state: string;
  timezone: string;
  native_language: string;
  languages_taught: string[];
  years_experience: string;
  hourly_rate: string;
  teaching_style: string;
  certifications: string;
  education: string;
  linkedin_url: string;
  website_url: string;
  youtube_url: string;
  availability_preview: string;
  avatar_url: string;
  cover_url: string;
  learning_goal: string;
  target_language: string;
  current_level: string;
  interests: string;
  github_url: string;
};

export function ProfileEditor({
  mode,
  values,
  saving,
  onChange,
  onSave,
  onAvatarUpload,
  onCoverUpload,
  uploadingAvatar,
  uploadingCover,
}: {
  mode: "mentor" | "student";
  values: ProfileEditorValues;
  saving?: boolean;
  onChange: (field: keyof ProfileEditorValues, value: string | string[]) => void;
  onSave: () => void;
  onAvatarUpload?: (file: File) => Promise<void>;
  onCoverUpload?: (file: File) => Promise<void>;
  uploadingAvatar?: boolean;
  uploadingCover?: boolean;
}) {
  const update = (field: keyof ProfileEditorValues, value: string | string[]) => onChange(field, value);

  const renderLanguageToggle = (value: string[], field: keyof ProfileEditorValues) => (
    <div className="mt-2 flex flex-wrap gap-2">
      {LANGUAGES.map((language) => {
        const selected = value.includes(language.code);
        return (
          <button
            key={language.code}
            type="button"
            onClick={() => {
              const next = selected
                ? value.filter((item) => item !== language.code)
                : [...value, language.code];
              update(field, next);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
          >
            {language.emoji} {language.name}
          </button>
        );
      })}
    </div>
  );

  const uploadField = async (event: ChangeEvent<HTMLInputElement>, uploadHandler?: (file: File) => Promise<void>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadHandler) return;
    await uploadHandler(file);
    event.target.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "mentor" ? "Professional profile" : "Student profile"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Profile photo</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              <ImagePlus className="h-4 w-4" />
              <span>Upload profile photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadField(e, onAvatarUpload)} />
            </label>
            {uploadingAvatar ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Uploading profile photo…</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Cover photo</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              <UploadCloud className="h-4 w-4" />
              <span>Upload cover photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadField(e, onCoverUpload)} />
            </label>
            {uploadingCover ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Uploading cover photo…</p> : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={values.full_name} onChange={(e) => update("full_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input value={values.state} onChange={(e) => update("state", e.target.value)} />
          </div>
        </div>

        {mode === "mentor" ? (
          <>
            <div className="space-y-2">
              <Label>Headline</Label>
              <Input value={values.headline} onChange={(e) => update("headline", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea rows={4} value={values.bio} onChange={(e) => update("bio", e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={values.timezone} onChange={(e) => update("timezone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Native language</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={values.native_language} onChange={(e) => update("native_language", e.target.value)}>
                  {LANGUAGES.map((language) => (
                    <option key={language.code} value={language.code}>{language.emoji} {language.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Languages taught</Label>
              {renderLanguageToggle(values.languages_taught, "languages_taught")}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Years of experience</Label>
                <Input type="number" value={values.years_experience} onChange={(e) => update("years_experience", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hourly rate</Label>
                <Input type="number" value={values.hourly_rate} onChange={(e) => update("hourly_rate", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Teaching style</Label>
              <Input value={values.teaching_style} onChange={(e) => update("teaching_style", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Certifications</Label>
              <Textarea rows={3} value={values.certifications} onChange={(e) => update("certifications", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Education</Label>
              <Textarea rows={3} value={values.education} onChange={(e) => update("education", e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input value={values.linkedin_url} onChange={(e) => update("linkedin_url", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={values.website_url} onChange={(e) => update("website_url", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>YouTube</Label>
                <Input value={values.youtube_url} onChange={(e) => update("youtube_url", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Availability preview</Label>
                <Input value={values.availability_preview} onChange={(e) => update("availability_preview", e.target.value)} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea rows={4} value={values.bio} onChange={(e) => update("bio", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Learning goal</Label>
              <Input value={values.learning_goal} onChange={(e) => update("learning_goal", e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Target language</Label>
                <Input value={values.target_language} onChange={(e) => update("target_language", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Current level</Label>
                <Input value={values.current_level} onChange={(e) => update("current_level", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input value={values.timezone} onChange={(e) => update("timezone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Interests</Label>
              <Textarea rows={3} value={values.interests} onChange={(e) => update("interests", e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input value={values.linkedin_url} onChange={(e) => update("linkedin_url", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>GitHub</Label>
                <Input value={values.github_url} onChange={(e) => update("github_url", e.target.value)} />
              </div>
            </div>
          </>
        )}

        <Button onClick={onSave} disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save profile"}</Button>
      </CardContent>
    </Card>
  );
}
