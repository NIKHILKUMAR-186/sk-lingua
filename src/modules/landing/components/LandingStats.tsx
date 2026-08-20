import { useQuery } from "@tanstack/react-query";
import { Reveal } from "./reveal";
import { supabase } from "@/integrations/supabase/client";

interface LandingStatsData {
  totalMentors: number;
  totalSessions: number;
  totalStudents: number;
}

export function LandingStats() {
  const { data: stats, isLoading } = useQuery<LandingStatsData>({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const [{ count: mentorsCount }, { count: sessionsCount }, { count: studentsCount }] =
        await Promise.all([
          supabase
            .from("mentor_profiles")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true),
          supabase
            .from("sessions")
            .select("*", { count: "exact", head: true })
            .neq("status", "cancelled")
            .neq("status", "rejected"),
          supabase
            .from("user_roles")
            .select("*", { count: "exact", head: true })
            .eq("role", "student"),
        ]);

      return {
        totalMentors: mentorsCount ?? 0,
        totalSessions: sessionsCount ?? 0,
        totalStudents: studentsCount ?? 0,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const items = [
    { label: "Active mentors", get value() { return stats?.totalMentors ?? 0; } },
    { label: "Sessions completed", get value() { return stats?.totalSessions ?? 0; } },
    { label: "Active learners", get value() { return stats?.totalStudents ?? 0; } },
  ];

  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "#f8f9fa" }}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid gap-12 sm:grid-cols-3">
          {items.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 100}>
              <div className="landing-stat-card text-center">
                {isLoading ? (
                  <>
                    <div className="mx-auto h-16 w-32 rounded bg-bone animate-pulse" />
                    <div className="mx-auto mt-3 h-4 w-24 rounded bg-bone animate-pulse" />
                    <div className="mx-auto mt-2 h-3 w-32 rounded bg-bone animate-pulse" />
                  </>
                ) : (
                  <>
                    <div className="landing-stat-number">{stat.value.toLocaleString()}</div>
                    <div
                      className="text-base font-semibold mt-2"
                      style={{
                        fontFamily: "var(--landing-font-plus-jakarta-sans)",
                        color: "#090c1d",
                      }}
                    >
                      {stat.label}
                    </div>
                    <div
                      className="landing-stat-caption text-center"
                    >
                      Real data from our platform
                    </div>
                  </>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
