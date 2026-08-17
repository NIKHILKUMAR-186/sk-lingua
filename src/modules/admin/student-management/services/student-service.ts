import { supabase } from "@/integrations/supabase/client";
import { toApiUrl } from "./url";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// ------------------------------------------------------------------
// Types (mirror the admin students backend response shapes)
// ------------------------------------------------------------------

export interface StudentSubscriptionLite {
  id: string;
  plan_id: string;
  plan_name: string | null;
  plan_price: number | null;
  plan_currency: string | null;
  status: string;
  total_session_slots: number;
  used_session_slots: number;
  current_session_slots: number;
  bonus_slots: number;
  expires_at: string | null;
  activated_at: string | null;
  purchased_at: string | null;
  price_at_purchase: number | null;
  currency_at_purchase: string | null;
  validity_days_at_purchase: number | null;
  is_current_active: boolean;
}

export interface StudentRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  created_at: string | null;
  updated_at: string | null;
  onboarded: boolean;
  reference_no: number | null;
  current_level: string | null;
  learning_goal: string | null;
  last_activity: string | null;
  subscription: StudentSubscriptionLite | null;
}

export interface StudentStats {
  totalStudents: number;
  activeAccounts: number;
  withActiveSubscription: number;
  expiringSoon: number;
  totalSessionsUsed: number;
  activeStudents?: number;
}

export interface StudentListResponse {
  students: StudentRow[];
  stats: StudentStats;
  total: number;
  page?: number;
  pageSize?: number;
}

export type StudentFilter =
  | "all"
  | "active_subscription"
  | "no_subscription"
  | "expired_subscription"
  | "active_account"
  | "suspended_account";

export type StudentSort =
  | "recently_joined"
  | "recently_active"
  | "least_active"
  | "oldest"
  | "most_sessions"
  | "least_sessions"
  | "expiring_soon"
  | "low_balance"
  | "name";

export interface StudentDetailData {
  student: {
    id: string;
    full_name: string | null;
    email: string | null;
    reference_no: number | null;
    avatar_url: string | null;
    country: string | null;
    state: string | null;
    city: string | null;
    bio: string | null;
    onboarded: boolean | null;
    phone_number: string | null;
    native_language: string | null;
    target_language: string | null;
    current_level: string | null;
    learning_goal: string | null;
    learning_level: string | null;
    learning_goals: string | null;
    interests: string | null;
    timezone: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  subscription: StudentSubscriptionLite | null;
  history: any[];
  adjustments: any[];
  payments: any[];
  sessions: any[];
}

const PAGE_SIZE = 24;

// ------------------------------------------------------------------
// HTTP helper (server-side admin endpoints require the auth token)
// ------------------------------------------------------------------

async function getSessionToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let token = session?.access_token;
  if (!token) {
    const {
      data: { session: refreshed },
    } = await supabase.auth.refreshSession();
    token = refreshed?.access_token;
  }
  return token ?? null;
}

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
      preview = (await res.text()).slice(0, 120).replace(/\s+/g, " ").trim() || preview;
    } catch {
      /* ignore */
    }
    throw new Error(`API error ${res.status}: ${path} returned ${preview}`);
  }
  const json: ApiResponse<T> = await res.json();
  if (res.status === 401) {
    throw new Error("Authentication required. Please sign in again.");
  }
  if (res.status === 403) {
    throw new Error(json?.error || "Forbidden: admin access is required.");
  }
  if (res.status === 404) {
    throw new Error(json?.error || "Resource not found. Please try again.");
  }
  if (!res.ok || !json.success) {
    throw new Error(json?.error || `Unable to load the requested resource (${res.status}).`);
  }
  return json.data as T;
}

// ------------------------------------------------------------------
// Service functions
// ------------------------------------------------------------------

export interface ListStudentsParams {
  search?: string;
  filter?: StudentFilter;
  sort?: StudentSort;
  limit?: number;
  offset?: number;
}

const NO_STATS: StudentStats = {
  totalStudents: 0,
  activeAccounts: 0,
  withActiveSubscription: 0,
  expiringSoon: 0,
  totalSessionsUsed: 0,
};

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function isUsableCurrent(sub: any): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (sub.expires_at && new Date(sub.expires_at).getTime() <= Date.now()) return false;
  return true;
}

/** Safely extract a readable message from a Supabase/PostgREST error object. */
export function normalizeError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const msg =
      (typeof o.message === "string" && o.message) ||
      (typeof o.error === "string" && o.error) ||
      (typeof o.details === "string" && o.details) ||
      (typeof o.hint === "string" && o.hint) ||
      fallback;
    return new Error(msg);
  }
  return new Error(fallback);
}

/**
 * Best-effort read that never throws, so one optional table can degrade
 * without failing the whole admin student query.
 */
async function rlsRead<T = any>(
  table: string,
  select: string,
  cfg?: {
    eq?: { column: string; value: string };
    in?: { column: string; values: string[] };
  },
): Promise<{ data: T[]; error: string | null }> {
  try {
    let q: any = supabase.from(table).select(select);
    if (cfg?.eq) q = q.eq(cfg.eq.column, cfg.eq.value);
    if (cfg?.in && cfg.in.values.length > 0) q = q.in(cfg.in.column, cfg.in.values);
    const { data, error } = await q;
    if (error) return { data: [], error: String(error.message || error) };
    return { data: (data || []) as T[], error: null };
  } catch (e: unknown) {
    return { data: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export async function listStudents(params?: ListStudentsParams): Promise<StudentListResponse> {
  const hits = await fetchStudentIds();
  if (hits.length === 0) {
    return { students: [], stats: await computeStatsFromIds([]), total: 0 };
  }

  // 1. Profiles with server-side (PostgREST) name/email search.
  let pQuery: any = supabase
    .from("profiles")
    .select(
      "id, full_name, email, avatar_url, country, state, city, created_at, updated_at, onboarded, reference_no, current_level, learning_goal",
    )
    .in("id", hits);
  const search = (params?.search || "").trim();
  if (search) {
    pQuery = pQuery.or(
      `full_name.ilike.%${escapeLike(search)}%,email.ilike.%${escapeLike(search)}%`,
    );
  }
  const { data: profiles, error: profilesError } = await pQuery;
  if (profilesError) {
    throw normalizeError(profilesError, "Unable to load students");
  }
  const ids = (profiles || []).map((p: any) => p.id);

  // 2. Batched subscriptions (no N+1).
  const subs: any[] = [];
  if (ids.length > 0) {
    const { data } = await rlsRead<any>(
      "student_subscriptions",
      "*, plan:subscription_plans(id, name, price, currency, num_sessions, validity_days)",
      { in: { column: "user_id", values: ids } },
    );
    subs.push(...(data || []));
  }
  const subsByUser = new Map<string, any>();
  for (const s of subs) if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, s);

  // 3. Batched last-activity (latest session timestamp per student).
  const lastActivity = new Map<string, string>();
  if (ids.length > 0) {
    const { data: sessRows } = await rlsRead<any>(
      "sessions",
      "student_id, updated_at, created_at",
      { in: { column: "student_id", values: ids } },
    );
    for (const s of sessRows || []) {
      const ts = (s.updated_at || s.created_at) as string;
      const prev = lastActivity.get(s.student_id);
      if (!prev || ts > prev) lastActivity.set(s.student_id, ts);
    }
  }

  // 4. Build rows; a student renders even when subscription/mentor is missing.
  const rows: StudentRow[] = (profiles || []).map((p: any) => {
    const latest = subsByUser.get(p.id);
    const active = subs.filter((s: any) => s.user_id === p.id).find(isUsableCurrent) || null;
    const current = active || latest || null;
    const plan = current?.plan || null;
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      avatar_url: p.avatar_url,
      country: p.country,
      state: p.state,
      city: p.city,
      created_at: p.created_at,
      updated_at: p.updated_at,
      onboarded: p.onboarded !== false,
      reference_no: p.reference_no,
      current_level: p.current_level,
      learning_goal: p.learning_goal,
      last_activity: lastActivity.get(p.id) || p.updated_at || null,
      subscription: current
        ? {
            id: current.id,
            plan_id: current.plan_id,
            plan_name: plan?.name || null,
            plan_price: plan?.price ?? null,
            plan_currency: plan?.currency || "INR",
            status: current.status,
            total_session_slots: Number(current.total_session_slots || 0),
            used_session_slots: Number(current.used_session_slots || 0),
            current_session_slots: Number(current.current_session_slots || 0),
            bonus_slots: Number(current.bonus_slots || 0),
            expires_at: current.expires_at,
            activated_at: current.activated_at,
            purchased_at: current.purchased_at,
            price_at_purchase: current.price_at_purchase,
            currency_at_purchase: current.currency_at_purchase || "INR",
            validity_days_at_purchase: current.validity_days_at_purchase,
            is_current_active: isUsableCurrent(current),
          }
        : null,
    };
  });

  // 5. Composable filter (derived from real data; no fake options).
  const filter = params?.filter ?? "all";
  let filtered = rows;
  if (filter !== "all") {
    filtered = rows.filter((r) => {
      const active = !!r.subscription && r.subscription.is_current_active;
      switch (filter) {
        case "active_subscription":
          return active;
        case "no_subscription":
          return !r.subscription;
        case "expired_subscription":
          return !!r.subscription && !active;
        case "active_account":
          return r.onboarded !== false;
        case "suspended_account":
          return r.onboarded === false;
        default:
          return true;
      }
    });
  }

  // 6. Sort (server-side comparator, defensive against null).
  filtered.sort((a, b) => compareStudents(a, b, params?.sort ?? "recently_joined"));

  const total = filtered.length;
  const offset = Math.max(params?.offset ?? 0, 0);
  const limit = Math.min(Math.max(params?.limit ?? PAGE_SIZE, 1), 200);
  const paged = filtered.slice(offset, offset + limit);

  return {
    students: paged,
    total,
    page: Math.floor(offset / limit),
    pageSize: limit,
    stats: await computeStatsFromIds(hits),
  };
}

/** Canonical source of truth: user_roles row with role = 'student'. */
async function fetchStudentIds(): Promise<string[]> {
  const { data, error } = await rlsRead<{ user_id: string }>("user_roles", "user_id", {
    eq: { column: "role", value: "student" },
  });
  if (error) {
    throw normalizeError(error, "Unable to list students (role lookup failed).");
  }
  return [...new Set((data || []).map((r) => String(r.user_id)))];
}

async function computeStatsFromIds(ids: string[]): Promise<StudentStats> {
  if (ids.length === 0) return NO_STATS;
  let activeAccounts = 0;
  const { data: pr } = await rlsRead<any>("profiles", "id, onboarded", {
    in: { column: "id", values: ids },
  });
  for (const p of pr || []) if ((p as any).onboarded !== false) activeAccounts++;

  let withActive = 0;
  let expiringSoon = 0;
  let totalUsed = 0;
  const { data: subs } = await rlsRead<any>(
    "student_subscriptions",
    "user_id, status, expires_at, used_session_slots",
    { in: { column: "user_id", values: ids } },
  );
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const seen = new Set<string>();
  for (const s of subs || []) {
    if (seen.has(s.user_id)) continue;
    if (isUsableCurrent(s)) {
      seen.add(s.user_id);
      withActive++;
      totalUsed += Number(s.used_session_slots || 0);
      if (s.expires_at && new Date(s.expires_at) <= soon) expiringSoon++;
    }
  }
  return {
    totalStudents: ids.length,
    activeAccounts,
    withActiveSubscription: withActive,
    expiringSoon,
    totalSessionsUsed: totalUsed,
  };
}

function compareStudents(a: StudentRow, b: StudentRow, sort: StudentSort): number {
  const d = (v: string | null | undefined): number => {
    const t = v ? new Date(v).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  };
  const used = (r: StudentRow) => Number(r.subscription?.used_session_slots || 0);
  const remaining = (r: StudentRow) =>
    Number(r.subscription?.current_session_slots || 0) + Number(r.subscription?.bonus_slots || 0);
  const expires = (r: StudentRow) => d(r.subscription?.expires_at);
  switch (sort) {
    case "name":
      return (a.full_name || "").localeCompare(b.full_name || "", undefined, { sensitivity: "base" });
    case "recently_active":
      return d(b.last_activity) - d(a.last_activity);
    case "least_active":
      return d(a.last_activity) - d(b.last_activity);
    case "most_sessions":
      return used(b) - used(a);
    case "least_sessions":
      return used(a) - used(b);
    case "expiring_soon":
      return expires(a) - expires(b);
    case "low_balance":
      return remaining(a) - remaining(b);
    case "oldest":
      return d(a.created_at) - d(b.created_at);
    case "recently_joined":
    default:
      return d(b.created_at) - d(a.created_at);
  }
}

export async function getStudentStats(): Promise<StudentStats> {
  const ids = await fetchStudentIds();
  return computeStatsFromIds(ids);
}

export async function getStudentDetail(
  studentId: string,
  subscriptionId?: string,
): Promise<StudentDetailData> {
  // Profile is the reliable head — profiles has SELECT USING (true).
  const { data: prof, error: profError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, reference_no, avatar_url, country, state, city, bio, onboarded, phone_number, native_language, target_language, current_level, learning_goal, learning_level, learning_goals, interests, timezone, created_at, updated_at",
    )
    .eq("id", studentId)
    .maybeSingle();
  if (profError || !prof) {
    throw normalizeError(profError || new Error("Student not found"), "Unable to load student");
  }
  const student = prof;

  // Subscription history (admin RLS policy). Degrades to [] if blocked.
  const historyRes = await rlsRead<any>(
    "student_subscriptions",
    "*, plan:subscription_plans(name, price, currency, num_sessions, billing_cycle, validity_days)",
    { eq: { column: "user_id", value: studentId } },
  );
  const list = historyRes.data || [];
  const usable = (s: any) =>
    s && s.status === "active" && (!s.expires_at || new Date(s.expires_at).getTime() > Date.now());
  const selected =
    (subscriptionId && list.find((s: any) => s.id === subscriptionId)) ||
    list.find(usable) ||
    list[0] ||
    null;

  let adjustments: any[] = [];
  if (selected) {
    const adj = await rlsRead<any>("subscription_slot_adjustments", "*", {
      eq: { column: "subscription_id", value: selected.id },
    });
    adjustments = adj.data || [];
  }
  const paymentsRes = await rlsRead<any>("payment_orders", "*", {
    eq: { column: "user_id", value: studentId },
  });
  const sessionsRes = await rlsRead<any>(
    "sessions",
    "id, mentor_id, scheduled_time, duration_mins, status, notes, created_at, updated_at",
    { eq: { column: "student_id", value: studentId } },
  );

  return {
    student,
    subscription: selected,
    history: list,
    adjustments,
    payments: paymentsRes.data || [],
    sessions: sessionsRes.data || [],
  };
}

export async function updateStudentProfile(
  studentId: string,
  updates: Record<string, unknown>,
): Promise<unknown> {
  return apiFetch<unknown>("/api/admin/students/update-profile", {
    method: "PUT",
    body: JSON.stringify({ studentId, updates }),
  });
}

export { PAGE_SIZE };

