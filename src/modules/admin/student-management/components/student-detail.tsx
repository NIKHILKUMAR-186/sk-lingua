import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronLeft, AlertCircle, RefreshCw, CreditCard, CalendarDays, Activity, Wallet, Info } from "lucide-react";
import { useStudentDetail, useUpdateStudentProfile } from "../hooks/use-students";
import type { StudentDetailData } from "../services/student-service";
import { format, parseISO } from "date-fns";

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Not provided";
  try {
    return format(parseISO(iso), "dd MMM yyyy");
  } catch {
    return "Not provided";
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Not provided";
  try {
    return format(parseISO(iso), "dd MMM yyyy, h:mm a");
  } catch {
    return "Not provided";
  }
}

export function remainingSessions(d: StudentDetailData): number {
  const s = d.subscription;
  if (!s) return 0;
  return Number(s.current_session_slots || 0) + Number(s.bonus_slots || 0);
}

export function StudentDetailHeader({ detail }: { detail: StudentDetailData }) {
  const { student } = detail;
  const sub = detail.subscription;
  const remaining = remainingSessions(detail);
  const name = student.full_name || "Unnamed student";
  const status = sub?.is_current_active ? "Subscribed" : sub ? "Expired / Inactive" : "No subscription";

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <Avatar className="h-16 w-16">
          <AvatarImage src={student.avatar_url || ""} alt={name} />
          <AvatarFallback className="text-lg">
            {(student.full_name || "S").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-display font-bold">{name}</h2>
            {student.reference_no ? (
              <span className="text-xs text-muted-foreground">#{student.reference_no}</span>
            ) : null}
            <Badge variant={sub?.is_current_active ? "default" : "secondary"} className="text-xs">
              {status}
            </Badge>
            {student.onboarded === false && <Badge variant="destructive" className="text-xs">Suspended</Badge>}
          </div>
          <p className="truncate text-sm text-muted-foreground">{student.email || "No email"}</p>
          <p className="mt-1 text-sm">
            <span className="font-medium">{remaining}</span> session{remaining !== 1 ? "s" : ""} remaining
            {sub?.expires_at ? ` · expires ${formatDate(sub.expires_at)}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {sub?.is_current_active && (
            <Link to="/admin/student-subscription-control">
              <Button variant="outline" size="sm">
                <CreditCard className="mr-1.5 h-4 w-4" /> Manage subscription
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value ?? "Not provided"}</p>
    </div>
  );
}

export function StudentProfileSection({ detail }: { detail: StudentDetailData }) {
  const { student } = detail;
  const mutation = useUpdateStudentProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: student.full_name || "",
    phone_number: student.phone_number || "",
    native_language: student.native_language || "",
    target_language: student.target_language || "",
    current_level: student.current_level || "",
    learning_goal: student.learning_goal || "",
    city: student.city || "",
    state: student.state || "",
    country: student.country || "",
    bio: student.bio || "",
  });

  const save = () => {
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) updates[k] = v;
    mutation.mutate(
      { studentId: student.id, updates },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Profile</CardTitle>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!editing ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full name" value={student.full_name} />
            <Field label="Email" value={student.email} />
            <Field label="Phone" value={student.phone_number} />
            <Field label="Native language" value={student.native_language} />
            <Field label="Target language" value={student.target_language} />
            <Field label="Level" value={student.current_level || student.learning_level} />
            <Field label="Learning goal" value={student.learning_goal || student.learning_goals} />
            <Field label="Location" value={[student.city, student.state, student.country].filter(Boolean).join(", ") || null} />
            <Field label="Timezone" value={student.timezone} />
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Bio" value={student.bio} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Full name</span>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Phone</span>
              <Input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Native language</span>
              <Input value={form.native_language} onChange={(e) => setForm({ ...form, native_language: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Target language</span>
              <Input value={form.target_language} onChange={(e) => setForm({ ...form, target_language: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Level</span>
              <Input value={form.current_level} onChange={(e) => setForm({ ...form, current_level: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Learning goal</span>
              <Input value={form.learning_goal} onChange={(e) => setForm({ ...form, learning_goal: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">City</span>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Country</span>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">Bio</span>
              <Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export function StudentLearningOverview({ detail }: { detail: StudentDetailData }) {
  const sessions = detail.sessions || [];
  const completed = sessions.filter((s) => s.status === "completed").length;
  const cancelled = sessions.filter((s) => s.status === "cancelled").length;
  const noShow = sessions.filter((s) => s.status === "no_show" || s.status === "no-show").length;
  const upcoming = sessions.filter(
    (s) => s.status === "confirmed" && new Date(s.scheduled_time).getTime() > Date.now(),
  );
  const lastSession = sessions[0] || null;
  const nextSession = upcoming[0] || null;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base">Learning Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Sessions completed" value={completed} />
          <Field label="Sessions upcoming" value={upcoming.length} />
          <Field label="Sessions cancelled" value={cancelled} />
          <Field label="Sessions missed" value={noShow} />
          <Field label="Last session" value={lastSession ? formatDateTime(lastSession.scheduled_time) : null} />
          <Field label="Next session" value={nextSession ? formatDateTime(nextSession.scheduled_time) : null} />
          <Field label="Preferred language" value={detail.student.target_language || detail.student.native_language} />
          <div className="col-span-2">
            <Field label="Learning goals" value={detail.student.learning_goal || detail.student.learning_goals} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentSubscriptionSection({ detail }: { detail: StudentDetailData }) {
  const s = detail.subscription;
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base">Subscription</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!s ? (
          <p className="text-sm text-muted-foreground">No subscription on record.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Plan" value={s.plan_name || "—"} />
              <Field label="Status" value={s.status} />
              <Field label="Sessions left" value={`${remainingSessions(detail)} (${s.used_session_slots} used)`} />
              <Field label="Activated" value={formatDate(s.activated_at || s.purchased_at)} />
              <Field label="Expires" value={formatDate(s.expires_at)} />
              <Field
                label="Paid at purchase"
                value={s.price_at_purchase ? `${s.currency_at_purchase || "INR"} ${s.price_at_purchase}` : "Not provided"}
              />
            </div>
            {detail.adjustments && detail.adjustments.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Session ledger
                </p>
                <div className="space-y-1.5">
                  {detail.adjustments.slice(0, 10).map((adj) => (
                    <div key={adj.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="text-muted-foreground">{adj.reason || "Adjustment"}</span>
                      <span className="font-medium">{Number(adj.amount) > 0 ? "+" : ""}{adj.amount} sessions</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/student-subscription-control">
                <Button variant="outline" size="sm">
                  <CreditCard className="mr-1.5 h-4 w-4" /> Manage subscription
                </Button>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function StudentSessionsSection({ detail }: { detail: StudentDetailData }) {
  const sessions = detail.sessions || [];
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base">Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions on record.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Time</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 20).map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{formatDateTime(s.scheduled_time)}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="text-xs">{s.status}</Badge>
                    </td>
                    <td className="py-2">{s.duration_mins ? `${s.duration_mins} min` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StudentPaymentsSection({ detail }: { detail: StudentDetailData }) {
  const payments = detail.payments || [];
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base">Payments</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments on record.</p>
        ) : (
          <div className="space-y-2">
            {payments.slice(0, 15).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{p.title || p.description || "Payment"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                </div>
                <Badge variant={p.status === "paid" || p.status === "success" ? "default" : "secondary"} className="text-xs">
                  {p.status || "—"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StudentDetailPage({ studentId }: { studentId: string }) {
  const { data: detail, isLoading, isError, error, refetch } = useStudentDetail(studentId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link to="/admin/students">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to students
          </Button>
        </Link>
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="space-y-6">
        <Link to="/admin/students">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to students
          </Button>
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : "Unable to load this student."}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/admin/students">
        <Button variant="ghost" size="sm">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to students
        </Button>
      </Link>

      <StudentDetailHeader detail={detail} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <StudentProfileSection detail={detail} />
          <StudentLearningOverview detail={detail} />
          <StudentSessionsSection detail={detail} />
        </div>
        <div className="space-y-6">
          <StudentSubscriptionSection detail={detail} />
          <StudentPaymentsSection detail={detail} />
          <Card>
            <CardContent className="flex items-start gap-2 p-4 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Administrative notes and mentor assignment are available from the bookings and support workflows.</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

