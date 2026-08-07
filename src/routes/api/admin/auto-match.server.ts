import { supabase } from "@/integrations/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { request_id, assigned_by } = body;
    if (!request_id || !assigned_by)
      return new Response(JSON.stringify({ error: "missing params" }), { status: 400 });

    const client = supabase as any;

    // Verify the request exists and is in a pending/assigned state
    const { data: request, error: reqErr } = await client
      .from("session_requests")
      .select("*")
      .eq("id", request_id)
      .maybeSingle();
    if (reqErr) throw reqErr;
    if (!request)
      return new Response(JSON.stringify({ error: "request not found" }), { status: 404 });
    if (
      request.status !== "pending_admin_assignment" &&
      request.status !== "unassigned" &&
      request.status !== "pending_mentor_response"
    ) {
      return new Response(JSON.stringify({ error: "request not assignable" }), { status: 400 });
    }

    // If previously assigned, log the rejection/service that caused auto-match
    if (request.assigned_mentor && request.status === "pending_mentor_response") {
      // Log that previous mentor was superseded
      await client.from("assignment_history").insert([
        {
          request_id: request.id,
          mentor_id: request.assigned_mentor,
          status: "reassigned",
          reason: "auto_match_superseded",
          performed_by: assigned_by,
        },
      ]);
    }

    // Find best mentor match: active + verified + available
    const { data: activeMentors = [] } = await client
      .from("mentor_profiles")
      .select("user_id, languages_taught, rating_avg, total_reviews, years_experience, verification_status")
      .eq("is_active", true)
      .eq("verification_status", "approved");

    if (activeMentors.length === 0) {
      // Set request back to unassigned with note
      await client
        .from("session_requests")
        .update({ assigned_mentor: null, status: "unassigned", updated_at: new Date().toISOString() })
        .eq("id", request.id);
      return new Response(
        JSON.stringify({ error: "no_available_mentors", message: "No approved mentors available" }),
        { status: 409 },
      );
    }

    // Filter by requested language if supported
    const requestedLang = request.language ? request.language.toLowerCase() : null;
    const matchingMentors = requestedLang
      ? activeMentors.filter((m: any) =>
          (m.languages_taught ?? []).some((l: string) => l.toLowerCase().includes(requestedLang)),
        )
      : activeMentors;

    if (matchingMentors.length === 0) {
      await client
        .from("session_requests")
        .update({ assigned_mentor: null, status: "unassigned", updated_at: new Date().toISOString() })
        .eq("id", request.id);
      return new Response(
        JSON.stringify({
          error: "no_mentor_for_language",
          message: `No approved mentors for language: ${request.language}`,
        }),
        { status: 409 },
      );
    }

    // Pick best mentor: highest rating, then most reviews, then most experience
    const bestMentor = [...matchingMentors].sort((a: any, b: any) => {
      const ratingDiff = (b.rating_avg ?? 0) - (a.rating_avg ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      const reviewDiff = (b.total_reviews ?? 0) - (a.total_reviews ?? 0);
      if (reviewDiff !== 0) return reviewDiff;
      return (b.years_experience ?? 0) - (a.years_experience ?? 0);
    })[0];

    // Log assignment
    await client.from("assignment_history").insert([
      {
        request_id: request.id,
        mentor_id: bestMentor.user_id,
        status: "assigned",
        reason: `auto_match${requestedLang ? `:${request.language}` : ""}`,
        performed_by: assigned_by,
      },
    ]);

    // Update request with mentor + SLA timer
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    await client
      .from("session_requests")
      .update({
        assigned_mentor: bestMentor.user_id,
        status: "pending_mentor_response",
        sla_assigned_at: now.toISOString(),
        sla_deadline: slaDeadline,
        updated_at: now.toISOString(),
      })
      .eq("id", request.id);

    // Notify the mentor
    await client.from("notifications").insert([
      {
        user_id: bestMentor.user_id,
        title: "New session request auto-assigned",
        body: `A session request for "${request.topic || "language session"}" has been auto-matched to you. Please respond within 15 minutes.`,
        link: "/mentor/requests",
        category: "session",
        kind: "session_assigned",
        related_id: request.id,
      },
    ]);

    return new Response(JSON.stringify({ ok: true, mentor_id: bestMentor.user_id }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}