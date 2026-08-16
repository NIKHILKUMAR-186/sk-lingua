import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/layouts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  User,
  Save,
  Ban,
  CheckCircle,
  CalendarClock,
  Plus,
  Minus,
  Crown,
  History,
  CreditCard,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  GraduationCap,
  Target,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import {
  useStudentDetail,
  useAddSessions,
  useExtendExpiry,
  useActivateSubscription,
  useDeactivateSubscription,
  useUpdateStudentProfile,
  useCreateSubscription,
  useReplacePlan,
} from "@/modules/admin/subscription-control/hooks/use-student-control";
import {
  formatDate,
  usableSessions,
  statusLabel,
  displayCurrency,
  type StudentSubscriptionLite,
} from "@/modules/admin/subscription-control/services/student-control.service";
import {
  AddSessionsDialog,
  RemoveSessionsDialog,
  ExtendExpiryDialog,
  DeactivateSubscriptionDialog,
  ActivateSubscriptionDialog,
  CreateSubscriptionDialog,
  ChangePlanDialog,
  AdjustSessionsDialog,
} from "@/modules/admin/subscription-control/components/subscription-control-dialogs";

export const Route = createFileRoute("/_authenticated/admin/students/$studentId")({
  component: AdminStudentDetail,
});

function AdminStudentDetail() {
  return (
    <AdminLayout>
      <StudentDetailContent />
    </AdminLayout>
  );
}

function StudentDetailContent() {
  const { studentId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  // Dialog state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);

  // Adjust sessions state
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [amount, setAmount] = useState("");

  // Profile edit state
  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editState, setEditState] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editNativeLanguage, setEditNativeLanguage] = useState("");
  const [editCurrentLevel, setEditCurrentLevel] = useState("");
  const [editLearningGoal, setEditLearningGoal] = useState("");
  const [editLearningLevel, setEditLearningLevel] = useState("");
  const [editLearningGoals, setEditLearningGoals] = useState("");
  const [editTargetLanguage, setEditTargetLanguage] = useState("");
  const [editInterests, setEditInterests] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const detail = useStudentDetail(studentId, selectedSubId ?? undefined);
  const updateProfile = useUpdateStudentProfile();

  // Realtime: keep the detail console in sync with the source of truth.
  const refreshDetail = () => {
    qc.invalidateQueries({ queryKey: ["admin", "students", "detail"] });
    qc.invalidateQueries({ queryKey: ["admin-students"] });
    qc.invalidateQueries({ queryKey: ["admin", "students", "list"] });
    qc.invalidateQueries({ queryKey: ["admin", "students", "stats"] });
  };
  useRealtimeSubscription({ channel: `student-detail-subs-${studentId}`, table: "student_subscriptions", event: "*", onInsert: refreshDetail, onUpdate: refreshDetail, onDelete: refreshDetail });
  useRealtimeSubscription({ channel: `student-detail-profiles-${studentId}`, table: "profiles", event: "*", onInsert: refreshDetail, onUpdate: refreshDetail, onDelete: refreshDetail });
  useRealtimeSubscription({ channel: `student-detail-adjust-${studentId}`, table: "subscription_slot_adjustments", event: "*", onInsert: refreshDetail, onUpdate: refreshDetail, onDelete: refreshDetail });
  useRealtimeSubscription({ channel: `student-detail-sessions-${studentId}`, table: "sessions", event: "*", onInsert: refreshDetail, onUpdate: refreshDetail, onDelete: refreshDetail });

  // Fallback: direct Supabase query if the API route is unavailable
  const fallback = useQuery({
    queryKey: ["admin-students", "detail-fallback", studentId],
    enabled: !!studentId && !!detail.error,
    queryFn: async () => {
      if (!studentId) throw new Error("Missing student ID");
      const [{ data: profile }, { data: subs }, { data: adjustments }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, reference_no, avatar_url, country, bio, onboarded, created_at").eq("id", studentId).single(),
        supabase.from("student_subscriptions").select("*, plan:subscription_plans(name, price, currency, num_sessions)").eq("user_id", studentId).order("created_at", { ascending: false }),
        (supabase as any).from("subscription_slot_adjustments").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(200),
      ]);
      if (!profile) throw new Error("Student not found");
      const history = subs ?? [];
      const selected = history[0] ?? null;
      return { student: profile, subscription: selected, history, adjustments: adjustments ?? [] } as any;
    },
  });

  const student = detail.data?.student ?? fallback.data?.student;
  const subscription: StudentSubscriptionLite | null = detail.data?.subscription ?? fallback.data?.subscription ?? null;
  const history = detail.data?.history ?? fallback.data?.history ?? [];
  const adjustments = detail.data?.adjustments ?? fallback.data?.adjustments ?? [];
  const payments = detail.data?.payments ?? [];
  const sessions = detail.data?.sessions ?? [];
  const lastActivity = (sessions as any[])[0]?.updated_at ?? student?.updated_at ?? null;

  const isLoading = detail.isLoading || fallback.isLoading;
  const hasError = detail.error && fallback.error;
  const errorMessage = detail.error?.message || fallback.error?.message || "Unable to load student information.";

  // Initialise edit fields when the student loads
  const [hasInitialised, setHasInitialised] = useState(false);
  if (!hasInitialised && student) {
    setEditName(student.full_name ?? "");
    setEditCountry(student.country ?? "");
    setEditBio(student.bio ?? "");
    setEditPhone(student.phone_number ?? "");
    setEditState(student.state ?? "");
    setEditCity(student.city ?? "");
    setEditNativeLanguage(student.native_language ?? "");
    setEditCurrentLevel(student.current_level ?? "");
    setEditLearningGoal(student.learning_goal ?? "");
    setEditLearningLevel(student.learning_level ?? "");
    setEditLearningGoals(student.learning_goals ?? "");
    setEditTargetLanguage(student.target_language ?? "");
    setEditInterests(student.interests ?? "");
    setEditTimezone(student.timezone ?? "");
    setHasInitialised(true);
  }

  const adjustMutation = useAddSessions(studentId, subscription?.id ?? null);
  const extendMutation = useExtendExpiry(studentId, subscription?.id ?? null);
  const activateMutation = useActivateSubscription(studentId);
  const deactivateMutation = useDeactivateSubscription(studentId);
  const createMutation = useCreateSubscription(studentId);
  const replacePlanMutation = useReplacePlan(studentId);

  const isActive = subscription?.status === "active";

  // Realtime: refresh detail when subscription or adjustments change
  useRealtimeSubscription({
    channel: `admin-student-detail-${studentId}`,
    table: "student_subscriptions",
    event: "*",
    filter: studentId ? `user_id=eq.${studentId}` : undefined,
    onInsert: () => {
      qc.invalidateQueries({ queryKey: ["admin", "students", "detail", studentId] });
      qc.invalidateQueries({ queryKey: ["admin-students"] });
    },
    onUpdate: () => {
      qc.invalidateQueries({ queryKey: ["admin", "students", "detail", studentId] });
      qc.invalidateQueries({ queryKey: ["admin-students"] });
    },
    onDelete: () => {
      qc.invalidateQueries({ queryKey: ["admin", "students", "detail", studentId] });
      qc.invalidateQueries({ queryKey: ["admin-students"] });
    },
  });

  useRealtimeSubscription({
    channel: `admin-student-adjustments-${studentId}`,
    table: "subscription_slot_adjustments",
    event: "INSERT",
    filter: studentId ? `student_id=eq.${studentId}` : undefined,
    onInsert: () => {
      qc.invalidateQueries({ queryKey: ["admin", "students", "detail", studentId] });
      qc.invalidateQueries({ queryKey: ["admin-students"] });
    },
  });

  async function saveProfile() {
    if (!student) return;
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        studentId,
        updates: {
          full_name: editName || undefined,
          country: editCountry || undefined,
          bio: editBio || undefined,
          phone_number: editPhone || undefined,
          state: editState || undefined,
          city: editCity || undefined,
          native_language: editNativeLanguage || undefined,
          current_level: editCurrentLevel || undefined,
          learning_goal: editLearningGoal || undefined,
          learning_level: editLearningLevel || undefined,
          learning_goals: editLearningGoals || undefined,
          target_language: editTargetLanguage || undefined,
          interests: editInterests || undefined,
          timezone: editTimezone || undefined,
        },
      });
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      qc.invalidateQueries({ queryKey: ["admin", "students", "list"] });
      detail.refetch?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading student…
      </div>
    );
  }

  if (hasError) {
    const isNotFound = errorMessage.includes("not found") || errorMessage.includes("404");
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-destructive">
        <User className="h-8 w-8" />
        <p>{isNotFound ? "Student not found." : "Unable to load student information."}</p>
        <p className="text-sm opacity-80">{errorMessage}</p>
        <Button variant="outline" size="sm" onClick={() => { detail.refetch?.(); fallback.refetch?.(); }}>
          <RefreshCw className="mr-1 h-4 w-4" /> Retry
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/students" })}>
          Back to Students
        </Button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
        <User className="h-8 w-8" />
        <p>Student not found.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/students" })}>
          Back to Students
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/students" })}>
          ← Back to Students
        </Button>
        <div>
          <h1 className="text-2xl font-display">{student.full_name || "Student"}</h1>
          <p className="text-sm text-muted-foreground">
            {student.email}
            {student.reference_no != null && ` · ID: ${student.reference_no}`}
          </p>
        </div>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              {student.avatar_url ? (
                <img src={student.avatar_url} alt={student.full_name ?? "Student"} className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <User className="h-9 w-9" />
                </div>
              )}
              <div className="flex items-center gap-2">
                {student.onboarded !== false ? (
                  <Badge className="bg-green-600 text-white">Active</Badge>
                ) : (
                  <Badge variant="secondary">Suspended</Badge>
                )}
              </div>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</div>
                <div className="text-sm font-medium break-all">{student.email || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</div>
                <div className="text-sm font-medium">{student.phone_number || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</div>
                <div className="text-sm font-medium">{[student.city, student.state, student.country].filter(Boolean).join(", ") || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined</div>
                <div className="text-sm font-medium">{formatDate(student.created_at)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Last Activity</div>
                <div className="text-sm font-medium">{formatDate(lastActivity)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Reference</div>
                <div className="text-sm font-medium">{student.reference_no != null ? `USER-${student.reference_no}` : "—"}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-lg border bg-muted/40 p-3">
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><BookOpen className="h-3 w-3" /> Bio</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{student.bio || "No bio provided."}</p>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" /> Target Language</div>
              <div className="text-sm">{student.target_language || student.native_language || "—"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Current Level</div>
              <div className="text-sm">{student.current_level || "—"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Learning Level</div>
              <div className="text-sm">{student.learning_level || "—"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Onboarded</div>
              <div className="text-sm">{student.onboarded ? "Yes" : "No"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Management</CardTitle>
          <CardDescription>Edit the student's profile information. Email is read-only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (read-only)</Label>
              <Input id="email" type="email" value={student.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={editCountry}
                onChange={(e) => setEditCountry(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              rows={3}
              placeholder="Student bio..."
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone_number">Phone</Label>
              <Input id="phone_number" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+91..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={editCity} onChange={(e) => setEditCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={editState} onChange={(e) => setEditState(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={editCountry} onChange={(e) => setEditCountry(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="native_language">Native Language</Label>
              <Input id="native_language" value={editNativeLanguage} onChange={(e) => setEditNativeLanguage(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target_language">Target Language</Label>
              <Input id="target_language" value={editTargetLanguage} onChange={(e) => setEditTargetLanguage(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="current_level">Current Level</Label>
              <Input id="current_level" value={editCurrentLevel} onChange={(e) => setEditCurrentLevel(e.target.value)} placeholder="e.g. A2, Beginner" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="learning_level">Learning Level</Label>
              <Input id="learning_level" value={editLearningLevel} onChange={(e) => setEditLearningLevel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" value={editTimezone} onChange={(e) => setEditTimezone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="learning_goal">Learning Goal</Label>
            <Textarea id="learning_goal" value={editLearningGoal} onChange={(e) => setEditLearningGoal(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="learning_goals">Learning Goals</Label>
            <Textarea id="learning_goals" value={editLearningGoals} onChange={(e) => setEditLearningGoals(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="interests">Interests</Label>
            <Input id="interests" value={editInterests} onChange={(e) => setEditInterests(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={saveProfile} disabled={isSaving || updateProfile.isPending}>
              {(isSaving || updateProfile.isPending) && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-1.5 h-4 w-4" />
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {!subscription ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No active subscription for this student.
              </p>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <CheckCircle className="mr-1.5 h-4 w-4" /> Activate Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-md bg-muted px-3 py-3 text-center">
                  <div className="text-sm text-muted-foreground">Plan</div>
                  <div className="font-medium">{subscription.plan?.name || "—"}</div>
                </div>
                <div className="rounded-md bg-muted px-3 py-3 text-center">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="font-medium">{statusLabel(subscription.status)}</div>
                </div>
                <div className="rounded-md bg-muted px-3 py-3 text-center">
                  <div className="text-sm text-muted-foreground">Remaining</div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setAmount(String(Math.max(0, usableSessions(subscription) - 1)));
                        setMode("remove");
                        setAdjustOpen(true);
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-medium min-w-[2rem] text-center">
                      {usableSessions(subscription)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setAmount("1");
                        setMode("add");
                        setAdjustOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-md bg-muted px-3 py-3 text-center">
                  <div className="text-sm text-muted-foreground">Expires</div>
                  <div className="font-medium">{formatDate(subscription.expires_at)}</div>
                </div>
              </div>

              {subscription.plan && (
                <p className="text-sm text-muted-foreground">
                  Price: {displayCurrency(subscription)} · Billing:{" "}
                  {subscription.plan.billing_cycle || "—"}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" onClick={() => setAdjustOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Adjust Sessions
                </Button>
                <Button size="sm" variant="outline" onClick={() => setExtendOpen(true)}>
                  <CalendarClock className="mr-1.5 h-4 w-4" /> Extend Expiry
                </Button>
                <Button size="sm" variant="outline" onClick={() => setChangePlanOpen(true)}>
                  <Crown className="mr-1.5 h-4 w-4" /> Change Plan
                </Button>
                {isActive ? (
                  <Button size="sm" variant="destructive" onClick={() => setDeactivateOpen(true)}>
                    <Ban className="mr-1.5 h-4 w-4" /> Deactivate
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setActivateOpen(true)}>
                    <CheckCircle className="mr-1.5 h-4 w-4" /> Activate
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Dialogs ---- */}
      {!subscription && (
        <CreateSubscriptionDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          studentId={studentId}
          mutation={createMutation}
        />
      )}
      {subscription && (
        <>
          <AdjustSessionsDialog
            open={adjustOpen}
            onOpenChange={setAdjustOpen}
            subscription={subscription}
            mutation={adjustMutation}
          />
          <ExtendExpiryDialog
            open={extendOpen}
            onOpenChange={setExtendOpen}
            subscription={subscription}
            mutation={extendMutation}
          />
          <DeactivateSubscriptionDialog
            open={deactivateOpen}
            onOpenChange={setDeactivateOpen}
            subscription={subscription}
            studentName={student?.full_name || "This student"}
            mutation={deactivateMutation}
          />
          <ActivateSubscriptionDialog
            open={activateOpen}
            onOpenChange={setActivateOpen}
            subscription={subscription}
            mutation={activateMutation}
          />
          <ChangePlanDialog
            open={changePlanOpen}
            onOpenChange={setChangePlanOpen}
            subscription={subscription}
            mutation={replacePlanMutation}
          />
        </>
      )}

      {/* Subscription History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Subscription History
            </CardTitle>
            <CardDescription>All subscription changes for this student</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.plan?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={h.status === "active" ? "default" : "secondary"}>
                          {h.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {h.current_session_slots + (h.bonus_slots ?? 0)} / {h.total_session_slots}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(h.activated_at || h.purchased_at)}</TableCell>
                      <TableCell className="text-sm">{formatDate(h.expires_at)}</TableCell>
                      <TableCell className="text-sm">{formatDate(h.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Credit History */}
      {adjustments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" /> Session Credit History
            </CardTitle>
            <CardDescription>Manual credit adjustments and session consumption</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adj: any) => {
                    const delta = (adj.new_remaining_slots ?? 0) - (adj.old_remaining_slots ?? 0);
                    const sign = delta > 0 ? "+" : "";
                    return (
                      <TableRow key={adj.id}>
                        <TableCell className="font-medium capitalize">
                          {adj.action?.replace(/_/g, " ") || "Adjustment"}
                        </TableCell>
                        <TableCell>
                          <span className={delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : ""}>
                            {sign}{delta}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {adj.new_remaining_slots ?? 0} + {adj.new_bonus_slots ?? 0} bonus
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {adj.reason || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(adj.created_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" /> Payment History
            </CardTitle>
            <CardDescription>Real payment records associated with this student</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium capitalize">{p.order_type || "subscription"}</TableCell>
                      <TableCell className="font-medium">
                        ₹{Number(p.final_amount ?? p.amount ?? 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.payment_status === "completed" ? "default" : "secondary"}>
                          {p.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono truncate max-w-[160px]">
                        {p.transaction_id || p.gateway_order_id || p.id.slice(0, 8) + "…"}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(p.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Recent Sessions
            </CardTitle>
            <CardDescription>Latest activity for this student</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.slice(0, 10).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{formatDate(s.scheduled_time)}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "completed" ? "default" : s.status === "cancelled" ? "destructive" : "secondary"}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{s.duration_mins ?? 30} min</TableCell>
                      <TableCell className="text-sm">{formatDate(s.updated_at || s.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
