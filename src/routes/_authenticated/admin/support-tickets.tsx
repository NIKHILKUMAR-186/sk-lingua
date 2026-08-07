import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { Search, Eye, MessageSquare, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/support-tickets")({
  component: AdminSupportTickets,
});

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_user", label: "Waiting for User" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

function AdminSupportTickets() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const client = supabase as any;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-support-tickets", statusFilter, search],
    enabled: !!auth?.user && (auth.roles ?? []).includes("admin"),
    queryFn: async () => {
      let query = client.from("support_tickets").select("*", { count: "exact" });
      if (statusFilter) query = query.eq("status", statusFilter);
      if (search) {
        query = query.or(`ticket_number.ilike.%${search}%,subject.ilike.%${search}%,description.ilike.%${search}%`);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: replies = [] } = useQuery({
    queryKey: ["ticket-replies", selectedTicket?.id],
    enabled: !!selectedTicket?.id,
    queryFn: async () => {
      const { data, error } = await client
        .from("ticket_replies")
        .select("*")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
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

  async function updateStatus(ticketId: string, newStatus: string) {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "resolved") updateData.resolved_at = new Date().toISOString();
      if (newStatus === "closed") updateData.closed_at = new Date().toISOString();

      const { error } = await client.from("support_tickets").update(updateData).eq("id", ticketId);
      if (error) throw error;

      await client.from("audit_logs").insert([
        {
          actor_id: auth.user.id,
          scope: "support_tickets",
          action: "update_status",
          target_entity: "support_ticket",
          target_id: ticketId,
          description: `Ticket status changed to ${newStatus}`,
        },
      ]);

      toast.success("Ticket updated");
      refetch();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (err: any) {
      toast.error(err?.message ?? String(err));
    }
  }

  async function sendReply() {
    if (!replyText.trim() || !selectedTicket) return;
    setSubmitting(true);
    try {
      const { error } = await client.from("ticket_replies").insert([
        {
          ticket_id: selectedTicket.id,
          user_id: auth.user.id,
          message: replyText.trim(),
          is_internal: false,
        },
      ]);
      if (error) throw error;

      await client.from("audit_logs").insert([
        {
          actor_id: auth.user.id,
          scope: "support_tickets",
          action: "reply",
          target_entity: "support_ticket",
          target_id: selectedTicket.id,
          description: `Reply sent to ticket ${selectedTicket.ticket_number}`,
        },
      ]);

      setReplyText("");
      toast.success("Reply sent");
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function addInternalNote() {
    if (!internalNote.trim() || !selectedTicket) return;
    setSubmitting(true);
    try {
      const { error } = await client.from("ticket_replies").insert([
        {
          ticket_id: selectedTicket.id,
          user_id: auth.user.id,
          message: internalNote.trim(),
          is_internal: true,
        },
      ]);
      if (error) throw error;

      await client.from("support_tickets").update({
        internal_notes: (selectedTicket.internal_notes || "") + `\n[${new Date().toLocaleString()}] ${internalNote.trim()}`,
      }).eq("id", selectedTicket.id);

      setInternalNote("");
      toast.success("Internal note added");
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "destructive",
      in_progress: "default",
      waiting_for_user: "secondary",
      resolved: "outline",
      closed: "outline",
    };
    return <Badge variant={variants[status] ?? "secondary"}>{status.replace(/_/g, " ")}</Badge>;
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">Manage and respond to support tickets from students and mentors.</p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading tickets…</div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No tickets found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket: any) => (
              <Card key={ticket.id}>
                <CardContent className="flex items-start justify-between p-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</span>
                      {getStatusBadge(ticket.status)}
                      <Badge variant="outline" className="text-xs">{ticket.priority}</Badge>
                    </div>
                    <div className="font-medium">{ticket.subject}</div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                    <div className="text-xs text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleString()} • Category: {ticket.category}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedTicket(ticket)}>
                    <Eye className="mr-1 h-3 w-3" /> View
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedTicket?.ticket_number} — {selectedTicket?.subject}</span>
                <Button size="icon" variant="ghost" onClick={() => setSelectedTicket(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(selectedTicket.status)}
                  <Badge variant="outline">{selectedTicket.priority}</Badge>
                  <Badge variant="outline">{selectedTicket.category}</Badge>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Description</div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {selectedTicket.internal_notes && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Internal Notes</div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTicket.internal_notes}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-sm font-medium">Update Status</div>
                  <Select value={selectedTicket.status} onValueChange={(v) => updateStatus(selectedTicket.id, v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Replies</div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {replies.length === 0 && <p className="text-sm text-muted-foreground">No replies yet.</p>}
                    {replies.map((reply: any) => (
                      <div key={reply.id} className={`rounded-lg border p-3 ${reply.is_internal ? "bg-yellow-50" : "bg-muted/20"}`}>
                        <div className="text-xs text-muted-foreground">
                          {reply.is_internal ? "Internal Note" : "Reply"} • {new Date(reply.created_at).toLocaleString()}
                        </div>
                        <p className="text-sm mt-1">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Send Reply</Label>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                  />
                  <Button size="sm" onClick={sendReply} disabled={submitting || !replyText.trim()}>
                    <MessageSquare className="mr-1 h-3 w-3" /> Send Reply
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Internal Note (admin only)</Label>
                  <Textarea
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="Add internal note..."
                    rows={2}
                  />
                  <Button size="sm" variant="outline" onClick={addInternalNote} disabled={submitting || !internalNote.trim()}>
                    Add Internal Note
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
