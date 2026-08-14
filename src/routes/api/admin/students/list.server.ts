import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/students?q=<optional search term>
// Lists ALL students with their latest subscription attached.
//
// When `q` is omitted the full student roster is returned (this is the
// behaviour the original search-only endpoint lacked — it returned [] for an
// empty query, which is why the page showed "Search and select a student…"
// instead of rendering the existing students).
//
// When `q` is supplied the result is filtered by name / email / reference_no
// (same matching logic as the legacy search endpoint) so the search bar in the
// new Students list works as a live filter.
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();

    const candidates: any[] = [];

    if (q) {
      // Filter mode — reuse the same dedup logic as the search endpoint.
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
          "id, full_name, email, reference_no, avatar_url, phone_number, native_language, state, country",
        )
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .order("full_name", { ascending: true })
        .limit(100);
      if (textError) throw textError;
      addCandidate(byText);

      // 2) If the term looks like a numeric Student ID, match by reference_no
      if (/^\d+$/.test(q)) {
        const { data: byRef, error: refError } = await admin
          .from("profiles")
          .select(
            "id, full_name, email, reference_no, avatar_url, phone_number, native_language, state, country",
          )
          .eq("reference_no", Number(q))
          .limit(20);
        if (refError) throw refError;
        addCandidate(byRef);
      }
    } else {
      // List mode — fetch every student profile.
      const { data: all, error: allError } = await admin
        .from("profiles")
        .select(
          "id, full_name, email, reference_no, avatar_url, phone_number, native_language, state, country",
        )
        .order("full_name", { ascending: true })
        .limit(500);
      if (allError) throw allError;
      candidates.push(...(all || []));
    }

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Attach the latest subscription for each candidate student.
    const studentIds = candidates.map((c) => c.id);
    const { data: subs, error: subsError } = await admin
      .from("student_subscriptions")
      .select("*, plan:subscription_plans(name, price, currency, num_sessions, billing_cycle)")
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
      avatar_url: c.avatar_url,
      phone_number: c.phone_number,
      native_language: c.native_language,
      state: c.state,
      country: c.country,
      subscription: latestByStudent.get(c.id) || null,
    }));

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Student list error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
