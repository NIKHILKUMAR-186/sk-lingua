import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/student-subscriptions/search?q=<term>
// Searches students by name, email, or reference number (Student ID)
// and attaches their latest subscription.
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();

    if (!q) {
      return new Response(
        JSON.stringify({ success: true, data: [] }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const candidates: any[] = [];
    const seen = new Set<string>();

    const addCandidate = (rows: any[]) => {
      (rows || []).forEach((r) => {
        if (r?.id && !seen.has(r.id)) {
          seen.add(r.id);
          candidates.push(r);
        }
      });
    };

    // 1) Match by name OR email
    const { data: byText, error: textError } = await admin
      .from("profiles")
      .select(
        "id, full_name, email, reference_no, avatar_url, phone_number, native_language, state, country"
      )
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .order("full_name", { ascending: true })
      .limit(50);
    if (textError) throw textError;
    addCandidate(byText);

    // 2) If the term looks like a numeric Student ID, match by reference_no
    if (/^\d+$/.test(q)) {
      const { data: byRef, error: refError } = await admin
        .from("profiles")
        .select(
          "id, full_name, email, reference_no, avatar_url, phone_number, native_language, state, country"
        )
        .eq("reference_no", Number(q))
        .limit(10);
      if (refError) throw refError;
      addCandidate(byRef);
    }

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: [] }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 3) Attach the latest subscription for each candidate student
    const studentIds = candidates.map((c) => c.id);
    const { data: subs, error: subsError } = await admin
      .from("student_subscriptions")
      .select(
        "*, plan:subscription_plans(name, price, currency, num_sessions, billing_cycle)"
      )
      .in("user_id", studentIds)
      .order("created_at", { ascending: false });
    if (subsError) throw subsError;

    const latestByStudent = new Map<string, any>();
    (subs || []).forEach((s: any) => {
      if (!latestByStudent.has(s.user_id)) latestByStudent.set(s.user_id, s);
    });

    const data = candidates.map((c) => ({
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      reference_no: c.reference_no,
      avatar_url: c.avatar_url ?? null,
      phone_number: c.phone_number ?? null,
      native_language: c.native_language ?? null,
      state: c.state ?? null,
      country: c.country ?? null,
      subscription: latestByStudent.get(c.id) || null,
    }));

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Student search error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
