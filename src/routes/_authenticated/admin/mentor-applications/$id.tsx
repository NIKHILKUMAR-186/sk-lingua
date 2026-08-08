import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CardSkeleton } from "@/components/skeleton-loader";
import { ResumePreview } from "@/components/resume-preview";
import {
  fetchApplicationById,
  fetchApplicationHistory,
  fetchApplicationInterviews,
  fetchMentorNotes,
  APPLICATION_STATUS_LABELS,
  type MentorApplication,
} from "@/lib/mentorApplications";
import { cn } from "@/lib/utils";
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
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  GraduationCap,
  Briefcase,
  Languages,
  ServerCrash,
} from "lucide-react";
import { toast } from "sonner";
import { useState, type ComponentType } from "react";

// The generated Supabase types are stale for the mentor recruitment tables
// (status_history, interviews, notes) and the mentor_pending role. Use a
// loosely-typed client for those, matching the existing mentorApplications.ts.
const admin: any = supabase;

export const Route = createFileRoute("/_authenticated/admin/mentor-applications/$id")({
  component: AdminMentorApplicationDetail,
  // A tiny error boundary so a render-time crash never blanks the page.
  errorComponent: ({ error, reset }) => (
    <AdminLayout>
      <ErrorScreen
        message={error instanceof Error ? error.message : String(error)}
        onRetry={reset}
        title="Unable to render mentor application"
      />
    </AdminLayout>
  ),
});

type StatusVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_COLORS: Record<string, StatusVariant> = {
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

const TABS = [
  { id: "details", label: "Details", icon: FileText },
  { id: "resume", label: "Resume", icon: FileText },
  { id: "history", label: "History", icon: Clock },
  { id: "notes", label: "Notes", icon: MessageSquare },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

function LoadingScreen() {
  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <CardSkeleton rows={4} />
            <CardSkeleton rows={5} />
            <CardSkeleton rows={3} />
          </div>
          <div className="space-y-6">
            <CardSkeleton rows={4} />
            <CardSkeleton rows={3} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function ErrorScreen({
  message,
  onRetry,
  title = "Unable to load mentor application",
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <AdminLayout>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Reason:</p>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
              {message}
            </pre>
          </div>
          <div className="flex gap-2 justify-center">
            {onRetry && (
              <Button onClick={onRetry} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link to="/admin/mentor-applications">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to list
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function NotFoundScreen() {
  return (
    <AdminLayout>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Application not found. It may have been deleted or you may not have access.
          </p>
          <Button asChild>
            <Link to="/admin/mentor-applications">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to applications
            </Link>
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
      <Icon className="h-6 w-6 mb-2" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function SubError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
      <ServerCrash className="h-6 w-6 mb-2 text-red-600" />
      <p className="text-sm">Could not load this section.</p>
      <pre className="mt-2 max-w-full whitespace-pre-wrap rounded-lg bg-muted p-3 text-left text-xs text-red-600">
        {message}
      </pre>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-3">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}

// Defensive formatter so an invalid date never crashes the page.
function formatDate(value?: string | null, label = "No date"): string {
  if (!value) return label;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return label;
  return d.toLocaleString();
}

function AdminMentorApplicationDetail() {
  const { id } = Route.useParams();
  const { data: auth, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("details");

  const applicationQuery = useQuery({
    queryKey: ["admin-mentor-application", id],
    enabled: !!id,
    queryFn: () => fetchApplicationById(id as string),
    retry: 1,
  });

  const historyQuery = useQuery({
    queryKey: ["admin-application-history", id],
    enabled: !!id,
    queryFn: () => fetchApplicationHistory(id as string),
  });

  const interviewsQuery = useQuery({
    queryKey: ["admin-application-interviews", id],
    enabled: !!id,
    queryFn: () => fetchApplicationInterviews(id as string),
  });

  const notesQuery = useQuery({
    queryKey: ["admin-application-notes", id],
    enabled: !!id,
    queryFn: () => fetchMentorNotes(id as string),
  });

  const application = applicationQuery.data as MentorApplication | undefined;

  async function insertNotification(opts: {
    userId: string;
    title: string;
    body?: string;
    link?: string;
  }) {
    try {
      await (supabase as any).rpc("insert_notification", {
        p_user_id: opts.userId,
        p_title: opts.title,
        p_body: opts.body ?? null,
        p_category: "general",
        p_kind: "mentor_application",
        p_related_id: id,
        p_link: opts.link ?? null,
      });
    } catch (err) {
      console.error("Notification insert failed", err);
    }
  }

  async function updateStatus(status: string) {
    if (!id) return;
    setProcessing(true);
    try {
      const { error } = await admin
        .from("mentor_applications")
        .update({ status })
        .eq("id", id);
      if (error) throw error;

      // Record status history
      await admin.from("mentor_application_status_history").insert([
        {
          application_id: id,
          new_status: status,
          changed_by: auth?.user?.id ?? null,
          notes: rejectionReason.trim() || null,
        },
      ]);

      // ── APPROVAL: promote mentor_pending → mentor ──
      if (status === "approved" && application?.user_id) {
        // Use a SECURITY DEFINER DB function to bypass RLS on user_roles.
        const { error: approveError } = await supabase.rpc("approve_mentor_role", {
          _user_id: application.user_id,
        });
        if (approveError) throw approveError;

        // Force the auth session to refresh so the new mentor role is picked up
        // immediately by the pending page's redirect effect.
        qc.invalidateQueries({ queryKey: ["auth-session"] });

        await insertNotification({
          userId: application.user_id,
          title: "Congratulations! 🎉",
          body: "Your mentor account has been approved. You can now start teaching!",
          link: "/mentor/dashboard",
        });
      }

      // ── REJECTION / REQUEST CHANGES: send notification ──
      if ((status === "rejected" || status === "under_review") && application?.user_id) {
        await supabase
          .from("mentor_applications")
          .update({ admin_notes: rejectionReason.trim() || "Application requires changes." })
          .eq("id", id);

        await insertNotification({
          userId: application.user_id,
          title: status === "rejected" ? "Application not approved" : "Application under review",
          body:
            rejectionReason.trim() ||
            "Your mentor application requires changes. Please review and resubmit.",
          link: "/mentor/pending",
        });
      }

      toast.success(`Application ${status.replace(/_/g, " ")}`);
      setRejectionReason("");
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
      const { error } = await admin.from("mentor_notes").insert([
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

  // ── Auth / role gates ──
  // While the auth session is still resolving, show a loading screen instead
  // of a blank page (the page previously rendered `null` here).
  if (authLoading || !auth) {
    return <LoadingScreen />;
  }
  if (!auth.user) {
    return (
      <AdminLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              You must be signed in to review mentor applications.
            </p>
            <Button asChild variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }
  if (!(auth.roles ?? []).includes("admin")) {
    return (
      <AdminLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Access denied — admin role required.</p>
        </div>
      </AdminLayout>
    );
  }

  // ── Loading state ──
  if (applicationQuery.isLoading) {
    return <LoadingScreen />;
  }

  // ── Error state ──
  if (applicationQuery.isError) {
    return (
      <ErrorScreen
        message={applicationQuery.error?.message ?? String(applicationQuery.error)}
        onRetry={() => applicationQuery.refetch()}
      />
    );
  }

  // ── Not found ──
  if (!application) {
    return <NotFoundScreen />;
  }

  const history = historyQuery.data ?? [];
  const interviews = interviewsQuery.data ?? [];
  const notes = notesQuery.data ?? [];

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
          <Badge variant={STATUS_COLORS[application.status] || "secondary"} className="text-sm">
            {APPLICATION_STATUS_LABELS[application.status] || application.status}
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
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
                      {[application.city, application.state, application.country]
                        .filter(Boolean)
                        .join(", ") || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Native Language</Label>
                    <p className="text-sm font-medium mt-1">
                      {application.native_language || "Not provided"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Languages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    Languages
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Teaching Languages</Label>
                    <div className="text-sm font-medium mt-1">
                      {(application.teaching_languages ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {(application.teaching_languages ?? []).map((lang: string) => (
                            <Badge key={lang} variant="outline">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "Not provided"
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Subjects</Label>
                    <p className="text-sm font-medium mt-1">
                      {(application.subjects ?? []).join(", ") || "Not provided"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Professional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Years of Experience</Label>
                    <p className="text-sm font-medium mt-1">
                      {application.years_of_experience ?? "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Current Occupation</Label>
                    <p className="text-sm font-medium mt-1">
                      {application.current_occupation || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Highest Qualification</Label>
                    <p className="text-sm font-medium mt-1">
                      {application.highest_qualification || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Current Company / Role</Label>
                    <p className="text-sm font-medium mt-1">
                      {application.current_company || application.current_role || "Not provided"}
                    </p>
                  </div>
                  {application.teaching_experience && (
                    <div className="md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Teaching Experience</Label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">
                        {application.teaching_experience}
                      </p>
                    </div>
                  )}
                  {application.certifications && application.certifications.length > 0 && (
                    <div className="md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Certifications</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {application.certifications.map((cert: string) => (
                          <Badge key={cert} variant="outline">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Education */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Degree</Label>
                    <p className="text-sm font-medium mt-1">
                      {application.degree || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">College</Label>
                    <p className="text-sm font-medium mt-1">
                      {application.college || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Graduation Year</Label>
                    <p className="text-sm font-medium mt-1">
                      {application.graduation_year || "Not provided"}
                    </p>
                  </div>
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
                    <p className="text-sm font-medium mt-1">
                      {application.timezone || "Not specified"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Profile */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {application.bio ? (
                    <div>
                      <Label className="text-xs text-muted-foreground">Bio</Label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{application.bio}</p>
                    </div>
                  ) : (
                    <EmptyState icon={FileText} text="No bio provided" />
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
                        Move to Review
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
                            toast.error("Please provide a reason");
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
                      <Button
                        onClick={() => {
                          if (!rejectionReason.trim()) {
                            toast.error("Please describe what changes are needed");
                            return;
                          }
                          updateStatus("under_review");
                        }}
                        disabled={processing}
                        variant="outline"
                        className="w-full"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Request Changes
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
                        onClick={() => {
                          if (!rejectionReason.trim()) {
                            toast.error("Please provide a reason");
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
                        onClick={() => {
                          if (!rejectionReason.trim()) {
                            toast.error("Please provide a reason");
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
                  {![
                    "submitted",
                    "under_review",
                    "interview_scheduled",
                    "interview_completed",
                  ].includes(application.status) && (
                    <p className="text-xs text-muted-foreground text-center">
                      No actions available for status "
                      {APPLICATION_STATUS_LABELS[application.status] || application.status}".
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Rejection / Request Reason */}
              {(application.status === "submitted" || application.status === "under_review") && (
                <Card>
                  <CardHeader>
                    <CardTitle>Reason</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Enter reason for rejection / changes requested..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                    />
                  </CardContent>
                </Card>
              )}

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
              {application.resume_path || application.resume_url ? (
                <ResumePreview
                  url={application.resume_url || null}
                  path={application.resume_path || null}
                  fileName={application.resume_file_name}
                />
              ) : (
                <EmptyState icon={FileText} text="No resume uploaded" />
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
                {historyQuery.isLoading ? (
                  <>
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full" />
                  </>
                ) : historyQuery.isError ? (
                  <SubError
                    message={historyQuery.error?.message ?? String(historyQuery.error)}
                    onRetry={() => historyQuery.refetch()}
                  />
                ) : history.length === 0 ? (
                  <EmptyState icon={Clock} text="No status changes yet" />
                ) : (
                  <div className="space-y-3">
                    {history.map((entry: any) => (
                      <div key={entry.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <div className="mt-0.5">
                          <Badge variant={STATUS_COLORS[entry.new_status] || "secondary"}>
                            {APPLICATION_STATUS_LABELS[entry.new_status] || entry.new_status}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{entry.notes || "Status updated"}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(entry.created_at)}
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
                {interviewsQuery.isLoading ? (
                  <>
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full" />
                  </>
                ) : interviewsQuery.isError ? (
                  <SubError
                    message={interviewsQuery.error?.message ?? String(interviewsQuery.error)}
                    onRetry={() => interviewsQuery.refetch()}
                  />
                ) : interviews.length === 0 ? (
                  <EmptyState icon={Calendar} text="No interviews scheduled" />
                ) : (
                  <div className="space-y-3">
                    {interviews.map((interview: any) => (
                      <div key={interview.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {formatDate(interview.scheduled_time)}
                            </p>
                            {interview.location && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {interview.location}
                              </p>
                            )}
                            {interview.notes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {interview.notes}
                              </p>
                            )}
                          </div>
                          {interview.result && (
                            <Badge
                              variant={interview.result === "pass" ? "default" : "destructive"}
                            >
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

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {notesQuery.isLoading ? (
                <>
                  <Skeleton className="h-12 w-full mb-2" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : notesQuery.isError ? (
                <SubError
                  message={notesQuery.error?.message ?? String(notesQuery.error)}
                  onRetry={() => notesQuery.refetch()}
                />
              ) : notes.length === 0 ? (
                <EmptyState icon={MessageSquare} text="No notes yet" />
              ) : (
                <div className="space-y-3">
                  {notes.map((note: any) => (
                    <div key={note.id} className="rounded-lg border p-3">
                      <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {note.created_by ? `By admin on ` : ""}
                        {formatDate(note.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
