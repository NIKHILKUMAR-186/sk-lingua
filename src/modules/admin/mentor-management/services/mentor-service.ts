import { supabase } from "@/integrations/supabase/client";
import {
  computeProfileCompleteness,
  computeHealth,
  toAdminStatus,
  toVerificationStatus,
  todayDayName,
  type Mentor,
  type MentorDetail,
  type MentorStats,
  type MentorStatus,
  type MentorSessionBreakdown,
  type MentorAvailabilitySlot,
  type MentorSessionRecord,
  type MentorReview,
  type MentorStudentRecord,
  type MentorActivityEvent,
  type MentorApplicationLink,
  type ProfileRow,
  type MentorProfileRow,
  type SlotRow,
  type ReviewRow,
} from "@/lib/mentor-domain";

export type MentorFilter =
  | "all"
  | "active"
  | "inactive"
  | "pending"
  | "verified"
  | "unverified"
  | "needs_attention"
  | "available_today"
  | "no_availability"
  | "incomplete_profile";

export type MentorSort =
  | "recently_joined"
  | "recently_active"
  | "highest_rated"
  | "most_sessions"
  | "most_experienced"
  | "best_availability"
  | "profile_completeness"
  | "needs_attention";

export interface ListMentorsParams {
  search?: string;
  filter?: MentorFilter;
  sort?: MentorSort;
  limit?: number;
  offset?: number;
}

export interface MentorListResponse {
  mentors: Mentor[];
  stats: MentorStats;
  total: number;
  limit: number;
  offset: number;
  degradedSections?: string[];
}

export interface SetMentorStatusInput {
  mentorId: string;
  isActive?: boolean | null;
  status?: "pending" | "approved" | "rejected" | "suspended" | null;
  isVerified?: boolean | null;
  adminNotes?: string;
}

export interface DegradedSection {
  section: string;
  error: string;
}

export const PAGE_SIZE = 24;

const sup = supabase as any;

// ---------------------------------------------------------------------------
// Auth token + audited mutation transport (service-role write via /api route)
// ---------------------------------------------------------------------------

async function getSessionToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let token = session?.access_token;
  const expired =
    token && typeof session?.expires_at === "number"
      ? Math.floor(Date.now() / 1000) >= session.expires_at
      : false;
  if (!token || expired) {
    const {
      data: { session: refreshed },
    } = await supabase.auth.refreshSession();
    token = refreshed?.access_token;
  }
  return token ?? null;
}

function toApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${typeof window !== "undefined" ? window.location.origin : ""}${path}`;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Authenticated fetch used for the audited, service-role writes that the RLS
 * policies intentionally restrict to the admin (e.g. mentor_profiles updates:
 * only the owner row can write via the client). Those writes go through the
 * `/api/admin/mentors/*` server route which uses supabaseAdmin, so they need the
 * caller's JWT forwarded for `requireAdminAuth`.
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init?.headers as Record<string, string>) || {}),
  };

  const res = await fetch(toApiUrl(path), { ...init, headers });
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    let preview = "non-JSON response";
    try {
      preview = (await res.text()).slice(0, 200).replace(/\s+/g, " ").trim() || preview;
    } catch {
      /* ignore body read errors */
    }
    throw new Error(
      `API error ${res.status}: ${path} returned ${preview}. The endpoint is not served by the dev runner (routeFileIgnorePattern excludes *.server.ts).`,
    );
  }

  const json: ApiEnvelope<T> = await res.json();
  if (res.status === 401) {
    throw new Error(json?.error || "Authentication required. Please sign in again.");
  }
  if (res.status === 403) {
    throw new Error(json?.error || "Forbidden: admin access is required.");
  }
  if (res.status === 404) {
    throw new Error(
      json?.error ||
        `Endpoint not found: ${path} (not served on this server — restart the dev server or verify the build).`,
    );
  }
  if (!res.ok || !json.success) {
    throw new Error(json?.error || `Unable to load the requested resource (${res.status}).`);
  }
  return json.data as T;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function safeNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

function safeArr<T = string>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  return [];
}

function emptySessionBreakdown(): MentorSessionBreakdown {
  return { total: 0, completed: 0, cancelled: 0, noShow: 0, confirmed: 0, other: 0 };
}

/**
 * Best-effort read for tables whose admin SELECT policy depends on the
 * `has_role()` helper (currently missing from the live DB — schema drift). It
 * never throws so the UI can degrade a single section instead of crashing the
 * whole page.
 */
async function adminRead<T = any>(
  table: string,
  select: string,
  eq?: { column: string; value: string },
): Promise<{ data: T[]; error: string | null }> {
  try {
    let query = sup.from(table).select(select);
    if (eq) query = query.eq(eq.column, eq.value);
    const { data, error } = await query;
    if (error) return { data: [], error: error.message };
    return { data: (data || []) as T[], error: null };
  } catch (e: any) {
    return { data: [], error: e?.message ?? String(e) };
  }
}

// ---------------------------------------------------------------------------
// Typed mappers (mirror src/routes/api/admin/mentors/*.ts)
// ---------------------------------------------------------------------------

function buildSessionBreakdown(
  sessions: { status: string }[],
  fallbackTotal: number,
): MentorSessionBreakdown {
  const breakdown = emptySessionBreakdown();
  if (sessions.length > 0) {
    breakdown.total = sessions.length;
    for (const s of sessions) {
      const st = (s.status || "").toLowerCase();
      if (st === "completed") breakdown.completed++;
      else if (st === "cancelled" || st === "rejected") breakdown.cancelled++;
      else if (st === "no_show") breakdown.noShow++;
      else if (st === "confirmed") breakdown.confirmed++;
      else breakdown.other++;
    }
    return breakdown;
  }
  // Fallback: the sessions table couldn't be read (has_role missing). Use the
  // precomputed total on mentor_profiles, treating the volume as completed.
  breakdown.total = fallbackTotal;
  breakdown.completed = fallbackTotal;
  return breakdown;
}

function buildMentor(
  profile: ProfileRow,
  mp: MentorProfileRow,
  slots: SlotRow[],
  today: string,
): Mentor {
  const dbStatus = (mp.status as MentorStatus | null) ?? null;
  const adminStatus = toAdminStatus(mp.is_active, dbStatus);
  const completion = computeProfileCompleteness({
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    cover_url: mp.cover_url,
    headline: mp.headline,
    bio: mp.bio,
    languages_taught: mp.languages_taught,
    years_experience: mp.years_experience,
    teaching_style: mp.teaching_style,
    certifications: mp.certifications,
    education: mp.education,
    intro_video_url: mp.intro_video_url,
    timezone: mp.timezone,
    availability: mp.availability_preview,
  });

  const activeSlotCount = slots.filter((s) => s.is_available !== false).length;
  const hasAvailabilityToday = slots.some(
    (s) => s.day_of_week === today && s.is_available !== false,
  );

  const totalSessions = Number(mp.total_sessions ?? 0);
  const sessionData = buildSessionBreakdown([], totalSessions);

  const health = computeHealth({
    isActive: mp.is_active,
    dbStatus,
    isVerified: mp.is_verified,
    profileCompleteness: completion.percent,
    activeSlotCount,
    hasAvailabilityToday,
    sessions: sessionData,
    ratingAvg: Number(mp.rating_avg ?? 0),
    totalReviews: Number(mp.total_reviews ?? 0),
  });

  const cancellationRate =
    sessionData.total > 0 ? Math.round((sessionData.cancelled / sessionData.total) * 100) : 0;

  return {
    userId: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    headline: mp.headline,
    bio: mp.bio,
    languagesTaught: mp.languages_taught || [],
    yearsExperience: mp.years_experience,
    ratingAvg: Number(mp.rating_avg ?? 0),
    totalReviews: Number(mp.total_reviews ?? 0),
    totalStudents: Number(mp.total_students ?? 0),
    totalSessions,
    isVerified: mp.is_verified === true,
    isActive: mp.is_active === true,
    dbStatus,
    timezone: mp.timezone,
    joinedDate: mp.joined_date ?? profile.created_at,
    availabilityPreview: mp.availability_preview,
    introVideoUrl: mp.intro_video_url,
    demoLessonUrl: mp.demo_lesson_url,
    coverUrl: mp.cover_url,
    headlineField: mp.headline,
    lastActive: mp.updated_at ?? profile.updated_at ?? null,
    responseRate: mp.response_rate ?? null,
    completionRate: mp.completion_rate ?? null,
    accountStatus: adminStatus,
    verificationStatus: toVerificationStatus(mp.is_verified),
    health: health.health,
    healthReasons: health.reasons,
    profileCompleteness: completion.percent,
    profileFields: completion.fields,
    availableToday: hasAvailabilityToday,
    activeSlotCount,
    sessions: sessionData,
    cancellationRate,
    noShowRate: 0,
    hasApplication: false,
    applicationStatus: null,
  };
}

function matchesSearch(m: Mentor, search: string): boolean {
  const inName = (m.fullName || "").toLowerCase().includes(search);
  const inEmail = (m.email || "").toLowerCase().includes(search);
  const inLang = (m.languagesTaught || []).some((l) => l.toLowerCase().includes(search));
  return inName || inEmail || inLang;
}

function matchesFilter(m: Mentor, filter: MentorFilter): boolean {
  switch (filter) {
    case "active":
      return m.accountStatus === "approved" && m.isActive;
    case "inactive":
      return m.accountStatus === "inactive" || m.accountStatus === "suspended";
    case "pending":
      return m.accountStatus === "pending";
    case "verified":
      return m.isVerified;
    case "unverified":
      return !m.isVerified;
    case "needs_attention":
      return m.health === "needs_attention" || m.health === "incomplete" || m.health === "inactive";
    case "available_today":
      return m.availableToday;
    case "no_availability":
      return m.activeSlotCount === 0;
    case "incomplete_profile":
      return m.profileCompleteness < 50;
    default:
      return true;
  }
}

function compareMentor(a: Mentor, b: Mentor, sort: MentorSort): number {
  switch (sort) {
    case "recently_joined":
      return (b.joinedDate || "").localeCompare(a.joinedDate || "");
    case "recently_active":
      return (b.lastActive || "").localeCompare(a.lastActive || "");
    case "highest_rated":
      return (b.ratingAvg || 0) - (a.ratingAvg || 0);
    case "most_sessions":
      return (b.totalSessions || 0) - (a.totalSessions || 0);
    case "most_experienced":
      return (b.yearsExperience || 0) - (a.yearsExperience || 0);
    case "best_availability": {
      const score = (m: Mentor) => (m.availableToday ? 1 : 0) * 1000 + (m.activeSlotCount || 0);
      return score(b) - score(a);
    }
    case "profile_completeness":
      return (b.profileCompleteness || 0) - (a.profileCompleteness || 0);
    case "needs_attention": {
      const score = (m: Mentor) =>
        m.health === "incomplete"
          ? 3
          : m.health === "needs_attention"
            ? 2
            : m.health === "inactive"
              ? 1
              : 0;
      return score(b) - score(a);
    }
    default:
      return 0;
  }
}

function computeStats(
  rows: Mentor[],
  slots: SlotRow[],
  apps: { statusMap: Map<string, string>; error: string | null },
): MentorStats & { degraded: DegradedSection[] } {
  let activeMentors = 0;
  let pendingMentors = 0;
  let inactiveMentors = 0;
  let needsAttention = 0;
  let verifiedMentors = 0;

  const today = todayDayName();
  const availableTodaySet = new Set<string>();
  for (const s of slots) {
    if (s.day_of_week === today && s.is_available !== false) availableTodaySet.add(s.mentor_id);
  }

  for (const r of rows) {
    if (r.isActive && r.accountStatus === "approved") activeMentors++;
    if (r.accountStatus === "pending") pendingMentors++;
    if (r.accountStatus === "inactive" || r.accountStatus === "suspended") inactiveMentors++;
    if (r.health === "needs_attention" || r.health === "incomplete" || r.health === "inactive")
      needsAttention++;
    if (r.isVerified) verifiedMentors++;
  }

  const pendingApplications = apps.error
    ? 0
    : [...apps.statusMap.values()].filter((v) => v !== "approved").length;

  return {
    totalMentors: rows.length,
    activeMentors,
    pendingMentors,
    availableToday: availableTodaySet.size,
    needsAttention,
    inactiveMentors,
    pendingApplications,
    verifiedMentors,
    degraded: apps.error ? [{ section: "mentor_applications", error: apps.error }] : [],
  };
}

// ---------------------------------------------------------------------------
// Client reads
// ---------------------------------------------------------------------------

async function readMentorProfiles(): Promise<MentorProfileRow[]> {
  const { data, error } = await sup.from("mentor_profiles").select(MP_SELECT);
  if (error) throw error;
  return (data || []) as MentorProfileRow[];
}

async function readProfiles(ids: string[], cols = PROFILE_SELECT): Promise<ProfileRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await sup.from("profiles").select(cols).in("id", ids);
  if (error) throw error;
  return (data || []) as ProfileRow[];
}

async function readSlots(ids: string[]): Promise<SlotRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await sup
    .from("availability_slots")
    .select(SLOT_SELECT)
    .in("mentor_id", ids);
  if (error) throw error;
  return (data || []) as SlotRow[];
}

interface AuditLogRaw {
  id: string;
  actor_id: string | null;
  target_id: string | null;
  action: string | null;
  detail: string | null;
  created_at: string | null;
}

interface RoleRow {
  role: string;
  granted_at: string | null;
  granted_by: string | null;
}

async function resolveStudentNames(studentIds: string[]): Promise<Map<string, string | null>> {
  if (studentIds.length === 0) return new Map();
  const profiles = await readProfiles(studentIds, "id, full_name");
  return new Map(profiles.map((p) => [p.id, (p.full_name || null) as string | null]));
}

async function resolveActorNames(actorIds: string[]): Promise<Map<string, string | null>> {
  const ids = actorIds.filter((v) => v && v !== "null");
  if (ids.length === 0) return new Map();
  const profiles = await readProfiles(ids, "id, full_name");
  return new Map(profiles.map((p) => [p.id, (p.full_name || null) as string | null]));
}

async function readMentorApplications(ids: string[]): Promise<{
  statusMap: Map<string, string>;
  error: string | null;
}> {
  // has_role() dependency — best-effort.
  const { data, error } = await adminRead<ApplicationRow>("mentor_applications", "user_id, status");
  const statusMap = new Map<string, string>();
  if (!error) {
    for (const a of data) {
      if (a.user_id) statusMap.set(String(a.user_id), a.status);
    }
  }
  return { statusMap, error };
}

const MP_SELECT = [
  "user_id",
  "is_active",
  "is_verified",
  "status",
  "rating_avg",
  "total_reviews",
  "total_students",
  "total_sessions",
  "response_rate",
  "completion_rate",
  "years_experience",
  "joined_date",
  "updated_at",
  "created_at",
  "headline",
  "bio",
  "languages_taught",
  "teaching_style",
  "certifications",
  "education",
  "intro_video_url",
  "demo_lesson_url",
  "cover_url",
  "availability_preview",
].join(", ");

const PROFILE_SELECT =
  "id, full_name, email, avatar_url, country, city, state, created_at, updated_at";

const SLOT_SELECT =
  "id, mentor_id, day_of_week, start_time, end_time, timezone, is_available, label";

function mapSlot(row: SlotRow): MentorAvailabilitySlot {
  return {
    id: String(row.id),
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone ?? null,
    isAvailable: row.is_available !== false,
    label: row.label ?? null,
  };
}

function mapSession(row: {
  id: string;
  student_id: string | null;
  status: string;
  scheduled_time: string;
  duration_mins: number | null;
  session_started_at: string | null;
  session_ended_at: string | null;
  studentName: string | null;
}): MentorSessionRecord {
  return {
    id: String(row.id),
    scheduledTime: row.scheduled_time,
    status: (row.status || "unknown") as MentorSessionRecord["status"],
    durationMins: row.duration_mins ?? 0,
    studentName: row.studentName ?? null,
    studentId: row.student_id ?? null,
    startedAt: row.session_started_at ?? null,
    endedAt: row.session_ended_at ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

interface MentorAppsResult {
  statusMap: Map<string, string>;
  error: string | null;
}

async function loadAllMentors(): Promise<{
  rows: Mentor[];
  slots: SlotRow[];
  apps: MentorAppsResult;
  degraded: DegradedSection[];
}> {
  const today = todayDayName();

  const mentorProfiles = await readMentorProfiles();
  const mentorIds = [...new Set(mentorProfiles.map((m) => String(m.user_id)))];
  if (mentorIds.length === 0) {
    return { rows: [], slots: [], apps: { statusMap: new Map(), error: null }, degraded: [] };
  }

  const [profiles, allSlots, apps] = await Promise.all([
    readProfiles(mentorIds),
    readSlots(mentorIds),
    readMentorApplications(mentorIds),
  ]);

  const mpMap = new Map(mentorProfiles.map((m) => [String(m.user_id), m]));
  const slotsByMentor = new Map<string, SlotRow[]>();
  for (const s of allSlots) {
    const arr = slotsByMentor.get(s.mentor_id) || [];
    arr.push(s);
    slotsByMentor.set(s.mentor_id, arr);
  }

  const rows: Mentor[] = [];
  const degraded: DegradedSection[] = [];
  if (apps.error) {
    degraded.push({ section: "mentor_applications", error: apps.error });
  }

  for (const p of profiles) {
    const m = mpMap.get(p.id);
    if (!m) continue;
    const row = buildMentor(p, m, slotsByMentor.get(p.id) || [], today);
    if (apps.statusMap.has(row.userId)) {
      row.hasApplication = true;
      row.applicationStatus = apps.statusMap.get(row.userId) ?? null;
    }
    rows.push(row);
  }

  return { rows, slots: allSlots, apps, degraded };
}

export async function listMentors(params: ListMentorsParams = {}): Promise<MentorListResponse> {
  const { search, filter, sort = "recently_joined", limit = PAGE_SIZE, offset = 0 } = params;

  const { rows, slots, apps, degraded } = await loadAllMentors();

  let filtered = rows;
  if (search) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter((m) => matchesSearch(m, q));
  }
  if (filter && filter !== "all") {
    filtered = filtered.filter((m) => matchesFilter(m, filter));
  }

  const sorted = [...filtered].sort((a, b) => compareMentor(a, b, sort));
  const total = sorted.length;
  const page = sorted.slice(offset, offset + limit);

  const fullStats = computeStats(rows, slots, apps);
  const stats: MentorStats = {
    totalMentors: fullStats.totalMentors,
    activeMentors: fullStats.activeMentors,
    pendingMentors: fullStats.pendingMentors,
    availableToday: fullStats.availableToday,
    needsAttention: fullStats.needsAttention,
    inactiveMentors: fullStats.inactiveMentors,
    pendingApplications: fullStats.pendingApplications,
    verifiedMentors: fullStats.verifiedMentors,
  };

  return {
    mentors: page,
    stats,
    total,
    limit,
    offset,
    degradedSections: degraded.length ? degraded.map((d) => d.section) : undefined,
  };
}

export async function getMentorStats(): Promise<MentorStats & { degraded: DegradedSection[] }> {
  const { rows, slots, apps } = await loadAllMentors();
  return computeStats(rows, slots, apps);
}

export async function getMentorDetail(mentorId: string): Promise<MentorDetail> {
  const degraded: DegradedSection[] = [];
  const today = todayDayName();

  const [profileRes, mpRes, slotsRes, appsRes] = await Promise.all([
    adminRead<ProfileRow>("profiles", PROFILE_SELECT, { column: "id", value: mentorId }),
    adminRead<MentorProfileRow>("mentor_profiles", MP_SELECT, {
      column: "user_id",
      value: mentorId,
    }),
    adminRead<SlotRow>("availability_slots", SLOT_SELECT, {
      column: "mentor_id",
      value: mentorId,
    }),
    adminRead<ApplicationRow>("mentor_applications", "user_id, status", {
      column: "user_id",
      value: mentorId,
    }),
  ]);

  const profile = profileRes.data[0];
  const mp = mpRes.data[0];

  if (profileRes.error) degraded.push({ section: "profiles", error: profileRes.error });
  if (mpRes.error) degraded.push({ section: "mentor_profiles", error: mpRes.error });
  if (slotsRes.error) degraded.push({ section: "availability_slots", error: slotsRes.error });
  if (appsRes.error) degraded.push({ section: "mentor_applications", error: appsRes.error });

  if (!profile || !mp) {
    throw new Error(
      `Mentor not found (user_id=${mentorId}).` +
        (profileRes.error ? ` profiles: ${profileRes.error}` : "") +
        (mpRes.error ? ` mentor_profiles: ${mpRes.error}` : ""),
    );
  }

  const slots = (slotsRes.data || []).map(mapSlot);

  // Reviews (SELECT policy = true) — readable client-side.
  const reviewsRes = await adminRead<ReviewRow>(
    "reviews",
    "id, student_id, mentor_id, rating, review_text, created_at",
    { column: "mentor_id", value: mentorId },
  );
  let reviews: MentorReview[] = [];
  if (!reviewsRes.error) {
    const studentIds = [...new Set(reviewsRes.data.map((r) => String(r.student_id)))];
    const studentProfiles = studentIds.length
      ? await readProfiles(studentIds, "id, full_name")
      : [];
    const studentName = new Map(studentProfiles.map((p) => [p.id, p.full_name || "Student"]));
    reviews = [...reviewsRes.data]
      .sort(
        (a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime(),
      )
      .slice(0, 10)
      .map((r) => ({
        id: String(r.id),
        studentName: studentName.get(String(r.student_id)) || "Student",
        rating: Number(r.rating ?? 0),
        reviewText: r.review_text || null,
        createdAt: r.created_at || "",
      }));
  } else {
    degraded.push({ section: "reviews", error: reviewsRes.error });
  }

  const totalReviews = Number(mp.total_reviews ?? 0);
  const avgRating = Number(mp.rating_avg ?? 0);

  // Sessions — has_role dependency, best-effort.
  const sessionsRes = await adminRead<{
    id: string;
    student_id: string | null;
    status: string;
    scheduled_time: string;
    duration_mins: number | null;
    session_started_at: string | null;
    session_ended_at: string | null;
  }>(
    "sessions",
    "id, student_id, status, scheduled_time, completed_at, duration_mins, session_started_at, session_ended_at",
    {
      column: "mentor_id",
      value: mentorId,
    },
  );
  let sessions: MentorSessionRecord[] = [];
  if (sessionsRes.error) {
    degraded.push({ section: "sessions", error: sessionsRes.error });
  } else {
    const studentIds = [...new Set(sessionsRes.data.map((s) => String(s.student_id)))];
    const studentNameMap = await resolveStudentNames(studentIds);
    sessions = [...sessionsRes.data]
      .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime())
      .slice(0, 10)
      .map((s) =>
        mapSession({
          id: String(s.id),
          student_id: s.student_id,
          status: s.status,
          scheduled_time: s.scheduled_time,
          duration_mins: s.duration_mins,
          session_started_at: s.session_started_at,
          session_ended_at: s.session_ended_at,
          studentName: studentNameMap.get(String(s.student_id)) || null,
        }),
      );
  }
  const sessionBreakdown = buildSessionBreakdown(sessionsRes.data, Number(mp.total_sessions ?? 0));
  const cancellationRate =
    sessionBreakdown.total > 0
      ? Math.round((sessionBreakdown.cancelled / sessionBreakdown.total) * 100)
      : 0;
  const completionRate =
    sessionBreakdown.total > 0
      ? Math.round((sessionBreakdown.completed / sessionBreakdown.total) * 100)
      : 0;

  // Students (active/recent) — derived from sessions; degrade to empty.
  const students = {
    active: [] as MentorStudentRecord[],
    recent: [] as MentorStudentRecord[],
    totalActive: 0,
  };
  if (!sessionsRes.error && sessionsRes.data.length > 0) {
    const studentIds = [...new Set(sessionsRes.data.map((s) => String(s.student_id)))];
    const profilesById = await readProfiles(studentIds, "id, full_name, avatar_url, updated_at");
    const byId = (id: string) => profilesById.find((p) => p.id === id);
    const counts = new Map<string, number>();
    const lastSeen = new Map<string, string>();
    for (const s of sessionsRes.data) {
      const sid = String(s.student_id);
      counts.set(sid, (counts.get(sid) || 0) + 1);
      const t = s.session_ended_at || s.session_started_at || s.scheduled_time;
      if (t && (!lastSeen.has(sid) || t > (lastSeen.get(sid) || ""))) lastSeen.set(sid, t);
    }
    const rec: MentorStudentRecord[] = [...counts.entries()]
      .map(([sid, cnt]) => {
        const p = byId(sid);
        return {
          id: sid,
          fullName: p?.full_name || "Student",
          avatarUrl: p?.avatar_url || null,
          lastSessionAt: lastSeen.get(sid) || null,
          sessionCount: cnt,
        };
      })
      .sort((a, b) => (b.lastSessionAt || "").localeCompare(a.lastSessionAt || ""));
    students.recent = rec.slice(0, 10);
    students.active = rec.filter((r) => r.sessionCount > 0).slice(0, 15);
    students.totalActive = students.active.length;
  } else if (sessionsRes.error) {
    degraded.push({ section: "students", error: sessionsRes.error });
  }

  // Availability occurrences (utilization) — actual schema: is_booked, start_ts, end_ts, duration_mins.
  const occRes = await adminRead<{
    is_booked: boolean;
    start_ts: string;
    end_ts: string;
    duration_mins: number;
  }>("availability_occurrences", "is_booked, start_ts, end_ts, duration_mins", {
    column: "mentor_id",
    value: mentorId,
  });
  const occurrences = { booked: 0, total: 0, utilization: 0 };
  if (!occRes.error && occRes.data.length > 0) {
    const rows = occRes.data;
    occurrences.total = rows.length;
    occurrences.booked = rows.filter((r) => r.is_booked).length;
    occurrences.utilization =
      occurrences.total > 0 ? Math.round((occurrences.booked / occurrences.total) * 100) : 0;
  } else if (occRes.error) {
    degraded.push({ section: "availability_occurrences", error: occRes.error });
  }

  // Audit / role history (has_role dependency, degrade).
  const auditRes = await adminRead<AuditLogRaw>(
    "audit_logs",
    "id, actor_id, target_id, action, detail, created_at",
    { column: "target_id", value: mentorId },
  );
  let activity: MentorActivityEvent[] = [];
  if (auditRes.error) {
    degraded.push({ section: "audit_logs", error: auditRes.error });
  } else {
    const actorName = await resolveActorNames(auditRes.data.map((a) => String(a.actor_id)));
    activity = auditRes.data
      .sort(
        (a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime(),
      )
      .slice(0, 25)
      .map((a) => ({
        id: String(a.id),
        event: a.action || "unknown",
        detail: a.detail || null,
        actorName: actorName.get(String(a.actor_id)) || null,
        createdAt: a.created_at || "",
      }));
  }

  const rolesRes = await adminRead<RoleRow>("user_roles", "role, granted_at, granted_by", {
    column: "user_id",
    value: mentorId,
  });
  let roleGranted = false;
  if (rolesRes.error) {
    degraded.push({ section: "user_roles", error: rolesRes.error });
  } else {
    roleGranted = rolesRes.data.some((r) => r.role === "mentor");
  }

  const totalSlots = slots.length;
  const activeSlots = slots.filter((s) => s.isAvailable).length;
  const todaySlots = slots.filter((s) => s.dayOfWeek === today).length;
  const todayBooked = slots.filter((s) => s.dayOfWeek === today && s.isAvailable).length;
  const utilizationPercent = occurrences.total > 0 ? occurrences.utilization : 0;

  const completion = computeProfileCompleteness({
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    cover_url: mp.cover_url,
    headline: mp.headline,
    bio: mp.bio,
    languages_taught: mp.languages_taught,
    years_experience: mp.years_experience,
    teaching_style: mp.teaching_style,
    certifications: mp.certifications,
    education: mp.education,
    intro_video_url: mp.intro_video_url,
    timezone: mp.timezone,
    availability: mp.availability_preview,
  });

  const application: MentorApplicationLink | null =
    appsRes.error || !appsRes.data[0]
      ? null
      : {
          id: String(appsRes.data[0].user_id ?? profile.id),
          status: appsRes.data[0].status ?? "pending",
          createdAt: mp.created_at ?? profile.created_at ?? "",
          approvedAt: null,
        };

  const dbStatus = (mp.status as MentorStatus | null) ?? null;

  const { health: computedHealth, reasons: computedReasons } = computeHealth({
    isActive: mp.is_active,
    dbStatus,
    isVerified: mp.is_verified,
    profileCompleteness: completion.percent,
    activeSlotCount: activeSlots,
    hasAvailabilityToday: todaySlots > 0,
    sessions: sessionBreakdown,
    ratingAvg: Number(mp.rating_avg ?? 0),
    totalReviews: Number(mp.total_reviews ?? 0),
  });

  const mentor: MentorDetail = {
    userId: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    country: profile.country ?? null,
    city: profile.city ?? null,
    headline: mp.headline,
    bio: mp.bio,
    teachingStyle: mp.teaching_style,
    languagesTaught: mp.languages_taught || [],
    certifications: mp.certifications ?? [],
    education: mp.education,
    educationJson: mp.education_json,
    experience: mp.experience,
    yearsExperience: mp.years_experience,
    hourlyRate: mp.hourly_rate,
    timezone: mp.timezone,
    availabilityPreview: mp.availability_preview,
    introVideoUrl: mp.intro_video_url,
    demoLessonUrl: mp.demo_lesson_url,
    coverUrl: mp.cover_url,
    specializations: mp.specializations,
    achievements: mp.achievements,
    verificationBadges: mp.verification_badges,
    galleryImages: mp.gallery_images,
    portfolioImages: mp.portfolio_images,
    isVerified: mp.is_verified === true,
    isActive: mp.is_active === true,
    dbStatus,
    accountActive: mp.account_active,
    accountStatus: toAdminStatus(mp.is_active, dbStatus),
    verificationStatus: toVerificationStatus(mp.is_verified),
    joinedDate: mp.joined_date ?? profile.created_at,
    responseRate: mp.response_rate ?? null,
    completionRate: mp.completion_rate ?? null,
    ratingAvg: Number(mp.rating_avg ?? 0),
    totalReviews: Number(mp.total_reviews ?? 0),
    totalStudents: Number(mp.total_students ?? 0),
    totalSessions: Number(mp.total_sessions ?? 0),
    createdAt: mp.created_at ?? profile.created_at ?? null,
    updatedAt: mp.updated_at ?? profile.updated_at ?? null,
    roleGranted,
    health: computedHealth,
    healthReasons: computedReasons,
    profileCompleteness: completion.percent,
    profileFields: completion.fields,
    missingProfileFields: completion.missing,

    availability: {
      timezone: mp.timezone ?? null,
      totalSlots,
      activeSlots,
      availableToday: todaySlots > 0,
      todaySlots,
      todayBooked,
      totalOccurrences: occurrences.total,
      bookedOccurrences: occurrences.booked,
      utilizationPercent,
    },
    availabilitySlots: slots,

    reviews: {
      recent: reviews,
      totalReviews,
      avgRating,
    },
    performance: {
      breakdown: sessionBreakdown,
      completionRate,
      cancellationRate,
      noShowRate:
        sessionBreakdown.total > 0
          ? Math.round((sessionBreakdown.noShow / sessionBreakdown.total) * 100)
          : 0,
      activeStudents: students.totalActive,
      recentSessions: sessions,
    },
    students,
    activity,
    application,
    degradedSections: degraded.map((d) => d.section),
  };

  return mentor;
}

// ---------------------------------------------------------------------------
// Audited writes (service-role via /api server route)
// ---------------------------------------------------------------------------

export async function setMentorStatus(input: SetMentorStatusInput): Promise<unknown> {
  return apiFetch(`/api/admin/mentors/set-status`, {
    method: "POST",
    body: JSON.stringify({
      mentorId: input.mentorId,
      isActive: input.isActive ?? null,
      status: input.status ?? null,
      isVerified: input.isVerified ?? null,
      adminNotes: input.adminNotes || "",
    }),
  });
}

export async function setMentorVerification(
  mentorId: string,
  isVerified: boolean,
  adminNotes?: string,
): Promise<unknown> {
  return apiFetch(`/api/admin/mentors/set-status`, {
    method: "POST",
    body: JSON.stringify({
      mentorId,
      isVerified,
      status: isVerified ? "approved" : ("pending" as MentorStatus | null),
      adminNotes: adminNotes || "",
    }),
  });
}

export async function updateMentorProfile(
  mentorId: string,
  updates: Record<string, unknown>,
): Promise<unknown> {
  return apiFetch(`/api/admin/mentors/${mentorId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

interface ApplicationRow {
  user_id?: string;
  status: string;
}
