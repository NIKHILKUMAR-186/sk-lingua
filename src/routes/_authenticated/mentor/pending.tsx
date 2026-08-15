import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { APPLICATION_STATUS_LABELS } from "@/lib/mentorApplications";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/mentor/pending")({
  component: MentorPendingDashboard,
});

function MentorPendingDashboard() {
  const { data: auth, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const uid = auth?.user?.id;

  const { data: application, isLoading: appLoading } = useQuery({
    queryKey: ["mentor-application", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("mentor_applications")
        .select("*")
        .eq("user_id", uid!)
        .maybeSingle();
      return data;
    },
  });

// If the user is now an approved mentor, redirect to the full dashboard
  useEffect(() => {
    const hasMentorRole = (auth?.roles ?? []).includes("mentor");
    const isApplicationApproved = application?.status === "approved";
    if (hasMentorRole || isApplicationApproved) {
      navigate({ to: "/mentor/dashboard" });
    }
  }, [auth, application, navigate]);

  // ── Self-heal for existing broken mentor accounts ──
  // Some mentor signups made through the email-confirmation lifecycle were
  // created WITHOUT a mentor_pending role (the old handle_new_user trigger
  // never assigned roles). This is a migration path only; the database
  // trigger is the primary mechanism for all future signups.
  useEffect(() => {
    const user = auth?.user;
    if (!user) return;
    const roles = auth.roles ?? [];
    const hasMentorRole = roles.includes("mentor") || (roles as string[]).includes("mentor_pending");
    if (hasMentorRole) return;

    let cancelled = false;
    (async () => {
      try {
        const intended = String(user.user_metadata?.intended_role ?? "").toLowerCase();
        if (intended !== "mentor") return;
        if (cancelled) return;

        // Restore the mentor_pending role (idempotent, never downgrades).
        // Cast to a loose client because the generated Supabase types are
        // stale and omit the mentor_pending enum value.
        await (supabase as any).from("user_roles").upsert(
          [{ user_id: user.id, role: "mentor_pending" }],
          { onConflict: "user_id,role" },
        );
        // Ensure a mentor profile exists.
        await (supabase as any).from("mentor_profiles").upsert(
          {
            user_id: user.id,
            headline: "",
            bio: "",
            languages_taught: [],
            certifications: [],
            hourly_rate: 0,
            years_experience: 0,
            is_active: false,
          },
          { onConflict: "user_id" },
        );
      } catch (err) {
        console.error("Mentor signup self-heal failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!auth?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Please sign in to continue.</p>
      </div>
    );
  }

  const isApproved = (auth.roles ?? []).includes("mentor");
  const isPending = (auth.roles ?? []).includes("mentor_pending");

  if (isApproved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-display">Access Restricted</h1>
          <p className="text-sm text-muted-foreground">
            This page is only available to mentor accounts. If you're a student, please visit your
            student dashboard.
          </p>
          <Button asChild>
            <Link to="/student/dashboard">Go to Student Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const status = application?.status ?? "not_started";
  const statusLabel = status === "not_started" ? "Not Started" : APPLICATION_STATUS_LABELS[status] ?? status;

  const statusConfig: Record<string, { color: string; icon: React.ElementType; text: string }> = {
    not_started: { color: "bg-slate-100 text-slate-700", icon: FileText, text: "Not Started" },
    draft: { color: "bg-slate-100 text-slate-700", icon: FileText, text: "Draft" },
    submitted: { color: "bg-blue-100 text-blue-700", icon: Clock, text: "Submitted" },
    under_review: { color: "bg-amber-100 text-amber-700", icon: Clock, text: "Under Review" },
    interview_scheduled: { color: "bg-purple-100 text-purple-700", icon: Clock, text: "Interview Scheduled" },
    interview_completed: { color: "bg-purple-100 text-purple-700", icon: CheckCircle2, text: "Interview Completed" },
    approved: { color: "bg-green-100 text-green-700", icon: CheckCircle2, text: "Approved" },
    rejected: { color: "bg-red-100 text-red-700", icon: XCircle, text: "Rejected" },
    active: { color: "bg-green-100 text-green-700", icon: CheckCircle2, text: "Active" },
  };

  const config = statusConfig[status] ?? statusConfig.not_started;
  const StatusIcon = config.icon;

  const canApply = status === "not_started" || status === "draft" || status === "rejected";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Lingua home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
              <img src="/logo.png" alt="" className="h-5 w-5" />
            </span>
            <span className="text-xl font-display tracking-tight">Lingua</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/notifications">Notifications</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/settings">Settings</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display tracking-tight">
            Welcome, {auth.profile?.full_name?.split(" ")[0] ?? "Mentor"}!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your mentor journey starts here. Complete your application to get started.
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8"
        >
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Account Status
              </CardTitle>
              <CardDescription>Your mentor account is pending verification.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Account Status
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      <Clock className="mr-1 h-3 w-3" />
                      Pending Verification
                    </Badge>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Application Status
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className={config.color}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {config.text}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="rounded-2xl border border-border bg-background p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Application Progress
                </p>
                <div className="mt-4 flex items-center gap-1.5">
                  {[
                    { label: "Signup", done: true },
                    { label: "Application", done: status !== "not_started" && status !== "draft" },
                    { label: "Review", done: status === "under_review" || status === "approved" || status === "active" },
                    { label: "Approved", done: status === "approved" || status === "active" },
                  ].map((step, i) => (
                    <div key={step.label} className="flex flex-1 items-center gap-1.5">
                      <div className="flex flex-col items-center gap-1.5 flex-1">
                        <div
                          className={`h-2 w-full rounded-full ${
                            step.done ? "bg-primary" : "bg-muted"
                          }`}
                        />
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {step.label}
                        </span>
                      </div>
                      {i < 3 && <div className="h-px w-2 bg-border" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rejection reason */}
              {status === "rejected" && application?.admin_notes && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <div className="flex items-start gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Application requires changes</p>
                      <p className="mt-1 text-sm text-red-700">{application.admin_notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="rounded-2xl bg-hero-gradient from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {canApply ? "Ready to become a mentor?" : "Application in progress"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {canApply
                        ? "Complete your application to get reviewed by our team."
                        : "Our team is reviewing your application. You'll be notified once it's approved."}
                    </p>
                  </div>
                  {canApply && (
                    <Button asChild size="lg" className="shrink-0 bg-background text-foreground hover:bg-white">
                      <Link to="/mentor/apply">
                        Apply for Mentor
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* What's locked */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                What's next
              </CardTitle>
              <CardDescription>
                Once your application is approved, you'll unlock the full mentor dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <GraduationCap className="h-6 w-6 text-primary" />
                  <p className="mt-2 text-sm font-semibold">Complete Application</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fill out your experience, qualifications, and availability.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <Clock className="h-6 w-6 text-primary" />
                  <p className="mt-2 text-sm font-semibold">Team Review</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Our team reviews your application and verifies your credentials.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <p className="mt-2 text-sm font-semibold">Start Teaching</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Once approved, you'll unlock sessions and students.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}