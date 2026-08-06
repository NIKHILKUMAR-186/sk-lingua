export type ProfileCompletionMode = "mentor" | "student";

export type ProfileCompletionValues = {
  full_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  state?: string | null;
  timezone?: string | null;
  native_language?: string | null;
  languages_taught?: string[] | null;
  years_experience?: string | number | null;
  hourly_rate?: string | number | null;
  teaching_style?: string | null;
  certifications?: string | null;
  education?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  youtube_url?: string | null;
  availability_preview?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  learning_goal?: string | null;
  target_language?: string | null;
  current_level?: string | null;
  interests?: string | null;
  github_url?: string | null;
};

const mentorFields: Array<keyof ProfileCompletionValues> = [
  "full_name",
  "headline",
  "bio",
  "state",
  "timezone",
  "native_language",
  "languages_taught",
  "years_experience",
  "hourly_rate",
  "teaching_style",
  "certifications",
  "education",
  "linkedin_url",
  "website_url",
  "youtube_url",
  "availability_preview",
  "avatar_url",
  "cover_url",
];

const studentFields: Array<keyof ProfileCompletionValues> = [
  "full_name",
  "bio",
  "state",
  "timezone",
  "native_language",
  "learning_goal",
  "target_language",
  "current_level",
  "interests",
  "avatar_url",
  "cover_url",
  "linkedin_url",
  "github_url",
];

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function getProfileCompletionPercent(
  values: ProfileCompletionValues,
  mode: ProfileCompletionMode,
) {
  const fields = mode === "mentor" ? mentorFields : studentFields;
  const filled = fields.filter((field) => hasValue(values[field])).length;
  return Math.round((filled / fields.length) * 100);
}
