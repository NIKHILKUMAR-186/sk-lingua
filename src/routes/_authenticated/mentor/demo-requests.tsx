import { createFileRoute } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarClock,
  Clock,
  Languages,
  User,
  BookOpen,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useMentorRespondDemoAssignment } from "@/hooks/use-demo-bookings";

export const Route = createFileRoute("/_authenticated/mentor/demo-requests")({
  component: MentorDemoRequests,
});

function MentorDemoRequests() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const mentorId = auth?.user?.id;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["mentor-demo-requests", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_session_bookings")
        .select("*")
        .eq("mentor_id", mentorId)
        .eq("assignment_status", "pending_mentor")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 15,
  });

  const respondMutation = useMentorRespondDemoAssignment();

  // Fetch student profiles
  const studentIds = [...new Set(requests.map((r: any) => r.user_id).filter(Boolean))];
  const { data: students = [] } = useQuery({
    queryKey: ["mentor-demo-request-students", studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").in("id", studentIds);
      return data ?? [];
    },
  });
  const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));

  async function respond(bookingId: string, action: "accept" | "reject") {
    if (!mentorId) return;
    try {
      await respondMutation.mutateAsync({ bookingId, mentorId, action });
      qc.invalidateQueries({ queryKey: ["mentor-demo-requests", mentorId] });
    } catch (err: any) {
      toast.error(err.message || String(err));
    }
  }

  return (
    <MentorLayout>
      <div className="mx-auto max-w-5xl space-y-6 py-6">
        <div>
          <h1 className="text-3xl font-display">Demo Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review and respond to demo session requests assigned to you.
          </p>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No demo requests at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((r: any) => {
              const student = studentMap.get(r.user_id);
              return (
                <Card key={r.id}>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-lg">Demo Session Request</div>
                          <Badge variant="secondary">Pending Response</Badge>
                        </div>

                        <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Student: {student?.full_name || "Unknown"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4" />
                            <span>{new Date(r.booking_date).toDateString()} at {r.booking_time_start}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{r.duration_mins} minutes</span>
                          </div>
                          {r.language && (
                            <div className="flex items-center gap-2">
                              <Languages className="h-4 w-4" />
                              <span>{r.language}</span>
                            </div>
                          )}
                          {r.learning_goal && (
                            <div className="flex items-center gap-2 md:col-span-2">
                              <BookOpen className="h-4 w-4" />
                              <span>Goal: {r.learning_goal}</span>
                            </div>
                          )}
                          {r.notes && (
                            <div className="flex items-center gap-2 md:col-span-2">
                              <BookOpen className="h-4 w-4" />
                              <span>Notes: {r.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => respond(r.id, "accept")}
                          disabled={respondMutation.isPending}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => respond(r.id, "reject")}
                          disabled={respondMutation.isPending}
                        >
                          <XCircle className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </MentorLayout>
  );
}
