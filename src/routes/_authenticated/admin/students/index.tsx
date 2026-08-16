import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  User,
  Users,
  RefreshCw,
  Eye,
  Settings2,
  CreditCard,
  CalendarClock,
  TrendingUp,
  GraduationCap,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import {
  useAdminStudentList,
  useAdminStudentStats,
} from "@/modules/admin/subscription-control/hooks/use-student-control";
import type {
  AdminStudentRow,
  StudentFilter,
} from "@/modules/admin/subscription-control/services/student-control.service";
import { formatINR } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/admin/students/")({
  component: AdminStudents,
});

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function timeAgo(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function remaining(sub: AdminStudentRow["subscription"]): number {
  if (!sub) return 0;
  return (sub.current_session_slots || 0) + (sub.bonus_slots || 0);
}

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  accent: string;
}

function StatCard({ title, value, description, icon: Icon, accent }: StatCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">{title}</div>
            <div className="mt-1 text-2xl font-display font-semibold">{value.toLocaleString("en-IN")}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{description}</div>
          </div>
          <div className={`rounded-xl p-3 shrink-0 ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionBadge({ sub }: { sub: AdminStudentRow["subscription"] }) {
  if (!sub) return <Badge variant="outline">No subscription</Badge>;
  if (sub.is_current_active) return <Badge className="bg-green-600 text-white">Active</Badge>;
  if (sub.status === "expired") return <Badge variant="destructive">Expired</Badge>;
  return <Badge variant="secondary">{sub.status}</Badge>;
}

function AccountBadge({ onboarded }: { onboarded: boolean }) {
  return onboarded !== false ? (
    <Badge variant="default">Active</Badge>
  ) : (
    <Badge variant="secondary">Suspended</Badge>
  );
}

type SortKey = "name" | "joined" | "remaining" | "expiry";

function AdminStudents() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const listQuery = useAdminStudentList({ search: query, filter });
  const statsQuery = useAdminStudentStats();
  const data = listQuery.data;

  // Realtime: keep the list + stats in sync with the source of truth.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "students", "list"] });
    qc.invalidateQueries({ queryKey: ["admin", "students", "stats"] });
    qc.invalidateQueries({ queryKey: ["admin-students"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };
  useRealtimeSubscription({ channel: "admin-students-subscriptions", table: "student_subscriptions", event: "*", onInsert: invalidate, onUpdate: invalidate, onDelete: invalidate });
  useRealtimeSubscription({ channel: "admin-students-profiles", table: "profiles", event: "*", onInsert: invalidate, onUpdate: invalidate, onDelete: invalidate });
  useRealtimeSubscription({ channel: "admin-students-roles", table: "user_roles", event: "*", onInsert: invalidate, onUpdate: invalidate, onDelete: invalidate });
  useRealtimeSubscription({ channel: "admin-students-sessions", table: "sessions", event: "*", onInsert: invalidate, onUpdate: invalidate, onDelete: invalidate });

  const students = data?.students ?? [];
  const stats = statsQuery.data;

  const sorted = useMemo(() => {
    const arr = [...students];
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name": {
          const na = (a.full_name || "").toLowerCase();
          const nb = (b.full_name || "").toLowerCase();
          return na.localeCompare(nb);
        }
        case "joined":
          return (a.created_at || "").localeCompare(b.created_at || "");
        case "remaining": {
          const ra = remaining(a.subscription);
          const rb = remaining(b.subscription);
          return rb - ra || (a.created_at || "").localeCompare(b.created_at || "");
        }
        case "expiry": {
          const ea = a.subscription?.expires_at || "";
          const eb = b.subscription?.expires_at || "";
          return ea.localeCompare(eb);
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [students, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isLoading = listQuery.isLoading;
  const isError = !!listQuery.error;

  return (
    <AdminLayout>
      <div className="space-y-5 py-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Students</h1>
            <p className="mt-1 text-muted-foreground">
              Manage student accounts, subscriptions, sessions and activity.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { listQuery.refetch(); statsQuery.refetch(); }}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <StatCard title="Total Students" value={stats?.totalStudents ?? 0} description="Registered students" icon={Users} accent="bg-blue-500/10 text-blue-600" />
          <StatCard title="Active Students" value={stats?.activeAccounts ?? 0} description="Active accounts" icon={UserCheck} accent="bg-teal-500/10 text-teal-600" />
          <StatCard title="With Active Subscription" value={stats?.withActiveSubscription ?? 0} description="Active subscription" icon={CreditCard} accent="bg-green-500/10 text-green-600" />
          <StatCard title="Expiring Soon" value={stats?.expiringSoon ?? 0} description="Within 30 days" icon={CalendarClock} accent="bg-amber-500/10 text-amber-600" />
          <StatCard title="Total Sessions Used" value={stats?.totalSessionsUsed ?? 0} description="Active entitements" icon={TrendingUp} accent="bg-indigo-500/10 text-indigo-600" />
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={(v) => { setFilter(v as StudentFilter); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students</SelectItem>
                <SelectItem value="active_subscription">Active subscription</SelectItem>
                <SelectItem value="no_subscription">No subscription</SelectItem>
                <SelectItem value="expired_subscription">Expired subscription</SelectItem>
                <SelectItem value="active_account">Active account</SelectItem>
                <SelectItem value="suspended_account">Suspended account</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="joined">Joined (newest)</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="remaining">Most sessions</SelectItem>
                <SelectItem value="expiry">Expiry</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {isLoading ? "Loading students..." : `${sorted.length} student${sorted.length !== 1 ? "s" : ""} found`}
        </div>
  <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4" /> Student Directory
            </CardTitle>
            <CardDescription>{sorted.length} total</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading students...
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <p className="font-medium text-destructive">Unable to load students. Please try again.</p>
                <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
                </Button>
              </div>
            ) : paged.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                <Users className="h-8 w-8" />
                <p>No students found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((s) => {
                      const sub = s.subscription;
                      const used = sub?.used_session_slots ?? 0;
                      const total = sub?.total_session_slots ?? 0;
                      const rem = remaining(sub);
                      const pct = total > 0 ? Math.min(100, Math.round((rem / total) * 100)) : 0;
                      return (
                        <TableRow key={s.id} className="group cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate({ to: "/admin/students/$studentId", params: { studentId: s.id } })}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {s.avatar_url ? (
                                <img src={s.avatar_url} alt={s.full_name ?? "Student"} className="h-10 w-10 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                  <User className="h-5 w-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="truncate font-medium">{s.full_name || "Unnamed student"}</div>
                                {s.reference_no != null && <div className="text-xs text-muted-foreground">ID {s.reference_no}</div>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-sm">{s.email || "—"}</span></TableCell>
                          <TableCell><span className="text-sm">{formatDate(s.created_at)}</span></TableCell>
                          <TableCell><AccountBadge onboarded={s.onboarded} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <SubscriptionBadge sub={sub} />
                            </div>
                            {sub && (
                              <span className="text-xs text-muted-foreground">
                                {sub.plan_name || "—"}
                                {sub.plan_price != null ? ` · ${formatINR(sub.plan_price)}` : ""}
                              </span>
                            )}
                          </TableCell>
  <TableCell>
                            {sub ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-medium">{rem} / {total}</span>
                                <Progress value={pct} className="h-1.5 w-20" />
                                <span className="text-xs text-muted-foreground">{used ?? 0} used</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell><span className="text-sm">{sub?.expires_at ? formatDate(sub.expires_at) : "N/A"}</span></TableCell>
                          <TableCell><span className="text-sm">{timeAgo(s.last_activity)}</span></TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" asChild>
                                <Link to="/admin/students/$studentId" params={{ studentId: s.id }}>
                                  <Eye className="mr-1 h-3.5 w-3.5" /> View
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <Link to="/admin/students/$studentId" params={{ studentId: s.id }}>
                                  <Settings2 className="mr-1 h-3.5 w-3.5" /> Manage
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {sorted.length > pageSize && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Page {safePage} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}