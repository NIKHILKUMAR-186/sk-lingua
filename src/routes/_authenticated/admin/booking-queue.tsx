import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";
import { Search, RefreshCw, Inbox, Clock, History } from "lucide-react";
import { useAdminSessionRequests, useAssignmentHistory } from "@/hooks/use-session-requests";

export const Route = createFileRoute("/_authenticated/admin/booking-queue")({
  component: AdminBookingQueue,
});

const STATUS_TABS = [
  { value: "pending_admin_assignment", label: "Pending" },
  { value: "pending_mentor_response", label: "Assigned" },
  { value: "confirmed", label: "Accepted" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "unassigned", label: "Unassigned" },
] as const;

function AdminBookingQueue() {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useAdminSessionRequests();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("pending_admin_assignment");
  const [assigning, setAssigning] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch mentors for assignment
  const { data: mentors = [] } = useQuery({
    queryKey: ["admin-available-mentors"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("mentor_profiles")
        .select("user_id, headline, languages_taught")
        .eq("is_active", true);
      const ids = (data ?? []).map((m: any) => m.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", ids);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((m: any) => ({
        ...m,
        profile: profileMap.get(m.user_id) ?? null,
      }));
    },
  });

  // Fetch student profiles for all requests
  const studentIds = [...new Set(requests.map((r: any) => r.student_id).filter(Boolean))];
  const { data: students = [] } = useQuery({
    queryKey: ["admin-queue-students", studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("*").in("id", studentIds);
      return data ?? [];
    },
  });
  const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));

  // Fetch mentor profiles for assigned mentors
  const mentorIds = [...new Set(requests.map((r: any) => r.assigned_mentor).filter(Boolean))];
  const { data: assignedMentors = [] } = useQuery({
    queryKey: ["admin-queue-mentors", mentorIds.join(",")],
    enabled: mentorIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", mentorIds);
      return data ?? [];
    },
  });
  const assignedMentorMap = new Map<string, any>(assignedMentors.map((m: any) => [m.id, m]));

  // Filter requests by tab and search
  const filtered = requests.filter((r: any) => {
    const matchesTab = r.status === activeTab;
    if (!matchesTab) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const student = studentMap.get(r.student_id);
    const mentor = assignedMentorMap.get(r.assigned_mentor);
    return (
      (r.topic ?? "").toLowerCase().includes(q) ||
      (r.language ?? "").toLowerCase().includes(q) ||
      (student?.full_name ?? "").toLowerCase().includes(q) ||
      (student?.email ?? "").toLowerCase().includes(q) ||
      (mentor?.full_name ?? "").toLowerCase().includes(q) ||
      (mentor?.email ?? "").toLowerCase().includes(q)
    );
  });

  async function assign(reqId: string, mentorId: string) {
    if (!mentorId) return toast.error("Select a mentor first");
    setAssigning(true);
    try {
      const res = await fetch("/api/admin/assign-mentor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request_id: reqId, mentor_id: mentorId, assigned_by: "admin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "assign failed");
      toast.success("Mentor assigned");
      setSelectedMentorId("");
      setExpandedId(null);
      qc.invalidateQueries({ queryKey: ["admin-session-requests"] });
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setAssigning(false);
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending_admin_assignment: "secondary",
      pending_mentor_response: "default",
      confirmed: "default",
      completed: "outline",
      cancelled: "destructive",
      unassigned: "outline",
    };
    return <Badge variant={variants[status] ?? "secondary"}>{status}</Badge>;
  }

  return (
    <AppShell variant="admin">
      <div className="mx-auto max-w-6xl space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display">Booking Queue</h1>
            <p className="text-sm text-muted-foreground">
              Review, assign, and manage session requests from students.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-session-requests"] })}
          >
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student, mentor, topic, or language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                <span className="ml-1 rounded-full bg-muted px-1.5 text-xs">
                  {requests.filter((r: any) => r.status === tab.value).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-3">
            {isLoading ? (
              <div>Loading…</div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No requests in this category.</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((r: any) => {
                const student = studentMap.get(r.student_id);
                const mentor = assignedMentorMap.get(r.assigned_mentor);
                const isExpanded = expandedId === r.id;
                return (
                  <Card key={r.id}>
                    <CardContent className="space-y-4 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{r.topic || "Session request"}</div>
                            {getStatusBadge(r.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(r.scheduled_time).toLocaleString()} • {r.duration_mins} min
                            {r.language ? ` • ${r.language}` : ""}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Student: {student?.full_name || "Unknown"}</span>
                            {mentor ? <span>• Mentor: {mentor.full_name}</span> : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(r.status === "pending_admin_assignment" ||
                            r.status === "unassigned") && (
                            <>
                              <select
                                className="rounded-md border px-2 py-1 text-sm"
                                value={selectedMentorId}
                                onChange={(e) => setSelectedMentorId(e.target.value)}
                              >
                                <option value="">Select mentor...</option>
                                {mentors.map((m: any) => (
                                  <option key={m.user_id} value={m.user_id}>
                                    {m.profile?.full_name || m.user_id}
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                onClick={() => assign(r.id, selectedMentorId)}
                                disabled={assigning || !selectedMentorId}
                              >
                                Assign
                              </Button>
                            </>
                          )}
                          {r.status === "pending_mentor_response" && (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                              <Clock className="h-3.5 w-3.5" /> Awaiting mentor response
                            </span>
                          )}
                          {r.status === "confirmed" && r.session_id && (
                            <Button size="sm" variant="outline" asChild>
                              <Link to="/student/session/$id" params={{ id: r.session_id }}>
                                View Session
                              </Link>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          >
                            <History className="mr-1 h-3.5 w-3.5" />
                            {isExpanded ? "Hide Details" : "Details"}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Student Details</div>
                            <div className="text-sm text-muted-foreground">
                              {student ? (
                                <div className="space-y-1">
                                  <div>{student.full_name}</div>
                                  <div>{student.email}</div>
                                  <div>{student.native_language || "No native language"}</div>
                                  {student.learning_goal ? (
                                    <div>Goal: {student.learning_goal}</div>
                                  ) : null}
                                </div>
                              ) : (
                                <span>Student details unavailable</span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Request Details</div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>Created: {new Date(r.created_at).toLocaleString()}</div>
                              <div>Status: {r.status}</div>
                              {r.notes ? <div>Notes: {r.notes}</div> : null}
                              {r.confirmed_at ? (
                                <div>Confirmed: {new Date(r.confirmed_at).toLocaleString()}</div>
                              ) : null}
                            </div>
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <div className="text-sm font-medium">Assignment History</div>
                            <AssignmentHistory requestId={r.id} />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function AssignmentHistory({ requestId }: { requestId: string }) {
  const { data: history = [], isLoading } = useAssignmentHistory(requestId);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading history…</div>;
  if (history.length === 0)
    return <div className="text-sm text-muted-foreground">No assignment history yet.</div>;

  return (
    <div className="space-y-1">
      {history.map((h: any) => (
        <div
          key={h.id}
          className="flex items-center justify-between rounded-md border bg-background px-3 py-1.5 text-xs"
        >
          <span>
            <Badge
              variant={
                h.status === "accepted"
                  ? "default"
                  : h.status === "rejected" || h.status === "timeout"
                    ? "destructive"
                    : "secondary"
              }
            >
              {h.status}
            </Badge>
          </span>
          <span className="text-muted-foreground">{h.reason || "-"}</span>
          <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
