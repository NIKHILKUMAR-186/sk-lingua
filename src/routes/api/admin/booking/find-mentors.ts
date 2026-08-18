import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

export type MentorEligibility = {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  headline: string | null;
  languages_taught: string[];
  years_experience: number;
  rating_avg: number;
  total_reviews: number;
  total_students: number;
  timezone: string | null;
  is_verified: boolean;
  active_sessions_today: number;
  active_sessions_this_week: number;
  eligibility_score: number;
  reasons: string[];
};

// POST /api/admin/booking/find-mentors
export const Route = createFileRoute("/api/admin/booking/find-mentors")({
  server: {
    handlers: {
      POST: async ({ request }) => {

        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;

          const body = await request.json();
          const { bookingId, scheduledTime, durationMins, language, excludeMentorId } = body;

          if (!scheduledTime || !durationMins || !language) {
            return new Response(
              JSON.stringify({ success: false, error: "Missing required fields: scheduledTime, durationMins, language" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const admin = supabaseAdmin as any;
          const scheduledDate = new Date(scheduledTime);
          const dayOfWeek = scheduledDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
          const sessionEnd = new Date(scheduledDate.getTime() + durationMins * 60000);

          // Find mentors who teach the requested language
          const { data: mentorProfiles, error: mentorError } = await admin
            .from("mentor_profiles")
            .select("user_id, headline, languages_taught, years_experience, rating_avg, total_reviews, total_students, timezone, is_verified, demo_lesson_url, teaching_style, cover_url")
            .eq("is_active", true)
            .contains("languages_taught", [language]);

          if (mentorError) throw mentorError;
          if (!mentorProfiles || mentorProfiles.length === 0) {
            return new Response(
              JSON.stringify({ success: true, mentors: [] }),
              { headers: { "Content-Type": "application/json" } }
            );
          }

          const mentorIds = mentorProfiles.map((m: any) => m.user_id);

          // Get profile details
          const { data: profiles } = await admin
            .from("profiles")
            .select("id, full_name, email, avatar_url, state")
            .in("id", mentorIds);

          const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));

          // Get availability slots for the requested day
          const { data: slots } = await admin
            .from("availability_slots")
            .select("*")
            .in("mentor_id", mentorIds)
            .eq("day_of_week", dayOfWeek)
            .eq("is_available", true);

          const slotsByMentor = new Map<string, any[]>();
          for (const slot of slots ?? []) {
            const list = slotsByMentor.get(slot.mentor_id) || [];
            list.push(slot);
            slotsByMentor.set(slot.mentor_id, list);
          }

          // Get existing sessions for conflict checking
          const { data: existingSessions } = await admin
            .from("sessions")
            .select("mentor_id, scheduled_time, duration_mins, status")
            .in("mentor_id", mentorIds)
            .in("status", ["confirmed", "in_progress", "pending_mentor_response"])
            .gte("scheduled_time", scheduledDate.toISOString())
            .lt("scheduled_time", sessionEnd.toISOString());

          const sessionsByMentor = new Map<string, any[]>();
          for (const session of existingSessions ?? []) {
            const list = sessionsByMentor.get(session.mentor_id) || [];
            list.push(session);
            sessionsByMentor.set(session.mentor_id, list);
          }

          // Get active booking holds
          const { data: activeHolds } = await admin
            .from("booking_holds")
            .select("mentor_id, scheduled_time, duration_mins, status")
            .in("mentor_id", mentorIds)
            .eq("status", "active")
            .gt("expires_at", new Date().toISOString());

          const holdsByMentor = new Map<string, any[]>();
          for (const hold of activeHolds ?? []) {
            const list = holdsByMentor.get(hold.mentor_id) || [];
            list.push(hold);
            holdsByMentor.set(hold.mentor_id, list);
          }

          // Get pending requests count (workload)
          const { data: pendingRequests } = await admin
            .from("mentor_session_requests")
            .select("mentor_id, status")
            .in("mentor_id", mentorIds)
            .eq("status", "pending");

          const pendingByMentor = new Map<string, number>();
          for (const req of pendingRequests ?? []) {
            pendingByMentor.set(req.mentor_id, (pendingByMentor.get(req.mentor_id) || 0) + 1);
          }

          // Calculate eligibility for each mentor
          const results: MentorEligibility[] = [];

          for (const mp of mentorProfiles) {
            if (excludeMentorId && mp.user_id === excludeMentorId) continue;

            const profile = profileMap.get(mp.user_id);
            const slots = slotsByMentor.get(mp.user_id) || [];
            const sessions = sessionsByMentor.get(mp.user_id) || [];
            const holds = holdsByMentor.get(mp.user_id) || [];
            const pendingCount = pendingByMentor.get(mp.user_id) || 0;

            const reasons: string[] = [];
            let score = 100;

            // Check language match
            if (!mp.languages_taught?.includes(language)) {
              reasons.push("Does not teach requested language");
              score -= 100;
              continue;
            } else {
              reasons.push(`Teaches ${language}`);
            }

            // Check availability
            if (slots.length === 0) {
              reasons.push("No availability on requested day");
              score -= 100;
              continue;
            } else {
              reasons.push(`Available on ${dayOfWeek}`);
            }

            // Check time slot coverage
            const hasTimeCoverage = slots.some((slot) => {
              const [sh, sm] = (slot.start_time || "").split(":").map(Number);
              const [eh, em] = (slot.end_time || "").split(":").map(Number);
              if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return false;
              const slotStart = sh * 60 + sm;
              const slotEnd = eh * 60 + em;
              const reqStart = scheduledDate.getHours() * 60 + scheduledDate.getMinutes();
              const reqEnd = reqStart + durationMins;
              return reqStart >= slotStart && reqEnd <= slotEnd;
            });

            if (!hasTimeCoverage) {
              reasons.push("No time slot covers requested time");
              score -= 50;
            }

            // Check schedule conflicts
            const hasConflict = sessions.some((s) => {
              const existingStart = new Date(s.scheduled_time).getTime();
              const existingEnd = existingStart + (s.duration_mins || 30) * 60000;
              return scheduledDate.getTime() < existingEnd && sessionEnd.getTime() > existingStart;
            });

            if (hasConflict) {
              reasons.push("Schedule conflict");
              score -= 100;
              continue;
            }

            // Check hold conflicts
            const hasHoldConflict = holds.some((h) => {
              const holdStart = new Date(h.scheduled_time).getTime();
              const holdEnd = holdStart + (h.duration_mins || 30) * 60000;
              return scheduledDate.getTime() < holdEnd && sessionEnd.getTime() > holdStart;
            });

            if (hasHoldConflict) {
              reasons.push("Slot hold conflict");
              score -= 80;
            }

            // Workload penalty
            if (pendingCount > 0) {
              reasons.push(`${pendingCount} pending request${pendingCount !== 1 ? "s" : ""}`);
              score -= pendingCount * 5;
            }

            // Rating bonus
            if (mp.rating_avg && mp.rating_avg > 0) {
              score += Math.min(mp.rating_avg * 2, 20);
              reasons.push(`Rated ${mp.rating_avg.toFixed(1)}`);
            }

            // Experience bonus
            if (mp.years_experience && mp.years_experience > 0) {
              score += Math.min(mp.years_experience, 15);
              reasons.push(`${mp.years_experience} yrs experience`);
            }

            // Verification bonus
            if (mp.is_verified) {
              score += 10;
              reasons.push("Verified");
            }

            if (score > 0) {
              results.push({
                user_id: mp.user_id,
                full_name: profile?.full_name || "Unknown",
                email: profile?.email || "",
                avatar_url: profile?.avatar_url || null,
                headline: mp.headline,
                languages_taught: mp.languages_taught || [],
                years_experience: mp.years_experience || 0,
                rating_avg: mp.rating_avg || 0,
                total_reviews: mp.total_reviews || 0,
                total_students: mp.total_students || 0,
                timezone: mp.timezone,
                is_verified: mp.is_verified || false,
                active_sessions_today: sessions.filter((s) => {
                  const d = new Date(s.scheduled_time);
                  const today = new Date();
                  return d.toDateString() === today.toDateString();
                }).length,
                active_sessions_this_week: sessions.length,
                eligibility_score: score,
                reasons,
              });
            }
          }

          // Sort by eligibility score descending
          results.sort((a, b) => b.eligibility_score - a.eligibility_score);

          return new Response(
            JSON.stringify({ success: true, mentors: results }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          console.error("Find mentors error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

      },
    },
  },
});
