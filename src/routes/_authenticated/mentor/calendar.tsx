import { createFileRoute, Link } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Video,
  Clock,
  MessageSquare,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/skeleton-loader";

export const Route = createFileRoute("/_authenticated/mentor/calendar")({
  component: MentorCalendar,
});

function MentorCalendar() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["mentor-requests", auth?.user?.id],
    enabled: !!auth?.user,
    queryFn: async () => {
      const uid = auth!.user!.id;
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("mentor_id", uid)
        .order("scheduled_time");
      if (!data?.length) return [];
      const ids = [...new Set(data.map((d) => d.student_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));

      // Also fetch gig names
      const gigIds: string[] = [];
      data.forEach((d) => {
        if (d.gig_id) gigIds.push(d.gig_id);
      });
      const { data: gigs } = await supabase.from("gigs").select("id, title").in("id", gigIds);
      const gigMap = new Map((gigs ?? []).map((g) => [g.id, g]));

      return data.map((d) => ({
        ...d,
        student: byId.get(d.student_id),
        gig: d.gig_id ? gigMap.get(d.gig_id) : null,
      }));
    },
  });

  const pending = requests.filter((r) => r.status === "pending");
  const upcoming = requests.filter((r) => r.status === "accepted");
  const past = requests.filter((r) => ["completed", "rejected", "cancelled"].includes(r.status));

  async function updateStatus(id: string, status: "accepted" | "rejected" | "completed") {
    const patch: any = { status };
    if (status === "accepted")
      patch.video_call_link = `https://meet.jit.si/lingua-${id.slice(0, 8)}`;
    const { error } = await supabase.from("sessions").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(
        status === "accepted"
          ? "Booking accepted"
          : status === "rejected"
            ? "Booking rejected"
            : "Marked complete",
      );
      qc.invalidateQueries();
    }
  }

  return (
    <MentorLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display">Calendar & requests</h1>
          <p className="text-muted-foreground">Manage your bookings and availability.</p>
        </motion.div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {isLoading ? (
              <ListSkeleton items={3} />
            ) : pending.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No pending requests"
                description="When a student books a session, you'll see it here."
              />
            ) : (
              pending.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium">{r.student?.full_name ?? "Student"}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {new Date(r.scheduled_time).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {r.duration_mins} min
                              </span>
                              {r.gig && (
                                <Badge variant="outline" className="text-[10px]">
                                  {r.gig.title}
                                </Badge>
                              )}
                            </div>
                            {r.student_message && (
                              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/50 p-2">
                                <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground italic">
                                  "{r.student_message}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="sm" onClick={() => updateStatus(r.id, "accepted")}>
                            <CheckCircle2 className="mr-1 h-4 w-4" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(r.id, "rejected")}
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {isLoading ? (
              <ListSkeleton items={3} />
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={Video}
                title="No upcoming sessions"
                description="Accepted sessions will appear here."
              />
            ) : (
              upcoming.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium">{r.student?.full_name ?? "Student"}</div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{new Date(r.scheduled_time).toLocaleString()}</span>
                              <span>• {r.duration_mins} min</span>
                              {r.gig && (
                                <Badge variant="outline" className="text-[10px]">
                                  {r.gig.title}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {r.video_call_link && (
                            <Button size="sm" asChild>
                              <a href={r.video_call_link} target="_blank" rel="noreferrer">
                                <Video className="mr-1 h-4 w-4" /> Join
                              </a>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(r.id, "completed")}
                          >
                            Mark complete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {isLoading ? (
              <ListSkeleton items={3} />
            ) : past.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No past sessions"
                description="Completed and cancelled sessions appear here."
              />
            ) : (
              past.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.student?.full_name ?? "Student"}</span>
                          <Badge variant={r.status === "completed" ? "outline" : "secondary"}>
                            {r.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.scheduled_time).toLocaleString()} • {r.duration_mins} min
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MentorLayout>
  );
}