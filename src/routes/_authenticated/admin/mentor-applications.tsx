import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/mentor-applications")({
  component: MentorApplicationsAdmin,
});

function MentorApplicationsAdmin() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const client = (supabase as any);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["admin-mentor-applications"],
    enabled: !!auth?.user && (auth.roles ?? []).includes("admin"),
    queryFn: async () => (await client.from("mentor_applications").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: histories = [] } = useQuery({
    queryKey: ["mentor-application-histories"],
    enabled: !!auth?.user && (auth.roles ?? []).includes("admin"),
    queryFn: async () => (await client.from("mentor_application_status_history").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ["mentor-application-interviews"],
    enabled: !!auth?.user && (auth.roles ?? []).includes("admin"),
    queryFn: async () => (await client.from("mentor_application_interviews").select("*").order("created_at", { ascending: false })).data ?? [],
  });

    async function updateStatus(id: string, status: string) {
    try {
      // if approving, call server admin approve endpoint to handle user creation + role assignment
      if (status === 'approved') {
        const res = await fetch('/api/admin/approve-mentor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: id }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'Approve failed');
        toast.success('Application approved');
      } else {
        await import("@/lib/mentorApplications").then(async (mod) => await mod.updateApplicationStatus(id, status, auth!.user!.id));
        toast.success(`Application ${status}`);
      }
      qc.invalidateQueries({ queryKey: ["admin-mentor-applications"] });
    } catch (err: any) {
      toast.error(err?.message ?? String(err));
    }
  }

  async function scheduleInterviewFor(appId: string) {
    const when = prompt("Interview date/time (ISO8601)");
    if (!when) return;
    const location = prompt('Meeting link or location (optional)') || undefined;
    const notes = prompt('Notes (optional)') || undefined;
    try {
      const res = await fetch('/api/admin/interviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: appId, scheduledTime: when, interviewerId: auth!.user!.id, location, notes }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to schedule interview');
      toast.success('Interview scheduled');
      qc.invalidateQueries({ queryKey: ["admin-mentor-applications"] });
    } catch (err: any) { toast.error(err?.message ?? String(err)); }
  }

  if (!auth?.user) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!(auth.roles ?? []).includes("admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Access denied — admin role required.</p>
      </div>
    );
  }

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-3xl font-display">Mentor applications</h1>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading applications…</div>
        ) : applications.length === 0 ? (
          <div className="text-sm text-muted-foreground">No applications found.</div>
        ) : (
          <div className="space-y-4">
            {applications.map((app: any) => (
              <Card key={app.id}>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>{app.full_name}</CardTitle>
                  <div className="text-sm text-muted-foreground">{new Date(app.created_at).toLocaleString()}</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">{app.email}</div>
                  <div className="text-sm">{app.experience}</div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStatus(app.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(app.id, "rejected")}>Reject</Button>
                    <Button size="sm" variant="ghost" onClick={() => scheduleInterviewFor(app.id)}>Schedule interview</Button>
                    <Button size="sm" variant="secondary" onClick={async () => {
                      try {
                        // Promote applicant: create mentor_profile and add role
                        const { error: mpErr } = await supabase.from("mentor_profiles").upsert({ user_id: app.user_id, headline: app.headline ?? null, bio: app.experience ?? null, is_active: true }, { onConflict: "user_id" });
                        if (mpErr) throw mpErr;
                        const { error: roleErr } = await supabase.from("user_roles").upsert([{ user_id: app.user_id, role: "mentor" }], { onConflict: "user_id,role" });
                        if (roleErr) throw roleErr;
                        toast.success("Applicant promoted to mentor");
                        qc.invalidateQueries({ queryKey: ["admin-mentor-applications"] });
                      } catch (err: any) { toast.error(err?.message ?? String(err)); }
                    }}>Promote</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      const note = prompt('Add admin note:');
                      if (!note) return;
                      try {
                        const res = await fetch('/api/admin/add-admin-note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: app.id, note, actorId: auth!.user!.id }) });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data?.error ?? 'Failed to add note');
                        toast.success('Note added');
                        qc.invalidateQueries({ queryKey: ['admin-mentor-applications'] });
                      } catch (err: any) { toast.error(err?.message ?? String(err)); }
                    }}>Add note</Button>
                    <Button size="sm" variant="secondary" onClick={async () => {
                      // Generate and show temp password
                      if (!app.user_id) { toast.error('No user associated with application'); return; }
                      try {
                        const res = await fetch('/api/admin/generate-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: app.user_id }) });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data?.error ?? 'Failed to generate password');
                          alert(`Temporary password for user ${app.email}: ${data.tempPassword}`);
                      } catch (err: any) { toast.error(err?.message ?? String(err)); }
                    }}>Generate password</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      // toggle active state
                      if (!app.user_id) { toast.error('No user associated'); return; }
                      try {
                        const action = app.is_active ? 'suspend' : 'activate';
                        const res = await fetch('/api/admin/toggle-mentor-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: app.user_id, action }) });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data?.error ?? 'Failed');
                        toast.success(app.is_active ? 'Mentor suspended' : 'Mentor activated');
                        qc.invalidateQueries({ queryKey: ['admin-mentor-applications'] });
                      } catch (err: any) { toast.error(err?.message ?? String(err)); }
                    }}>{app.is_active ? 'Suspend' : 'Activate'}</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try {
                        if (!app.email) { toast.error('No email available'); return; }
                        const { error } = await supabase.auth.resetPasswordForEmail(app.email);
                        if (error) throw error;
                        toast.success('Password reset email sent');
                      } catch (err: any) { toast.error(err?.message ?? String(err)); }
                    }}>Send reset email</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      try {
                        const { error } = await supabase.from('mentor_profiles').update({ is_active: !(app.is_active ?? false) }).eq('user_id', app.user_id);
                        if (error) throw error;
                        toast.success(app.is_active ? 'Mentor suspended' : 'Mentor activated');
                        qc.invalidateQueries({ queryKey: ["admin-mentor-applications"] });
                      } catch (err: any) { toast.error(err?.message ?? String(err)); }
                    }}>{app.is_active ? 'Suspend' : 'Activate'}</Button>
                  </div>
                  {(app.resume_path || app.resume_url) ? (
                    <div className="mt-2">
                      <button
                        className="text-primary underline"
                        onClick={async () => {
                          try {
                            const key = app.resume_path ?? app.resume_url;
                            const { data: sessionData } = await supabase.auth.getSession();
                            const token = sessionData?.session?.access_token ?? null;
                            const res = await fetch(`/api/signed-url?key=${encodeURIComponent(key)}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data?.error ?? 'Failed to fetch signed URL');
                            const signed = data?.signedUrl ?? data?.signed_url ?? data?.signedurl ?? data?.signedUrl;
                            if (!signed) throw new Error('Signed URL missing in response');
                            window.open(signed, '_blank');
                          } catch (err: any) {
                            toast.error(err?.message ?? String(err));
                          }
                        }}
                      >
                        Open resume
                      </button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
