import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mentor/calendar")({
  component: MentorCalendar,
});

function MentorCalendar() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery({
    queryKey: ["mentor-requests", auth?.user?.id], enabled: !!auth?.user,
    queryFn: async () => {
      const { data } = await supabase.from("sessions").select("*").eq("mentor_id", auth!.user!.id).order("scheduled_time");
      if (!data?.length) return [];
      const ids = [...new Set(data.map(d => d.student_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      const byId = new Map((profs ?? []).map(p => [p.id, p]));
      return data.map(d => ({ ...d, student: byId.get(d.student_id) }));
    },
  });

  async function update(id: string, status: "accepted" | "rejected" | "completed") {
    const patch: { status: typeof status; video_call_link?: string } = { status };
    if (status === "accepted") patch.video_call_link = `https://meet.jit.si/lingua-${id.slice(0, 8)}`;
    const { error } = await supabase.from("sessions").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); qc.invalidateQueries(); }
  }

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-display">Calendar & requests</h1>
        {requests.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No requests yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <Card key={r.id}><CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">{r.student?.avatar_url && <img src={r.student.avatar_url} alt="" className="h-full w-full object-cover" />}</div>
                  <div>
                    <div className="font-medium">{r.student?.full_name ?? "Student"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.scheduled_time).toLocaleString()} • {r.duration_mins} min</div>
                    {r.student_message && <div className="mt-1 text-xs italic text-muted-foreground">"{r.student_message}"</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "accepted" ? "default" : "secondary"}>{r.status}</Badge>
                  {r.status === "pending" && (<>
                    <Button size="sm" onClick={() => update(r.id, "accepted")}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => update(r.id, "rejected")}>Reject</Button>
                  </>)}
                  {r.status === "accepted" && <Button size="sm" variant="outline" onClick={() => update(r.id, "completed")}>Mark complete</Button>}
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
