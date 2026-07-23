import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Video } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student/sessions")({
  component: StudentSessions,
});

function StudentSessions() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const { data: sessions = [] } = useQuery({
    queryKey: ["student-sessions", auth?.user?.id], enabled: !!auth?.user,
    queryFn: async () => (await supabase.from("sessions").select("*").eq("student_id", auth!.user!.id).order("scheduled_time", { ascending: false })).data ?? [],
  });

  async function cancel(id: string) {
    const { error } = await supabase.from("sessions").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Cancelled"); qc.invalidateQueries(); }
  }

  const upcoming = sessions.filter((s) => ["pending", "accepted"].includes(s.status));
  const past = sessions.filter((s) => ["completed", "rejected", "cancelled"].includes(s.status));

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-display">My sessions</h1>
        <Tabs defaultValue="upcoming">
          <TabsList><TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger><TabsTrigger value="past">Past ({past.length})</TabsTrigger></TabsList>
          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {upcoming.length === 0 ? <Empty /> : upcoming.map((s) => (
              <SessionRow key={s.id} s={s} onCancel={cancel} />
            ))}
          </TabsContent>
          <TabsContent value="past" className="mt-4 space-y-3">
            {past.length === 0 ? <Empty /> : past.map((s) => <SessionRow key={s.id} s={s} />)}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Empty() { return <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nothing here yet.</CardContent></Card>; }

function SessionRow({ s, onCancel }: { s: { id: string; scheduled_time: string; duration_mins: number; status: string; video_call_link: string | null; notes: string | null }; onCancel?: (id: string) => void }) {
  const badgeVariant: Record<string, "default"|"secondary"|"destructive"|"outline"> = {
    pending: "secondary", accepted: "default", completed: "outline", rejected: "destructive", cancelled: "outline",
  };
  return (
    <Card><CardContent className="flex items-center justify-between p-4">
      <div>
        <div className="font-medium">{new Date(s.scheduled_time).toLocaleString()}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={badgeVariant[s.status] ?? "secondary"}>{s.status}</Badge>
          <span>{s.duration_mins} min</span>
        </div>
      </div>
      <div className="flex gap-2">
        {s.status === "accepted" && (
          <Button size="sm" asChild><a href={s.video_call_link ?? "#"} target="_blank" rel="noreferrer"><Video className="mr-1 h-4 w-4" />Join</a></Button>
        )}
        {onCancel && s.status !== "completed" && s.status !== "cancelled" && (
          <Button size="sm" variant="outline" onClick={() => onCancel(s.id)}>Cancel</Button>
        )}
      </div>
    </CardContent></Card>
  );
}
