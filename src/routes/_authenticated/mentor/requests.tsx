import { createFileRoute, Link } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/mentor/page-header";
import { RequestCard } from "@/components/mentor/request-card";
import { MentorEmptyStateLegacy as MentorEmptyState } from "@/components/mentor/mentor-empty-state";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Clock3,
  Languages,
  User,
  BookOpen,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useMentorSessionRequests, useRespondAssignment } from "@/hooks/use-session-requests";
import { parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/mentor/requests")({
  component: MentorRequests,
});

function MentorRequests() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const mentorId = auth?.user?.id;

  const { data: requests = [], isLoading } = useMentorSessionRequests(mentorId);
  const respondMutation = useRespondAssignment();

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
    <MentorLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title="Incoming Requests"
          description="Review and respond to session requests assigned to you."
        />

        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-border/60 p-4"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-48 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <MentorEmptyState
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="No incoming requests"
              description="When a student requests a session, you'll see it here."
            />
          ) : (
            requests.map((r: any) => {
              const student = studentMap.get(r.student_id);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <RequestCard
                    studentName={student?.full_name || "Student"}
                    studentAvatar={student?.avatar_url}
                    topic={r.topic || "Session request"}
                    date={format(parseISO(r.scheduled_time), "MMM d, yyyy")}
                    time={format(parseISO(r.scheduled_time), "h:mm a")}
                    duration={r.duration_mins}
                    message={r.notes}
                    status="pending"
                    onAccept={() => respond(r.id, "accept")}
                    onReject={() => respond(r.id, "reject")}
                  />
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </MentorLayout>
  );
}
