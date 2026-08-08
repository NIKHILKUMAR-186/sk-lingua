import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Download,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { APPLICATION_STATUS_LABELS } from "@/lib/mentorApplications";

export const Route = createFileRoute("/_authenticated/admin/mentor-applications/$id")({
  component: AdminMentorApplicationDetail,
});

function AdminMentorApplicationDetail() {
  const { id } = Route.useParams();
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "resume" | "history">("details");

  const { data: application, isLoading } = useQuery({
    queryKey: ["admin-mentor-application", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("mentor_applications")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["admin-application-history", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("mentor_application_status_history")
        .select("*")
        .eq("application_id", id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ["admin-application-interviews", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("mentor_application_interviews")
        .select("*")
        .eq("application_id", id)
        .order("scheduled_time", { ascending: true });
      return data ?? [];
    },
  });

  async function updateStatus(status: string) {
    if (!id) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("mentor_applications")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // ── APPROVAL: Automatically promote mentor_pending → mentor ──
      if (status === "approved" && application?.user_id) {
        // Remove mentor_pending role, add mentor role
        const { error: deletePendingError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", application.user_id)
          .eq("role", "mentor_pending");
        if (deletePendingError) throw deletePendingError;

        const { error: addMentorError } = await supabase
          .from("user_roles")
          .insert([{ user_id: application.user_id, role: "mentor" }]);
        if (addMentorError) throw addMentorError;

        // Activate mentor profile
        const { error: profileError } = await supabase
          .from("mentor_profiles")
          .update({ is_active: true })
          .eq("user_id", application.user_id);
        if (profileError) console.error("Mentor profile activation failed", profileError);

        // Send congratulations notification
        try {
          await (supabase as any).rpc("insert_notification", {
            p_user_id: application.user_id,
            p_title: "Congratulations! 🎉",
            p_body: "Your mentor account has been approved. You can now start teaching!",
            p_category: "general",
            p_kind: "mentor_application",
            p_related_id: id,
            p_link: "/mentor/dashboard",
          });
        } catch (notifErr) {
          console.error("Approval notification failed", notifErr);
        }
      }

      // ── REJECTION: Keep mentor_pending role, send rejection notification ──
      if (status === "rejected" && application?.user_id) {
        // Store rejection reason
        const { error: rejectError } = await supabase
          .from("mentor_applications")
          .update({ admin_notes: rejectionReason || "Application requires changes." })
          .eq("id", id);
        if (rejectError) throw rejectError;

        try {
          await (supabase as any).rpc("insert_notification", {
            p_user_id: application.user_id,
            p_title: "Application requires changes",
            p_body: rejectionReason || "Your mentor application was not approved. Please review and resubmit.",
            p_category: "general",
            p_kind: "mentor_application",
            p_related_id: id,
            p_link: "/mentor/pending",
          });
        } catch (notifErr) {
          console.error("Rejection notification failed", notifErr);
        }
      }

      toast.success(`Application ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-mentor-application", id] });
      qc.invalidateQueries({ queryKey: ["admin-mentor-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-application-history", id] });
    } catch (err: any) {
      toast.error(err?.message ?? `Failed to update status to ${status}`);
    } finally {
      setProcessing(false);
    }
  }

  async function addNote() {
    if (!id || !adminNotes.trim()) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from("mentor_notes").insert([
        {
          application_id: id,
          note: adminNotes.trim(),
          created_by: auth?.user?.id,
        },
      ]);
      if (error) throw error;
      toast.success("Note added");
      setAdminNotes("");
      qc.invalidateQueries({ queryKey: ["admin-application-notes", id] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add note");
    } finally {
      setProcessing(false);
    }
  }

  if (!auth?.user)
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!(auth.roles ?? []).includes("admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Access denied — admin role required.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-muted-foreground">Loading application...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!application) {
    return (
      <AdminLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Application not found</p>
            <Button asChild>
              <Link to="/admin/mentor-applications">Back to applications</Link>
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    submitted: "default",
    under_review: "outline",
    interview_scheduled: "default",
    interview_completed: "outline",
    approved: "default",
    rejected: "destructive",
    active: "default",
    mentor_pending: "secondary",
  };

  const tabs = [
    { id: "details" as const, label: "Details", icon: FileText },
    { id: "resume" as const, label: "Resume", icon: Download },
    { id: "history" as const, label: "History", icon: Clock },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/mentor-applications">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-display">{application.full_name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Application ID: {application.application_id_display || application.id}
            </p>
          </div>
          <Badge variant={statusColors[application.status] || "secondary"} className="text-sm">
            {APPLICATION_STATUS_LABELS[application.status] || application.status}
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                    <p className="text-sm font-medium mt-1">{application.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm font-medium mt-1 flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {application.email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <p className="text-sm font-medium mt-1 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {application.phone_number || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <p className="text-sm font-medium mt-1 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {[application.city, application.state, application.country].filter(Boolean).join(", ") || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Native Language</Label>
                    <p className="text-sm font-medium mt-1">{application.native_language || "Not provided"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Professional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Teaching Languages</Label>
                    <p className="text-sm font-medium mt-1">
                      {(application.teaching_languages ?? []).join(", ") || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Years of Experience</Label>
                    <p className="text-sm font-medium mt-1">{application.years_of_experience || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Current Occupation</Label>
                    <p className="text-sm font-medium mt-1">{application.current_occupation || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Highest Qualification</Label>
                    <p className="text-sm font-medium mt-1">{application.highest_qualification || "Not provided"}</p>
                  </div>
                  {application.teaching_experience && (
                    <div className="md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Teaching Experience</Label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{application.teaching_experience}</p>
                    </div>
                  )}
                  {application.certifications && application.certifications.length > 0 && (
                    <div className="md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Certifications</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {application.certifications.map((cert: string) => (
                          <Badge key={cert} variant="outline">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Availability */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Available Days</Label>
                    <p className="text-sm font-medium mt-1">
                      {(application.available_days ?? []).join(", ") || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Time Slots</Label>
                    <p className="text-sm font-medium mt-1">
                      {(application.available_time_slots ?? []).join(", ") || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Timezone</Label>
                    <p className="text-sm font-medium mt-1">{application.timezone || "Not specified"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Bio & Links */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {application.bio && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Bio</Label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{application.bio}</p>
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    {application.linkedin_url && (
                      <div>
                        <Label className="text-xs text-muted-foreground">LinkedIn</Label>
                        <a
                          href={application.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          {application.linkedin_url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {application.portfolio_url && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Portfolio</Label>
                        <a
                          href={application.portfolio_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          {application.portfolio_url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Actions */}
            <div className="space-y-6">
              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {application.status === "submitted" && (
                    <>
                      <Button
                        onClick={() => updateStatus("under_review")}
                        disabled={processing}
                        className="w-full"
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Mark Under Review
                      </Button>
                      <Button
                        onClick={() => updateStatus("approved")}
                        disabled={processing}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => {
                          if (!rejectionReason.trim()) {
                            toast.error("Please provide a rejection reason");
                            return;
                          }
                          updateStatus("rejected");
                        }}
                        disabled={processing}
                        variant="destructive"
                        className="w-full"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  {application.status === "under_review" && (
                    <>
                      <Button
                        onClick={() => updateStatus("interview_scheduled")}
                        disabled={processing}
                        className="w-full"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Schedule Interview
                      </Button>
                      <Button
                        onClick={() => updateStatus("approved")}
                        disabled={processing}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => updateStatus("rejected")}
                        disabled={processing}
                        variant="destructive"
                        className="w-full"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  {application.status === "interview_scheduled" && (
                    <Button
                      onClick={() => updateStatus("interview_completed")}
                      disabled={processing}
                      className="w-full"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark Interview Completed
                    </Button>
                  )}
                  {application.status === "interview_completed" && (
                    <>
                      <Button
                        onClick={() => updateStatus("approved")}
                        disabled={processing}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => updateStatus("rejected")}
                        disabled={processing}
                        variant="destructive"
                        className="w-full"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Add Note */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Add Note
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="Add a note about this application..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                  />
                  <Button
                    onClick={addNote}
                    disabled={processing || !adminNotes.trim()}
                    className="w-full"
                  >
                    Add Note
                  </Button>
                </CardContent>
              </Card>

              {/* Rejection Reason */}
              {(application.status === "submitted" || application.status === "under_review") && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rejection Reason</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Enter reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Resume Tab */}
        {activeTab === "resume" && (
          <Card>
            <CardHeader>
              <CardTitle>Resume</CardTitle>
            </CardHeader>
            <CardContent>
              {application.resume_url ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-lg border p-4">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{application.resume_file_name || "Resume"}</p>
                      <p className="text-xs text-muted-foreground">PDF Document</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={application.resume_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No resume uploaded
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Status History</CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No status changes yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history.map((entry: any) => (
                      <div key={entry.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <div className="mt-0.5">
                          <Badge variant={statusColors[entry.new_status] || "secondary"}>
                            {APPLICATION_STATUS_LABELS[entry.new_status] || entry.new_status}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{entry.notes || "Status updated"}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(entry.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interviews</CardTitle>
              </CardHeader>
              <CardContent>
                {interviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No interviews scheduled
                  </p>
                ) : (
                  <div className="space-y-3">
                    {interviews.map((interview: any) => (
                      <div key={interview.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {new Date(interview.scheduled_time).toLocaleString()}
                            </p>
                            {interview.location && (
                              <p className="text-xs text-muted-foreground mt-1">{interview.location}</p>
                            )}
                            {interview.notes && (
                              <p className="text-sm text-muted-foreground mt-2">{interview.notes}</p>
                            )}
                          </div>
                          {interview.result && (
                            <Badge variant={interview.result === "pass" ? "default" : "destructive"}>
                              {interview.result}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}