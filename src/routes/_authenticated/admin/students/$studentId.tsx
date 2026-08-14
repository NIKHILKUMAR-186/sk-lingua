import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import {
  useStudentDetail,
  useAddSessions,
  useRemoveSessions,
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
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);

  // Profile edit state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLanguage, setEditLanguage] = useState("");
  const [editState, setEditState] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editBio, setEditBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const detail = useStudentDetail(studentId, selectedSubId ?? undefined);
  const updateProfile = useUpdateStudentProfile();

  const student = detail.data?.student;
  const subscription: StudentSubscriptionLite | null = detail.data?.subscription ?? null;
  const history = detail.data?.history ?? [];

  // Initialise edit fields when the student loads
  const [hasInitialised, setHasInitialised] = useState(false);
  if (!hasInitialised && student) {
    setEditName(student.full_name ?? "");
    setEditPhone(student.phone_number ?? "");
    setEditLanguage(student.native_language ?? "");
    setEditState(student.state ?? "");
    setEditCountry(student.country ?? "");
    setEditBio(student.bio ?? "");
    setHasInitialised(true);
  }

  const addMutation = useAddSessions(studentId, subscription?.id ?? null);
  const removeMutation = useRemoveSessions(studentId, subscription?.id ?? null);
  const extendMutation = useExtendExpiry(studentId, subscription?.id ?? null);
  const activateMutation = useActivateSubscription(studentId);
  const deactivateMutation = useDeactivateSubscription(studentId);
  const createMutation = useCreateSubscription(studentId);
  const replacePlanMutation = useReplacePlan(studentId);

  const isActive = subscription?.status === "active";

  async function saveProfile() {
    if (!student) return;
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        studentId,
        updates: {
          full_name: editName || undefined,
          phone_number: editPhone || undefined,
          native_language: editLanguage || undefined,
          state: editState || undefined,
          country: editCountry || undefined,
          bio: editBio || undefined,
        },
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (detail.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading student…
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

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Profile</CardTitle>
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
              <Label htmlFor="phone_number">Phone</Label>
              <Input
                id="phone_number"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="native_language">Native Language</Label>
              <Input
                id="native_language"
                value={editLanguage}
                onChange={(e) => setEditLanguage(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={editState} onChange={(e) => setEditState(e.target.value)} />
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
                  <div className="text-sm text-muted-foreground">Sessions</div>
                  <div className="font-medium">
                    {usableSessions(subscription)} / {subscription.total_session_slots}
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
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add Sessions
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRemoveOpen(true)}>
                  <Minus className="mr-1.5 h-4 w-4" /> Remove Sessions
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
          <AddSessionsDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            subscription={subscription}
            mutation={addMutation}
          />
          <RemoveSessionsDialog
            open={removeOpen}
            onOpenChange={setRemoveOpen}
            subscription={subscription}
            mutation={removeMutation}
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
    </div>
  );
}
