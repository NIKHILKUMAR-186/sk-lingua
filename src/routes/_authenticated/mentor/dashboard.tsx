import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Calendar,
  Video,
  Star,
  DollarSign,
  ArrowRight,
  Users,
  FileText,
  Clock3,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { getProfileCompletionPercent } from "@/lib/profile";
import React, { Suspense } from "react";
const MentorAnalyticsDashboard = React.lazy(() =>
  import("@/components/mentor-analytics-dashboard").then((mod) => ({
    default: mod.MentorAnalyticsDashboard,
  })),
);
import { EmptyState } from "@/components/empty-state";
import { StatCardSkeleton, ListSkeleton, CardSkeleton } from "@/components/skeleton-loader";

export const Route = createFileRoute("/_authenticated/mentor/dashboard")({
  component: MentorDashboard,
});

function MentorDashboard() {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const uid = auth?.user?.id;

  // Redirect mentor_pending users to the waiting dashboard
  useEffect(() => {
    if (auth && (auth.roles ?? []).includes("mentor_pending")) {
      navigate({ to: "/mentor/pending" });
    }
  }, [auth, navigate]);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["mentor-sessions", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("sessions")
          .select("*")
          .eq("mentor_id", uid!)
          .order("scheduled_time", { ascending: false })
      ).data ?? [],
  });

  const { data: mp, isLoading: mpLoading } = useQuery({
    queryKey: ["mp", uid],
    enabled: !!uid,
    queryFn: async () =>
      (await supabase.from("mentor_profiles").select("*").eq("user_id", uid!).maybeSingle()).data,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["mentor-reviews", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("reviews")
          .select("*")
          .eq("mentor_id", uid!)
          .order("created_at", { ascending: false })
          .limit(3)
      ).data ?? [],
  });

  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ["mentor-dashboard-resources", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("resources")
          .select("*")
          .eq("mentor_id", uid!)
          .order("created_at", { ascending: false })
          .limit(4)
      ).data ?? [],
  });

  const pending = sessions.filter((s) => s.status === "pending");
  const upcoming = sessions.filter(
    (s) => s.status === "accepted" || s.status === "confirmed",
  );
  const completed = sessions.filter((s) => s.status === "completed");
  const today = new Date();
  const todaySessions = sessions.filter((s) => {
    const scheduled = new Date(s.scheduled_time);
    return (
      scheduled.getDate() === today.getDate() &&
      scheduled.getMonth() === today.getMonth() &&
      scheduled.getFullYear() === today.getFullYear()
    );
  });
  const studentsTaught = new Set(completed.map((s) => s.student_id).filter(Boolean)).size;
  const homeworkShared = resources.filter((r) => r.session_id).length;
  const earnings = completed.length * Number(mp?.hourly_rate ?? 0) * 0.9;

  const isLoading =
    sessionsLoading || mpLoading || reviewsLoading || resourcesLoading;

  // Guard: only approved mentors can access the dashboard
  const isApprovedMentor = (auth?.roles ?? []).includes("mentor");
  if (!isApprovedMentor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-display">Access Restricted</h1>
          <p className="text-sm text-muted-foreground">
            The mentor dashboard is only available to approved mentors. If you've applied to become
            a mentor, please check your application status.
          </p>
          <Button asChild>
            <Link to="/mentor/application">Check Application Status</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <MentorLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display">
            Hi{auth?.profile?.full_name ? `, ${auth.profile.full_name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-muted-foreground">Here's what's happening.</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          className="grid gap-4 md:grid-cols-5"
        >
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              >
                <Stat icon={Calendar} label="Today's sessions" value={todaySessions.length} />
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              >
                <Stat icon={Clock3} label="Pending" value={pending.length} />
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              >
                <Stat icon={Star} label="Rating" value={Number(mp?.rating_avg ?? 0).toFixed(1)} />
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              >
                <Stat icon={DollarSign} label="Earnings" value={`$${earnings.toFixed(0)}`} />
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              >
                <Stat icon={TrendingUp} label="Students" value={studentsTaught} />
              </motion.div>
            </>
          )}
        </motion.div>

        {/* Main grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pending requests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pending requests</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/mentor/calendar">
                  Review all <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ListSkeleton items={3} />
              ) : pending.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No pending requests"
                  description="You'll see booking requests here."
                />
              ) : (
                <div className="space-y-2">
                  {pending.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {new Date(s.scheduled_time).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">{s.duration_mins} min</div>
                      </div>
                      <Button size="sm" asChild>
                        <Link to="/mentor/calendar">Review</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Second grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent reviews */}
          <Card>
            <CardHeader>
              <CardTitle>Recent reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <ListSkeleton items={3} />
              ) : reviews.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No reviews yet.
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">★ {review.rating}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment ? (
                      <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent resources */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent resources</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/mentor/resources">
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <ListSkeleton items={3} />
              ) : resources.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No resources shared yet.
                </div>
              ) : (
                resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">{resource.title}</div>
                      <div className="text-xs text-muted-foreground">{resource.visibility}</div>
                    </div>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming sessions</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/mentor/sessions">
                See all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListSkeleton items={3} />
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={Video}
                title="No upcoming sessions"
                description="Once a student books, you'll see it here."
              />
            ) : (
              <div className="space-y-2">
                {upcoming.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {new Date(s.scheduled_time).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">{s.duration_mins} min</div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/mentor/session/$id" params={{ id: s.id }}>
                        Open
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MentorLayout>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="transition hover:shadow-soft">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-display">{value}</div>
        </div>
        <Icon className="h-8 w-8 text-mentor" />
      </CardContent>
    </Card>
  );
}
