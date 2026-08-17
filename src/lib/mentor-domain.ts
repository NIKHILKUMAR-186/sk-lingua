export type MentorStatus = "pending" | "approved" | "rejected" | "suspended";
export type AdminStatus = "pending" | "approved" | "rejected" | "suspended" | "inactive" | "active";
export type VerificationStatus = "verified" | "unverified";
export type MentorHealth = "healthy" | "good" | "needs_attention" | "incomplete" | "inactive";

export interface ProfileField {
  key: string;
  label: string;
  complete: boolean;
}

export interface MentorSessionBreakdown {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  confirmed: number;
  other: number;
}

export interface Mentor {
  userId: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  languagesTaught: string[];
  yearsExperience: number | null;
  ratingAvg: number;
  totalReviews: number;
  totalStudents: number;
  totalSessions: number;
  isVerified: boolean;
  isActive: boolean;
  dbStatus: MentorStatus | null;
  timezone: string | null;
  joinedDate: string | null;
  availabilityPreview: string | null;
  introVideoUrl: string | null;
  demoLessonUrl: string | null;
  coverUrl: string | null;
  headlineField: string | null;
  lastActive: string | null;
  responseRate: number | null;
  completionRate: number | null;
  accountStatus: AdminStatus;
  verificationStatus: VerificationStatus;
  health: MentorHealth;
  healthReasons: string[];
  profileCompleteness: number;
  profileFields: ProfileField[];
  availableToday: boolean;
  activeSlotCount: number;
  sessions: MentorSessionBreakdown;
  cancellationRate: number;
  noShowRate: number;
  hasApplication: boolean;
  applicationStatus: string | null;
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  country: string | null;
  city: string | null;
  updated_at: string | null;
  created_at: string | null;
};

export type MentorProfileRow = {
  user_id: string;
  headline: string | null;
  bio: string | null;
  languages_taught: string[] | null;
  certifications: string[] | null;
  education: string | null;
  education_json: unknown;
  experience: unknown;
  years_experience: number | null;
  teaching_style: string | null;
  hourly_rate: number | null;
  rating_avg: number | null;
  total_reviews: number | null;
  total_students: number | null;
  total_sessions: number | null;
  response_rate: number | null;
  completion_rate: number | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  account_active: boolean | null;
  timezone: string | null;
  joined_date: string | null;
  availability_preview: string | null;
  availability: unknown;
  intro_video_url: string | null;
  demo_lesson_url: string | null;
  cover_url: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  specializations: unknown;
  achievements: unknown;
  verification_badges: unknown;
  gallery_images: unknown;
  portfolio_images: unknown;
};

export type SessionRow = {
  id: string;
  mentor_id: string;
  student_id: string | null;
  status: string;
  scheduled_time: string;
  duration_mins: number | null;
  updated_at: string | null;
  created_at: string | null;
  session_started_at: string | null;
  session_ended_at: string | null;
};

export type SlotRow = {
  id: string;
  mentor_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  timezone: string | null;
  is_available: boolean | null;
  label: string | null;
};

export type ApplicationRow = {
  user_id: string | null;
  id: string;
  status: string;
  created_at: string | null;
  approved_at: string | null;
};

export type ReviewRow = {
  id: string;
  mentor_id: string | null;
  student_id: string | null;
  rating: number | null;
  review_text: string | null;
  comment: string | null;
  is_verified: boolean | null;
  created_at: string | null;
};

export type AuditLogRow = {
  id: string;
  action: string | null;
  description: string | null;
  actor_name: string | null;
  created_at: string | null;
  details: unknown;
};

export type AppHistoryRow = {
  id: string;
  new_status: string | null;
  notes: string | null;
  created_at: string | null;
};

export function todayDayName(): string {
  return DAYS[new Date().getDay()];
}

export function toAdminStatus(
  isActive: boolean | null,
  dbStatus: MentorStatus | string | null,
): AdminStatus {
  if (isActive === false) return dbStatus === "suspended" ? "suspended" : "inactive";
  if (dbStatus === "pending") return "pending";
  if (dbStatus === "rejected") return "rejected";
  if (dbStatus === "suspended") return "suspended";
  return "approved";
}

export function toVerificationStatus(isVerified: boolean | null): VerificationStatus {
  return isVerified === true ? "verified" : "unverified";
}

export function isMentorActive(adminStatus: AdminStatus): boolean {
  return adminStatus === "approved" || adminStatus === "active";
}

export interface CompletenessInput {
  full_name?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  headline?: string | null;
  bio?: string | null;
  languages_taught?: string[] | null;
  years_experience?: number | null;
  teaching_style?: string | null;
  certifications?: string[] | null;
  education?: string | null;
  intro_video_url?: string | null;
  timezone?: string | null;
  availability_preview?: string | null;
  availability?: unknown;
}

const MENTOR_PROFILE_FIELDS: { key: keyof CompletenessInput; label: string }[] = [
  { key: "full_name", label: "Full name" },
  { key: "avatar_url", label: "Profile photo" },
  { key: "cover_url", label: "Cover photo" },
  { key: "headline", label: "Headline" },
  { key: "bio", label: "Bio" },
  { key: "languages_taught", label: "Languages" },
  { key: "years_experience", label: "Years of experience" },
  { key: "teaching_style", label: "Teaching style" },
  { key: "certifications", label: "Certifications" },
  { key: "education", label: "Education" },
  { key: "intro_video_url", label: "Intro video" },
  { key: "availability", label: "Availability" },
];

function fieldHasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function computeProfileCompleteness(input: CompletenessInput): {
  percent: number;
  fields: ProfileField[];
  missing: string[];
} {
  const fields: ProfileField[] = MENTOR_PROFILE_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    complete: fieldHasValue(input[f.key]),
  }));
  const missing = fields.filter((f) => !f.complete).map((f) => f.label);
  const filled = fields.filter((f) => f.complete).length;
  const percent = Math.round((filled / fields.length) * 100);
  return { percent, fields, missing };
}

export interface HealthInput {
  isActive: boolean | null;
  dbStatus: MentorStatus | string | null;
  isVerified: boolean | null;
  profileCompleteness: number;
  activeSlotCount: number;
  hasAvailabilityToday: boolean;
  sessions: MentorSessionBreakdown;
  ratingAvg: number;
  totalReviews: number;
}

export function computeHealth(input: HealthInput): { health: MentorHealth; reasons: string[] } {
  const {
    isActive,
    dbStatus,
    isVerified,
    profileCompleteness,
    activeSlotCount,
    hasAvailabilityToday,
    sessions,
    ratingAvg,
    totalReviews,
  } = input;

  if (isActive === false) {
    return { health: "inactive", reasons: ["Mentor is inactive"] };
  }

  if (dbStatus === "suspended") {
    return { health: "inactive", reasons: ["Mentor is suspended"] };
  }

  if (dbStatus === "rejected") {
    return { health: "inactive", reasons: ["Application was rejected"] };
  }

  const reasons: string[] = [];

  if (dbStatus === "pending") {
    reasons.push("Pending approval");
  }
  if (!isVerified) {
    reasons.push("Not verified");
  }
  if (activeSlotCount === 0) {
    reasons.push("No availability configured");
  }
  if (!hasAvailabilityToday) {
    reasons.push("Not available today");
  }
  if (profileCompleteness < 50) {
    reasons.push(`Profile incomplete (${profileCompleteness}%)`);
  }
  if (sessions.total > 0) {
    if (sessions.cancelled > 0 && sessions.total >= 3) {
      const rate = Math.round((sessions.cancelled / sessions.total) * 100);
      if (rate >= 50) reasons.push(`High cancellation rate (${rate}%)`);
    }
    if (sessions.noShow > 0 && sessions.total >= 3) {
      const rate = Math.round((sessions.noShow / sessions.total) * 100);
      if (rate >= 25) reasons.push(`No-show rate (${rate}%)`);
    }
  }
  if (totalReviews > 0 && ratingAvg < 3) {
    reasons.push(`Low rating (${ratingAvg.toFixed(1)}★ from ${totalReviews} reviews)`);
  }
  if (sessions.total === 0 && totalReviews === 0) {
    reasons.push("No sessions completed yet");
  }

  const critical = profileCompleteness < 50 || activeSlotCount === 0;

  if (critical && reasons.length > 0) {
    return { health: "incomplete", reasons };
  }

  if (reasons.length > 0) {
    return { health: "needs_attention", reasons };
  }

  if (profileCompleteness >= 80 && isVerified && hasAvailabilityToday) {
    return { health: "healthy", reasons: [] };
  }

  return { health: "good", reasons: [] };
}

export interface MentorAvailabilitySlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  timezone: string | null;
  isAvailable: boolean;
  label: string | null;
}

export interface MentorSessionRecord {
  id: string;
  scheduledTime: string;
  status: string;
  durationMins: number;
  studentName: string | null;
  studentId: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface MentorReview {
  id: string;
  rating: number;
  reviewText: string | null;
  studentName: string | null;
  createdAt: string;
}

export interface MentorStudentRecord {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  lastSessionAt: string | null;
  sessionCount: number;
}

export interface MentorActivityEvent {
  id: string;
  event: string;
  detail: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface MentorApplicationLink {
  id: string;
  status: string;
  createdAt: string;
  approvedAt: string | null;
}

export interface MentorAvailabilitySummary {
  timezone: string | null;
  totalSlots: number;
  activeSlots: number;
  availableToday: boolean;
  todaySlots: number;
  todayBooked: number;
  utilizationPercent: number;
  bookedOccurrences: number;
  totalOccurrences: number;
}

export interface MentorPerformance {
  breakdown: MentorSessionBreakdown;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  activeStudents: number;
  recentSessions: MentorSessionRecord[];
}

export interface MentorDetail {
  userId: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  country: string | null;
  city: string | null;
  headline: string | null;
  bio: string | null;
  teachingStyle: string | null;
  languagesTaught: string[];
  certifications: string[];
  education: string | null;
  educationJson: unknown;
  experience: unknown;
  yearsExperience: number | null;
  hourlyRate: number | null;
  timezone: string | null;
  availabilityPreview: string | null;
  introVideoUrl: string | null;
  demoLessonUrl: string | null;
  coverUrl: string | null;
  specializations: unknown;
  achievements: unknown;
  verificationBadges: unknown;
  galleryImages: unknown;
  portfolioImages: unknown;
  isVerified: boolean;
  isActive: boolean;
  dbStatus: MentorStatus | null;
  accountActive: boolean | null;
  joinedDate: string | null;
  responseRate: number | null;
  completionRate: number | null;
  ratingAvg: number;
  totalReviews: number;
  totalStudents: number;
  totalSessions: number;
  createdAt: string | null;
  updatedAt: string | null;
  roleGranted: boolean;
  accountStatus: AdminStatus;
  verificationStatus: VerificationStatus;
  health: MentorHealth;
  healthReasons: string[];
  profileCompleteness: number;
  profileFields: ProfileField[];
  missingProfileFields: string[];
  availability: MentorAvailabilitySummary;
  availabilitySlots: MentorAvailabilitySlot[];
  performance: MentorPerformance;
  reviews: { recent: MentorReview[]; totalReviews: number; avgRating: number };
  students: { active: MentorStudentRecord[]; recent: MentorStudentRecord[]; totalActive: number };
  application: MentorApplicationLink | null;
  activity: MentorActivityEvent[];
  degradedSections?: string[];
}

export function formatRating(value: number | null | undefined): string {
  const v = value ?? 0;
  return v.toFixed(1);
}

export function formatPercent(value: number | null | undefined): string {
  return `${Math.round(value ?? 0)}%`;
}

export interface MentorStats {
  totalMentors: number;
  activeMentors: number;
  pendingMentors: number;
  availableToday: number;
  needsAttention: number;
  inactiveMentors: number;
  pendingApplications: number;
  verifiedMentors: number;
}
