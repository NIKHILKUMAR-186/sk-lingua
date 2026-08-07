import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Send, Plus, Eye, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/notification-broadcasts")({
  component: AdminNotificationBroadcasts,
});

interface BroadcastForm {
  title: string;
  body: string;
  link: string;
  category: string;
  kind: string;
  priority: string;
  target_type: string;
  target_role: string;
  target_state: string;
  target_language: string;
  target_plan_id: string;
  target_user_ids: string[];
  expires_at: string;
}

const EMPTY_FORM: BroadcastForm = {
  title: "",
  body: "",
  link: "",
  category: "general",
  kind: "broadcast",
  priority: "normal",
  target_type: "all",
  target_role: "",
  target_state: "",
  target_language: "",
  target_plan_id: "",
  target_user_ids: [],
  expires_at: "",
};

function AdminNotificationBroadcasts() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const client = supabase as any;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BroadcastForm>(EMPTY_FORM);
  const [sending, setSending] = useState(false);

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ["admin-broadcasts"],
    enabled: !!auth?.user && (auth.roles ?? []).includes("admin"),
    queryFn: async () =>
      (
        await client
          .from("notification_broadcasts")
          .select("*")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data } = await client.from("subscription_plans").select("*").eq("is_active", true);
      return data ?? [];
    },
  });

  if (!auth?.user)
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!(auth.roles ?? []).includes("admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Access denied — admin role required.</p>
      </div>
    );
  }

  async function sendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and message are required");
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          actor_id: auth.user.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || "Failed to send broadcast");
      toast.success(`Broadcast sent to ${json.recipients} users`);
      setShowForm(false);
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
    } catch (err: any) {
      toast.error(err?.message ?? String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display">Notification Broadcast Center</h1>
            <p className="text-sm text-muted-foreground">
              Send notifications to users by role, state, language, or subscription plan.
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-4 w-4" /> New Broadcast
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading broadcasts…</div>
        ) : broadcasts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <Send className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No broadcasts sent yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {broadcasts.map((b: any) => (
              <Card key={b.id}>
                <CardHeader className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{b.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{b.body}</p>
                  </div>
                  <Badge variant={b.status === "sent" ? "default" : "secondary"}>{b.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Target: {b.target_type}</Badge>
                    <Badge variant="outline">Priority: {b.priority}</Badge>
                    <Badge variant="outline">Category: {b.category}</Badge>
                    <Badge variant="outline">Recipients: {b.total_recipients}</Badge>
                    <Badge variant="outline">Read: {b.total_read}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(b.created_at).toLocaleString()}
                    {b.sent_at ? ` • Sent: ${new Date(b.sent_at).toLocaleString()}` : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl my-8">
              <CardHeader>
                <CardTitle>New Broadcast</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={sendBroadcast} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Notification title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Message *</Label>
                    <Textarea
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      placeholder="Notification message"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="promotion">Promotion</SelectItem>
                          <SelectItem value="reminder">Reminder</SelectItem>
                          <SelectItem value="booking">Booking Update</SelectItem>
                          <SelectItem value="subscription">Subscription Update</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Target Audience *</Label>
                    <Select value={form.target_type} onValueChange={(v) => setForm({ ...form, target_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="students">All Students</SelectItem>
                        <SelectItem value="mentors">All Mentors</SelectItem>
                        <SelectItem value="individual">Individual Users</SelectItem>
                        <SelectItem value="state">By State</SelectItem>
                        <SelectItem value="language">By Language</SelectItem>
                        <SelectItem value="plan">By Subscription Plan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.target_type === "plan" && (
                    <div className="space-y-2">
                      <Label>Subscription Plan</Label>
                      <Select value={form.target_plan_id} onValueChange={(v) => setForm({ ...form, target_plan_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {form.target_type === "state" && (
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={form.target_state}
                        onChange={(e) => setForm({ ...form, target_state: e.target.value })}
                        placeholder="e.g. California"
                      />
                    </div>
                  )}

                  {form.target_type === "language" && (
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Input
                        value={form.target_language}
                        onChange={(e) => setForm({ ...form, target_language: e.target.value })}
                        placeholder="e.g. Spanish"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>CTA Link (optional)</Label>
                    <Input
                      value={form.link}
                      onChange={(e) => setForm({ ...form, link: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expiration Date (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={form.expires_at}
                      onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowForm(false);
                        setForm(EMPTY_FORM);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={sending}>
                      {sending ? "Sending…" : "Send Broadcast"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
