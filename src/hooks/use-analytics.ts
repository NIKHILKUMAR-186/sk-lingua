import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useStudentAnalytics(userId?: string) {
  return useQuery({
    queryKey: ["student-analytics", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: sessions = [] }, { data: resources = [] }, { data: xp = [] }, { data: streak } ] = await Promise.all([
        supabase.from("sessions").select("id,scheduled_time,duration_mins,status,gig_id").eq("student_id", userId),
        supabase.from("resources").select("id,student_id,created_at").eq("student_id", userId),
        supabase.from("xp_history").select("points").eq("user_id", userId),
        supabase.from("streak_points").select("current_streak,longest_streak,total_points").eq("user_id", userId).maybeSingle(),
      ]);

      const completedSessions = sessions.filter((s: any) => s.status === "completed");
      const learningHours = completedSessions.reduce((acc: number, s: any) => acc + (s.duration_mins ?? 0) / 60, 0);
      const sessionsCompleted = completedSessions.length;
      const resourcesStudied = resources.length;
      const xpTotal = (xp ?? []).reduce((acc: number, row: any) => acc + (row.points ?? 0), 0) + (streak?.total_points ?? 0);
      const currentStreak = streak?.current_streak ?? 0;
      const longestStreak = streak?.longest_streak ?? 0;

      // Homework completion: approximate by counting sessions with status completed divided by total non-cancelled
      const totalRelevant = sessions.filter((s: any) => !["cancelled","rejected"].includes(s.status)).length || 1;
      const homeworkCompletionPct = Math.round((sessionsCompleted / totalRelevant) * 100);

      // Weekly activity: count sessions by weekday for last 7 days
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      const weeklyActivity = Array.from({ length: 7 }).map((_, i) => ({ day: i, count: 0 }));
      sessions.forEach((s: any) => {
        const d = new Date(s.scheduled_time);
        const delta = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (delta <= 6) {
          const idx = 6 - delta;
          weeklyActivity[idx].count += 1;
        }
      });

      return {
        learningHours,
        sessionsCompleted,
        homeworkCompletionPct,
        resourcesStudied,
        xpTotal,
        currentStreak,
        longestStreak,
        weeklyActivity,
      };
    },
  });
}

export function useMentorAnalytics(mentorId?: string) {
  return useQuery({
    queryKey: ["mentor-analytics", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      const [{ data: sessions = [] }, { data: reviews = [] }, { data: resources = [] }] = await Promise.all([
        supabase.from("sessions").select("id,scheduled_time,duration_mins,status,student_id").eq("mentor_id", mentorId),
        supabase.from("reviews").select("rating,mentor_id").eq("mentor_id", mentorId),
        supabase.from("resources").select("id,mentor_id,created_at").eq("mentor_id", mentorId),
      ]);

      const today = new Date().toDateString();
      const todays = sessions.filter((s: any) => new Date(s.scheduled_time).toDateString() === today);
      const monthly = sessions.filter((s: any) => (new Date(s.scheduled_time).getMonth() === new Date().getMonth()));
      const revenue = monthly.reduce((acc: number, s: any) => acc + ((s.duration_mins ?? 0) / 60) * 0, 0); // placeholder
      const avgRating = reviews.length ? reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length : 0;
      const students = new Set(sessions.map((s: any) => s.student_id)).size;
      const repeatStudents = (() => {
        const counts: Record<string, number> = {};
        sessions.forEach((s: any) => { counts[s.student_id] = (counts[s.student_id] || 0) + 1; });
        return Object.values(counts).filter((c) => c > 1).length;
      })();
      const homeworkReviewed = 0; // placeholder; depends on homework table
      const resourcesShared = resources.length;
      const completionRate = sessions.length ? Math.round((sessions.filter((s:any) => s.status === 'completed').length / sessions.length) * 100) : 0;

      return {
        todays: todays.length,
        monthly: monthly.length,
        revenue,
        avgRating,
        students,
        repeatStudents,
        homeworkReviewed,
        resourcesShared,
        completionRate,
      };
    }
  });
}
