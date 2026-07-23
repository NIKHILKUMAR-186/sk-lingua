import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: Notifications,
});

function Notifications() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications", auth?.user?.id], enabled: !!auth?.user,
    queryFn: async () => (await supabase.from("notifications").select("*").eq("user_id", auth!.user!.id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  async function markAll() {
    if (!auth?.user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", auth.user.id).eq("read", false);
    qc.invalidateQueries();
  }
  const variant = auth?.role === "mentor" ? "mentor" : "student";
  return (
    <AppShell variant={variant}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display">Notifications</h1>
          <Button variant="outline" size="sm" onClick={markAll}><CheckCheck className="mr-1 h-4 w-4" />Mark all read</Button>
        </div>
        {items.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground"><Bell className="mx-auto mb-2 h-6 w-6" />You're all caught up.</CardContent></Card>
        ) : items.map(n => (
          <Card key={n.id} className={n.read ? "opacity-70" : ""}><CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-muted" : "bg-primary"}`} />
              <div className="flex-1"><div className="font-medium">{n.title}</div>{n.body && <div className="mt-0.5 text-sm text-muted-foreground">{n.body}</div>}<div className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div></div>
            </div>
          </CardContent></Card>
        ))}
      </div>
    </AppShell>
  );
}
