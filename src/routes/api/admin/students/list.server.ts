import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

/**
 * GET /api/admin/students/list?search=<q>&filter=<f>&limit=<n>
 *
 * Returns ONLY users whose actual role is 'student' (from user_roles — the
 * single source of truth for roles), joined with their CURRENT subscription
 * (matching the student-side rules: status = 'active' AND not expired),
 * a like-name/email search, subscription filter, and database-driven stats.
 *
 * All reads run through the service role (RLS bypass) and are guarded by
 * requireAdminAuth() server-side.
 */

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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
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

export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").trim();
    const filter = (url.searchParams.get("filter") || "all").trim();
    const sort = (url.searchParams.get("sort") || "recently_joined").trim();
    const rawLimit = Number(url.searchParams.get("limit") || "1000");
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 2000) : 1000;

    const admin = supabaseAdmin as any;

    // 1. Role is the source of truth — student only.
    const { data: roleRows, error: rolesError } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");
    if (rolesError) throw rolesError;

    const studentIds: string[] = [
      ...new Set(((roleRows as any[]) || []).map((r: any) => String(r.user_id))),
    ];
    if (studentIds.length === 0) {
      return json({ success: true, data: { students: [], stats: emptyStats(), total: 0 } });
    }

    // 2. Profiles (all students) — search applied server-side.
    let profileQuery = admin
      .from("profiles")
      .select(
        "id, full_name, email, avatar_url, country, state, city, created_at, updated_at, onboarded, reference_no, current_level, learning_goal",
      )
      .in("id", studentIds);
    if (search) {
      profileQuery = profileQuery.or(
        `full_name.ilike.%${escapeLike(search)}%,email.ilike.%${escapeLike(search)}%`,
      );
    }
    const { data: profiles, error: profilesError } = await profileQuery;
    if (profilesError) throw profilesError;

    const profileIds = (profiles || []).map((p: any) => p.id);
    if (profileIds.length === 0) {
      return json({ success: true, data: { students: [], stats: emptyStats(), total: 0 } });
    }

    // 3. Subscriptions joined with plan (batched, avoids N+1).
    const { data: subscriptions, error: subsError } = await admin
      .from("student_subscriptions")
      .select(
        "*, plan:subscription_plans(id, name, price, currency, num_sessions, validity_days)",
      )
      .in("user_id", profileIds)
      .order("created_at", { ascending: false });
    if (subsError) throw subsError;

    const subsByUser = new Map<string, any>();
    for (const s of subscriptions || []) {
      if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, s);
    }

    // 4. Last activity — latest session activity per student (batched).
    const lastActivity = new Map<string, string>();
    {
      const { data: sessions, error: sessError } = await admin
        .from("sessions")
        .select("student_id, updated_at, created_at")
        .in("student_id", profileIds);
      if (!sessError && sessions) {
        for (const s of sessions) {
          const ts = (s.updated_at || s.created_at) as string;
          const prev = lastActivity.get(s.student_id);
          if (!prev || ts > prev) lastActivity.set(s.student_id, ts);
        }
      }
    }

    // 5. Build rows. "Current" subscription = active + not expired (matches the
    //    student side); if none exists, fall back to the latest row so the UI
    //    can still show Expired/Cancelled state.
    const rows: AdminStudentRow[] = (profiles || []).map((p: any) => {
      const latest = subsByUser.get(p.id);
      const active =
        (subscriptions || [])
          .filter((s: any) => s.user_id === p.id)
          .find(isUsableCurrent) || null;
      const current = active || latest || null;

      const isCurrentActive = !!current && isUsableCurrent(current);
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
        onboarded: p.onboarded,
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
              is_current_active: isCurrentActive,
            }
          : null,
      };
    });

    // 6. Stats over the FULL student set (unfiltered) so the header always
    //    reflects the whole cohort.
    const allStats = computeStatsFull(studentIds, rows);

    // 7. Subscription / account-state filter.
    let filtered = rows;
    if (filter && filter !== "all") {
      filtered = rows.filter((r) => {
        const sub = r.subscription;
        const active = !!sub && sub.is_current_active;
        switch (filter) {
          case "active_subscription":
            return active;
          case "no_subscription":
            return !sub;
          case "expired_subscription":
            return !!sub && !sub.is_current_active;
          case "active_account":
            return r.onboarded !== false;
          case "suspended_account":
            return r.onboarded === false;
          default:
            return true;
        }
      });
    }

    // 7b. Server-side sort on the filtered cohort (mirrors admin sort options).
    const sorted = sortStudents(filtered, sort);

    const limited = sorted.slice(0, limit);

    return json({
      success: true,
      data: { students: limited, stats: allStats, total: filtered.length },
    });
  } catch (err: any) {
    console.error("[admin/students/list] error:", err);
    return json({ success: false, error: "Unable to load students. Please try again." }, 500);
  }
}

/** Full-cohort stats for the Admin Students header. */
function computeStatsFull(studentIds: string[], rows: AdminStudentRow[]): AdminStudentsStats {
  let withActiveSubscription = 0;
  let activeAccounts = 0;
  let expiringSoon = 0;
  let totalSessionsUsed = 0;
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);

  for (const r of rows) {
    if (r.onboarded !== false) activeAccounts++;
    const sub = r.subscription;
    if (sub && sub.is_current_active) {
      withActiveSubscription++;
      totalSessionsUsed += Number(sub.used_session_slots || 0);
      if (sub.expires_at && new Date(sub.expires_at) <= soon) expiringSoon++;
    }
  }

  return {
    totalStudents: studentIds.length,
    activeAccounts,
    withActiveSubscription,
    expiringSoon,
    totalSessionsUsed,
  };
}

/** Match the student-side "current subscription" rules exactly. */
function isUsableCurrent(sub: any): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (sub.expires_at && new Date(sub.expires_at).getTime() <= Date.now()) return false;
  return true;
}

/**
 * Deterministic, server-side sort for the Admin Students directory.
 * Every comparator is defensive against null/undefined so a partial student
 * can never throw. Sorting happens on the server (not in React) so the
 * browser never has to hold the whole cohort.
 */
function sortStudents(rows: AdminStudentRow[], sort: string): AdminStudentRow[] {
  const byDate = (v: string | null | undefined): number => {
    const t = v ? new Date(v).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  };
  const used = (r: AdminStudentRow): number =>
    Number(r.subscription?.used_session_slots || 0);
  const remaining = (r: AdminStudentRow): number =>
    Number(r.subscription?.current_session_slots || 0) + Number(r.subscription?.bonus_slots || 0);
  const expires = (r: AdminStudentRow): number => byDate(r.subscription?.expires_at);

  const cmp = (a: AdminStudentRow, b: AdminStudentRow): number => {
    switch (sort) {
      case "name":
        return (a.full_name || "").localeCompare(b.full_name || "", undefined, {
          sensitivity: "base",
        });
      case "recently_active":
        return byDate(b.last_activity) - byDate(a.last_activity);
      case "least_active":
        return byDate(a.last_activity) - byDate(b.last_activity);
      case "most_sessions":
        return used(b) - used(a);
      case "least_sessions":
        return used(a) - used(b);
      case "expiring_soon":
        return expires(a) - expires(b);
      case "low_balance":
        return remaining(a) - remaining(b);
      case "recently_joined":
      default:
        return byDate(b.created_at) - byDate(a.created_at);
    }
  };

  return [...rows].sort(cmp);
}