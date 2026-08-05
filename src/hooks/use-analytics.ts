import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const client = (supabase as any);

export function useStudentAnalytics(userId?: string) {
  return useQuery({
    queryKey: ["student-analytics", userId],
    enabled: !!userId,
    queryFn: async () => {
      const client = (supabase as any);
      const [{ data: sessions = [] }, { data: resources = [] }, { data: xp = [] }, { data: streak } ] = await Promise.all([
        client.from("sessions").select("id,scheduled_time,duration_mins,status,gig_id").eq("student_id", userId!),
        client.from("resources").select("id,student_id,created_at").eq("student_id", userId!),
        client.from("xp_history").select("points").eq("user_id", userId!),
        client.from("streak_points").select("current_streak,longest_streak,total_points").eq("user_id", userId!).maybeSingle(),
      ]);

      const sessionsArr = sessions ?? [];
      const completedSessions = sessionsArr.filter((s: any) => s.status === "completed");
      const learningHours = completedSessions.reduce((acc: number, s: any) => acc + (s.duration_mins ?? 0) / 60, 0);
      const sessionsCompleted = completedSessions.length;
      const resourcesStudied = resources.length;
      const xpTotal = (xp ?? []).reduce((acc: number, row: any) => acc + (row.points ?? 0), 0) + (streak?.total_points ?? 0);
      const currentStreak = streak?.current_streak ?? 0;
      const longestStreak = streak?.longest_streak ?? 0;

      // Homework completion: approximate by counting sessions with status completed divided by total non-cancelled
      const totalRelevant = sessionsArr.filter((s: any) => !["cancelled","rejected"].includes(s.status)).length || 1;
      const homeworkCompletionPct = Math.round((sessionsCompleted / totalRelevant) * 100);

      // Weekly activity: count sessions by weekday for last 7 days
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      const weeklyActivity = Array.from({ length: 7 }).map((_, i) => ({ day: i, count: 0 }));
      sessionsArr.forEach((s: any) => {
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
        client.from("sessions").select("id,scheduled_time,duration_mins,status,student_id").eq("mentor_id", mentorId!),
        client.from("reviews").select("rating,mentor_id").eq("mentor_id", mentorId!),
        client.from("resources").select("id,mentor_id,created_at").eq("mentor_id", mentorId!),
      ]);

      const sessionsArr2 = sessions ?? [];
      const reviewsArr = reviews ?? [];
      const resourcesArr = resources ?? [];

      const today = new Date().toDateString();
      const todays = sessionsArr2.filter((s: any) => new Date(s.scheduled_time).toDateString() === today);
      const monthly = sessionsArr2.filter((s: any) => (new Date(s.scheduled_time).getMonth() === new Date().getMonth()));
      const revenue = monthly.reduce((acc: number, s: any) => acc + ((s.duration_mins ?? 0) / 60) * 0, 0); // placeholder
      const avgRating = reviewsArr.length ? reviewsArr.reduce((a: number, r: any) => a + r.rating, 0) / reviewsArr.length : 0;
      const students = new Set(sessionsArr2.map((s: any) => s.student_id)).size;
      const repeatStudents = (() => {
        const counts: Record<string, number> = {};
        sessionsArr2.forEach((s: any) => { counts[s.student_id] = (counts[s.student_id] || 0) + 1; });
        return Object.values(counts).filter((c) => c > 1).length;
      })();
      const homeworkReviewed = 0; // placeholder; depends on homework table
      const resourcesShared = resourcesArr.length;
      const completionRate = sessionsArr2.length ? Math.round((sessionsArr2.filter((s:any) => s.status === 'completed').length / sessionsArr2.length) * 100) : 0;

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
