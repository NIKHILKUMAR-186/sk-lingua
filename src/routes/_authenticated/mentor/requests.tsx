import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
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
} from "lucide-react";
import { useMentorSessionRequests, useRespondAssignment } from "@/hooks/use-session-requests";

export const Route = createFileRoute("/_authenticated/mentor/requests")({
  component: MentorRequests,
});

function MentorRequests() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const mentorId = auth?.user?.id;

  const { data: requests = [], isLoading } = useMentorSessionRequests(mentorId);
  const respondMutation = useRespondAssignment();

  // Fetch student profiles for the requests
  const studentIds = [...new Set(requests.map((r: any) => r.student_id).filter(Boolean))];
  const { data: students = [] } = useQuery({
    queryKey: ["mentor-request-students", studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("*").in("id", studentIds);
      return data ?? [];
    },
  });
  const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));

  async function respond(reqId: string, action: "accept" | "reject") {
    if (!mentorId) return;
    try {
      await respondMutation.mutateAsync({ request_id: reqId, mentor_id: mentorId, action });
      toast.success(action === "accept" ? "Session accepted!" : "Request rejected");
      qc.invalidateQueries({ queryKey: ["mentor-requests", mentorId] });
      qc.invalidateQueries({ queryKey: ["mentor-sessions", mentorId] });
    } catch (err: any) {
      toast.error(err.message || String(err));
    }
  }

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-5xl space-y-6 py-6">
        <div>
          <h1 className="text-3xl font-display">Incoming Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review and respond to session requests assigned to you.
          </p>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div>Loading…</div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No incoming requests at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((r: any) => {
              const student = studentMap.get(r.student_id);
              return (
                <Card key={r.id}>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-lg">{r.topic || "Session request"}</div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>

                        <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4" />
                            <span>{new Date(r.scheduled_time).toLocaleString()}</span>
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
                          {student && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Student: {student.full_name || "Unknown"}</span>
                            </div>
                          )}
                          {r.notes && (
                            <div className="flex items-center gap-2 md:col-span-2">
                              <BookOpen className="h-4 w-4" />
                              <span>{r.notes}</span>
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
    </AppShell>
  );
}
