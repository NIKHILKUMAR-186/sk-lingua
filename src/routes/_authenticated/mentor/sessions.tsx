import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mentor/sessions")({
  component: MentorSessions,
});

function MentorSessions() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const { data: sessions = [] } = useQuery({
    queryKey: ["mentor-all-sessions", auth?.user?.id], enabled: !!auth?.user,
    queryFn: async () => (await supabase.from("sessions").select("*").eq("mentor_id", auth!.user!.id).order("scheduled_time", { ascending: false })).data ?? [],
  });
  async function complete(id: string) {
    const { error } = await supabase.from("sessions").update({ status: "completed" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Marked complete"); qc.invalidateQueries(); }
  }
  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-display">Sessions</h1>
        {sessions.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No sessions yet.</CardContent></Card>
        ) : sessions.map(s => (
          <Card key={s.id}><CardContent className="flex items-center justify-between p-4">
            <div><div className="text-sm font-medium">{new Date(s.scheduled_time).toLocaleString()}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Badge variant="secondary">{s.status}</Badge><span>{s.duration_mins} min</span></div>
            </div>
            <div className="flex gap-2">
              {s.status === "accepted" && s.video_call_link && <Button size="sm" asChild><a href={s.video_call_link} target="_blank" rel="noreferrer"><Video className="mr-1 h-4 w-4" />Join</a></Button>}
              {s.status === "accepted" && <Button size="sm" variant="outline" onClick={() => complete(s.id)}>Mark complete</Button>}
            </div>
          </CardContent></Card>
        ))}
      </div>
    </AppShell>
  );
}
