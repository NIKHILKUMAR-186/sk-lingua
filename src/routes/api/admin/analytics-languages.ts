import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

function getDateFilter(dateRange: string) {
  const now = new Date();
  let startDate: Date;

  switch (dateRange) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "last_7_days":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last_30_days":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(0);
  }

  return startDate;
}

// GET /api/admin/analytics/languages
export const Route = createFileRoute("/api/admin/analytics-languages")({
  server: {
    handlers: {
      GET: async ({ request }) => {
      
        try {
          const authResult = await requireAdminAuth(request);
          const authError = createAdminAuthResponse(authResult);
          if (authError) return authError;
      
          const url = new URL(request.url);
          const dateRange = url.searchParams.get("dateRange") || "all";
      
          const admin = supabaseAdmin as any;
          const startDate = getDateFilter(dateRange);
      
          // Get all sessions in date range
          const { data: sessions, error: sessionsError } = await admin
            .from("sessions")
            .select("id, status, student_id, mentor_id, created_at")
            .gte("created_at", startDate.toISOString());
      
          if (sessionsError) throw sessionsError;
      
          // Get all mentor profiles with languages
          const { data: mentorProfiles, error: mentorError } = await admin
            .from("mentor_profiles")
            .select("user_id, languages_taught, is_active");
      
          if (mentorError) throw mentorError;
      
          // Create mentor map
          const mentorMap: Record<string, any> = {};
          mentorProfiles?.forEach((m: any) => {
            mentorMap[m.user_id] = m;
          });
      
          // Aggregate language stats
          const languageStats: Record<string, any> = {
            requested: {}, // Languages students want to learn
            taught: {},    // Languages mentors teach
            bookings: {},  // Bookings per language
          };
      
          // Count bookings by language (from mentor's taught languages)
          sessions?.forEach((session: any) => {
            const mentor = mentorMap[session.mentor_id];
            if (mentor && mentor.languages_taught && Array.isArray(mentor.languages_taught)) {
              // For each language the mentor teaches, count this booking
              mentor.languages_taught.forEach((lang: string) => {
                // Bookings by language
                languageStats.bookings[lang] = (languageStats.bookings[lang] || 0) + 1;
                
                // Languages taught
                languageStats.taught[lang] = (languageStats.taught[lang] || 0) + 1;
              });
            }
          });
      
          // Count active mentors by language
          const activeMentorsByLanguage: Record<string, number> = {};
          Object.entries(mentorMap).forEach(([userId, mentor]: [string, any]) => {
            if (mentor.is_active && mentor.languages_taught && Array.isArray(mentor.languages_taught)) {
              mentor.languages_taught.forEach((lang: string) => {
                activeMentorsByLanguage[lang] = (activeMentorsByLanguage[lang] || 0) + 1;
              });
            }
          });
      
          // Convert to arrays and sort
          const mostRequestedLanguages = Object.entries(languageStats.bookings)
            .map(([language, count]) => ({ language, count: count as number }))
            .sort((a, b) => b.count - a.count);
      
          const mostTaughtLanguages = Object.entries(languageStats.taught)
            .map(([language, count]) => ({ language, count: count as number }))
            .sort((a, b) => b.count - a.count);
      
          const bookingsByLanguage = mostRequestedLanguages;
      
          const activeMentorsByLanguageArray = Object.entries(activeMentorsByLanguage)
            .map(([language, count]) => ({ language, count }))
            .sort((a, b) => b.count - a.count);
      
          // Calculate totals
          const totalBookings = sessions?.length || 0;
          const totalLanguages = Object.keys(languageStats.bookings).length;
      
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                mostRequestedLanguages: mostRequestedLanguages.slice(0, 10),
                mostTaughtLanguages: mostTaughtLanguages.slice(0, 10),
                bookingsByLanguage: bookingsByLanguage.slice(0, 10),
                activeMentorsByLanguage: activeMentorsByLanguageArray.slice(0, 10),
                totalBookings,
                totalLanguages,
              },
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (err: any) {
          console.error("Language analytics error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

      },
    },
  },
});
