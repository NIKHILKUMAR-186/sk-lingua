import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

// ------------------------------------------------------------------
// Types shared by the P3 admin student-subscription control UI
// ------------------------------------------------------------------

export interface PlanLite {
  id: string;
  name: string;
  price: number | null;
  currency: string | null;
  num_sessions: number;
  billing_cycle: string | null;
}

export interface StudentSubscriptionLite {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_session_slots: number;
  total_session_slots: number;
  used_session_slots: number;
  bonus_slots: number;
  price_at_purchase: number | null;
  currency_at_purchase: string | null;
  purchased_at: string;
  activated_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  plan?: PlanLite | null;
}

export interface StudentProfileInfo {
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
}

export interface StudentDetail {
  student: StudentProfileInfo;
  subscription: StudentSubscriptionLite | null;
  history: StudentSubscriptionLite[];
  adjustments: any[];
  payments: any[];
  sessions: any[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface AdminStudentRow {
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
  subscription: {
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
  } | null;
}

export interface AdminStudentsStats {
  totalStudents: number;
  activeAccounts: number;
  withActiveSubscription: number;
  expiringSoon: number;
  totalSessionsUsed: number;
}

export interface AdminStudentsList {
  students: AdminStudentRow[];
  stats: AdminStudentsStats;
  total: number;
}

export type StudentFilter =
  | "all"
  | "active_subscription"
  | "no_subscription"
  | "expired_subscription"
  | "active_account"
  | "suspended_account";

// Append the auth token so the server-side requireAdminAuth() can authorise it.
function toApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}${path}`;
}

async function apiFetch<T = any>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let token = session?.access_token;

  const tokenExpired =
    token && typeof session?.expires_at === "number"
      ? Math.floor(Date.now() / 1000) >= session.expires_at
      : false;

  if (!token || tokenExpired) {
    await supabase.auth.refreshSession();
    const refreshedSession = (await supabase.auth.getSession()).data.session;
    token = refreshedSession?.access_token;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init?.headers as Record<string, string>) || {}),
  };

  const resolved = toApiUrl(url);
  const res = await fetch(resolved, { ...init, headers });

  // The routes under /api/admin/* always return JSON, so any other content type
  // (HTML, empty, etc.) means the endpoint was not registered on the running
  // server (e.g. a stale dev build). Surface that precisely instead of a generic
  // "unable to parse" error.
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    let preview = "non-JSON response body";
    try {
      const text = await res.text();
      preview = text.slice(0, 120).replace(/\s+/g, " ").trim() || preview;
    } catch {
      /* ignore body read errors */
    }
    throw new Error(
      `API error ${res.status}: endpoint ${url} is not available on the current server (${preview})`,
    );
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`API error ${res.status}: server returned invalid JSON from ${url}`);
  }

  // Distinguish auth / permission / transport errors instead of collapsing
  // every failure into a generic message.
  if (res.status === 401) {
    throw new Error("Authentication required. Please sign in again.");
  }
  if (res.status === 403) {
    throw new Error(json?.error || "Forbidden: admin access is required.");
  }
  if (res.status === 404) {
    throw new Error(
      json?.error ||
        `Endpoint not found: ${url} (the API route is not registered on the running server — restart the dev server or verify the build).`,
    );
  }
  if (res.status === 500) {
    throw new Error(json?.error || "Server error: please try again later.");
  }
  if (!res.ok) {
    throw new Error(json?.error || `API error ${res.status}: the request could not be completed.`);
  }

  if (!json.success) {
    throw new Error(json?.error || "Unable to load the requested resource. Please try again.");
  }
  return json;
}

// ------------------------------------------------------------------
// Service functions
// ------------------------------------------------------------------

/**
 * Persist lightweight profile edits made from the admin student detail view.
 */
export async function updateStudentProfile(
  studentId: string,
  updates: {
    full_name?: string;
    phone_number?: string;
    native_language?: string;
    state?: string;
    city?: string;
    country?: string;
    bio?: string;
    current_level?: string;
    learning_goal?: string;
    learning_level?: string;
    learning_goals?: string;
    interests?: string;
    target_language?: string;
    timezone?: string;
  },
): Promise<StudentProfileInfo> {
  const json = await apiFetch<StudentProfileInfo>("/api/admin/students/update-profile", {
    method: "PUT",
    body: JSON.stringify({ studentId, updates }),
  });
  return json.data as StudentProfileInfo;
}

export async function listStudents(params?: {
  search?: string;
  filter?: StudentFilter;
  limit?: number;
}): Promise<AdminStudentsList> {
  const qp = new URLSearchParams();
  if (params?.search) qp.set("search", params.search);
  if (params?.filter && params.filter !== "all") qp.set("filter", params.filter);
  if (params?.limit) qp.set("limit", String(params.limit));
  const json = await apiFetch<AdminStudentsList>(
    `/api/admin/students/list${qp.toString() ? `?${qp.toString()}` : ""}`,
  );
  return (json.data as AdminStudentsList) || { students: [], stats: emptyStats(), total: 0 };
}

export async function getStudentStats(): Promise<AdminStudentsStats> {
  const json = await apiFetch<AdminStudentsStats>("/api/admin/students/stats");
  return (json.data as AdminStudentsStats) || emptyStats();
}

function emptyStats(): AdminStudentsStats {
  return {
    totalStudents: 0,
    activeAccounts: 0,
    withActiveSubscription: 0,
    expiringSoon: 0,
    totalSessionsUsed: 0,
  };
}

export async function getStudentDetail(
  studentId: string,
  subscriptionId?: string,
): Promise<StudentDetail> {
  const params = new URLSearchParams({ studentId });
  if (subscriptionId) params.set("subscriptionId", subscriptionId);
  const json = await apiFetch<StudentDetail>(
    `/api/admin/student-subscriptions/detail?${params.toString()}`,
  );
  return json.data as StudentDetail;
}

export async function addSessions(
  subscriptionId: string,
  amount: number,
  reason: string,
): Promise<StudentSubscriptionLite> {
  const json = await apiFetch<StudentSubscriptionLite>(
    "/api/admin/student-subscriptions/adjust-sessions",
    {
      method: "POST",
      body: JSON.stringify({ subscriptionId, amount, reason, source: "ADMIN_ADJUSTMENT" }),
    },
  );
  return json.data as StudentSubscriptionLite;
}

export async function removeSessions(
  subscriptionId: string,
  amount: number,
  reason: string,
): Promise<StudentSubscriptionLite> {
  const json = await apiFetch<StudentSubscriptionLite>(
    "/api/admin/student-subscriptions/adjust-sessions",
    {
      method: "POST",
      body: JSON.stringify({ subscriptionId, amount: -amount, reason, source: "ADMIN_ADJUSTMENT" }),
    },
  );
  return json.data as StudentSubscriptionLite;
}
export async function activateSubscription(
  subscriptionId: string,
  reason: string,
): Promise<StudentSubscriptionLite> {
  const json = await apiFetch<StudentSubscriptionLite>(
    "/api/admin/student-subscriptions/activate",
    { method: "POST", body: JSON.stringify({ subscriptionId, reason }) },
  );
  return json.data as StudentSubscriptionLite;
}

export async function deactivateSubscription(
  subscriptionId: string,
  reason: string,
): Promise<StudentSubscriptionLite> {
  const json = await apiFetch<StudentSubscriptionLite>(
    "/api/admin/student-subscriptions/deactivate",
    { method: "POST", body: JSON.stringify({ subscriptionId, reason }) },
  );
  return json.data as StudentSubscriptionLite;
}

export async function extendExpiry(
  subscriptionId: string,
  days: number,
  reason: string,
): Promise<StudentSubscriptionLite> {
  const json = await apiFetch<StudentSubscriptionLite>(
    "/api/admin/student-subscriptions/extend-expiry",
    { method: "POST", body: JSON.stringify({ subscriptionId, days, reason }) },
  );
  return json.data as StudentSubscriptionLite;
}

export async function createSubscription(
  studentId: string,
  planId: string,
  reason: string,
): Promise<StudentSubscriptionLite> {
  const json = await apiFetch<StudentSubscriptionLite>("/api/admin/student-subscriptions/create", {
    method: "POST",
    body: JSON.stringify({ studentId, planId, reason }),
  });
  return json.data as StudentSubscriptionLite;
}

export async function replacePlan(
  subscriptionId: string,
  newPlanId: string,
  reason: string,
): Promise<StudentSubscriptionLite> {
  const json = await apiFetch<StudentSubscriptionLite>(
    "/api/admin/student-subscriptions/replace-plan",
    {
      method: "POST",
      body: JSON.stringify({ subscriptionId, newPlanId, reason }),
    },
  );
  return json.data as StudentSubscriptionLite;
}

export async function fetchPlans(): Promise<PlanLite[]> {
  const json = await apiFetch<PlanLite[]>("/api/admin/subscription-plans");
  return json.data ?? [];
}

// ------------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------------

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

export function usableSessions(sub: StudentSubscriptionLite | null): number {
  if (!sub) return 0;
  return (sub.current_session_slots || 0) + (sub.bonus_slots || 0);
}

export function statusLabel(status: string): "ACTIVE" | "INACTIVE" {
  return status === "active" ? "ACTIVE" : "INACTIVE";
}

export function displayCurrency(sub: StudentSubscriptionLite | null): string {
  const price = sub?.price_at_purchase;
  if (price === null || price === undefined || price === 0) return "—";
  return `₹${Number(price).toLocaleString("en-IN")}`;
}
