import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, User, Users, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/students/")({
  component: AdminStudents,
});

interface StudentRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null;
  subscription: {
    id: string;
    plan_name: string;
    status: string;
    total_session_slots: number;
    used_session_slots: number;
    current_session_slots: number;
    bonus_slots: number;
    expires_at: string | null;
    activated_at: string | null;
  } | null;
}

function AdminStudents() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  const { data: students = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-students", query],
    queryFn: async () => {
      const q = query.trim();

      // Fetch all profiles
      let profilesQuery = supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, created_at")
        .order("full_name", { ascending: true })
        .limit(500);

      if (q) {
        profilesQuery = profilesQuery.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;
      if (profilesError) throw profilesError;

      const studentIds = (profiles ?? []).map((p) => p.id);

      // Fetch subscriptions for these students
      let subscriptions: any[] = [];
      if (studentIds.length > 0) {
        const { data: subs, error: subsError } = await supabase
          .from("student_subscriptions")
          .select("*, plan:subscription_plans(name)")
          .in("user_id", studentIds)
          .order("created_at", { ascending: false });

        if (subsError) throw subsError;
        subscriptions = subs ?? [];
      }

      // Get latest subscription per student
      const latestSubByStudent = new Map<string, any>();
      for (const sub of subscriptions) {
        if (!latestSubByStudent.has(sub.user_id)) {
          latestSubByStudent.set(sub.user_id, sub);
        }
      }

      const data: StudentRow[] = (profiles ?? []).map((p) => {
        const sub = latestSubByStudent.get(p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          subscription: sub
            ? {
                id: sub.id,
                plan_name: sub.plan?.name ?? "—",
                status: sub.status,
                total_session_slots: sub.total_session_slots,
                used_session_slots: sub.used_session_slots,
                current_session_slots: sub.current_session_slots,
                bonus_slots: sub.bonus_slots ?? 0,
                expires_at: sub.expires_at,
                activated_at: sub.activated_at,
              }
            : null,
        };
      });

      return data;
    },
    staleTime: 1000 * 30,
  });

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6 py-6">
          <div>
            <h1 className="text-3xl font-display">Students</h1>
            <p className="mt-1 text-muted-foreground">
              Manage student accounts and subscriptions.
            </p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-destructive">
              <p>Unable to load students.</p>
              <p className="text-sm opacity-80">{error.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-1 h-4 w-4" /> Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 py-6">
        <div>
          <h1 className="text-3xl font-display">Students</h1>
          <p className="mt-1 text-muted-foreground">
            Manage student accounts and subscriptions.
          </p>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {!isLoading && students.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {students.length} student{students.length !== 1 ? "s" : ""} found
          </p>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> All Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading students...
              </div>
            ) : students.length === 0 ? (
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
                      <TableHead>Subscription</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow
                        key={s.id}
                        className="group cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() =>
                          navigate({
                            to: "/admin/students/$studentId",
                            params: { studentId: s.id },
                          })
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {s.avatar_url ? (
                              <img
                                src={s.avatar_url}
                                alt={s.full_name ?? "Student"}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                <User className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{s.full_name || "Unnamed"}</div>
                              <div className="text-sm text-muted-foreground">
                                Joined {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{s.email || "—"}</span>
                        </TableCell>
                        <TableCell>
                          {s.subscription ? (
                            <Badge variant={s.subscription.status === "active" ? "default" : "secondary"}>
                              {s.subscription.status === "active" ? "Active" : s.subscription.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline">No subscription</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.subscription ? (
                            <span className="font-medium">
                              {s.subscription.current_session_slots + s.subscription.bonus_slots} / {s.subscription.total_session_slots}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm">
                            {s.subscription?.expires_at ? new Date(s.subscription.expires_at).toLocaleDateString() : "N/A"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
