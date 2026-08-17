import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

export type StudentRisk = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  signals: string[];
  risk_level: "low" | "medium" | "high";
  subscription_status: string | null;
  sessions_remaining: number;
  last_session_at: string | null;
  days_since_last_session: number | null;
};

// GET /api/admin/student-risks
// Returns students with operational risk signals.
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;

    // 1. Load all students
    const roleRows = (await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "student")) as { data: any[] };

    const studentIds: string[] = [...new Set((roleRows.data ?? []).map((r: any) => String(r.user_id)))];
    if (studentIds.length === 0) {
      return new Response(JSON.stringify({ success: true, risks: [] }), {
        headers: { "Content-Type": "application/json" } });
    }

    // 2. Profiles
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email, avatar_url, updated_at")
      .in("id", studentIds);

    const profileMap = new Map<string, { id: string; full_name: string | null; email: string | null; avatar_url: string | null; updated_at: string | null }>();
    for (const p of (profiles ?? []) as any[]) {
      profileMap.set(p.id, p);
    }

    // 3. Subscriptions (latest per student)
    const { data: subs } = await admin
      .from("student_subscriptions")
      .select("user_id, status, expires_at, current_session_slots, bonus_slots, used_session_slots")
      .in("user_id", studentIds)
      .order("created_at", { ascending: false });

    const subMap = new Map<string, { user_id: string; status: string; expires_at: string | null; current_session_slots: number; bonus_slots: number; used_session_slots: number }>();
    for (const s of (subs ?? []) as any[]) {
      if (!subMap.has(s.user_id)) subMap.set(s.user_id, s);
    }

    // 4. Last session per student
    const { data: sessions } = await admin
      .from("sessions")
      .select("student_id, scheduled_time, status")
      .in("student_id", studentIds)
      .order("scheduled_time", { ascending: false });

    const lastSessionMap = new Map<string, { time: string; status: string }>();
    for (const s of sessions ?? []) {
      if (!lastSessionMap.has(s.student_id)) {
        lastSessionMap.set(s.student_id, { time: s.scheduled_time, status: s.status });
      }
    }

    // 5. Build risk signals
    const risks: StudentRisk[] = [];
    const now = Date.now();
    const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;

    for (const uid of studentIds) {
      const profile = (profileMap.get(uid) as any) as { id: string; full_name: string | null; email: string | null; avatar_url: string | null; updated_at: string | null } | undefined;
      const sub = (subMap.get(uid) as any) as { user_id: string; status: string; expires_at: string | null; current_session_slots: number; bonus_slots: number; used_session_slots: number } | undefined;
      const lastSession = (lastSessionMap.get(uid) as any) as { time: string; status: string } | undefined;

      const signals: string[] = [];
      let riskScore = 0;

      // Subscription signals
      const isActive = sub && sub.status === "active" && (!sub.expires_at || new Date(sub.expires_at).getTime() > now);
      const sessionsRemaining = Number(sub?.current_session_slots || 0) + Number(sub?.bonus_slots || 0);

      if (!sub) {
        signals.push("No subscription");
        riskScore += 2;
      } else if (!isActive) {
        signals.push("Subscription expired");
        riskScore += 3;
      } else if (sub.expires_at && new Date(sub.expires_at).getTime() <= now) {
        signals.push("Subscription expired");
        riskScore += 3;
      } else if (sub.expires_at && new Date(sub.expires_at).getTime() <= tenDaysAgo + 10 * 24 * 60 * 60 * 1000) {
        const daysLeft = Math.ceil((new Date(sub.expires_at).getTime() - now) / (24 * 60 * 60 * 1000));
        if (daysLeft <= 30) {
          signals.push(`Expiring in ${daysLeft} days`);
          riskScore += 2;
        }
      }

      if (isActive && sessionsRemaining <= 2) {
        signals.push("Low session balance");
        riskScore += 1;
      }

      // Activity signals
      const lastTime = lastSession?.time ? new Date(lastSession.time).getTime() : null;
      if (lastTime && lastTime < tenDaysAgo) {
        const daysSince = Math.floor((now - lastTime) / (24 * 60 * 60 * 1000));
        signals.push(`No session for ${daysSince} days`);
        riskScore += 2;
      } else if (!lastTime) {
        const created = profile?.updated_at ? new Date(profile.updated_at).getTime() : null;
        if (created && now - created > 30 * 24 * 60 * 60 * 1000) {
          signals.push("No sessions ever booked");
          riskScore += 2;
        }
      }

      // Cancellation signals
      const { data: cancelled } = await admin
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", uid)
        .eq("status", "cancelled");

      const cancelCount = (cancelled as any) || 0;
      if (cancelCount >= 3) {
        signals.push(`${cancelCount} cancelled sessions`);
        riskScore += 1;
      }

      if (signals.length === 0) continue;

      const risk_level: StudentRisk["risk_level"] = riskScore >= 4 ? "high" : riskScore >= 2 ? "medium" : "low";

      risks.push({
        user_id: uid,
        full_name: profile?.full_name || null,
        email: profile?.email || null,
        avatar_url: profile?.avatar_url || null,
        signals,
        risk_level,
        subscription_status: sub?.status || null,
        sessions_remaining: sessionsRemaining,
        last_session_at: lastSession?.time || null,
        days_since_last_session: lastSession?.time
          ? Math.floor((now - new Date(lastSession.time).getTime()) / (24 * 60 * 60 * 1000))
          : null,
      });
    }

    // Sort by risk score descending
    const riskOrder = { high: 0, medium: 1, low: 2 };
    risks.sort((a, b) => (riskOrder[a.risk_level] ?? 3) - (riskOrder[b.risk_level] ?? 3));

    return new Response(
      JSON.stringify({ success: true, risks }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Student risks error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" } },
    );
  }
}
