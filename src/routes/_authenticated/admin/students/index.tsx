import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { Loader2, Search, User, Users } from "lucide-react";
import { useStudents } from "@/modules/admin/subscription-control/hooks/use-student-control";
import {
  formatDate,
  usableSessions,
  statusLabel,
  type StudentSearchResult,
} from "@/modules/admin/subscription-control/services/student-control.service";
import { formatUserReferenceNo } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/students/")({
  component: AdminStudents,
});

function AdminStudents() {
  return (
    <AdminLayout>
      <StudentsList />
    </AdminLayout>
  );
}

function StudentsList() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: students = [], isLoading, error } = useStudents(query);

  console.error("[StudentsPage] query error:", error);

  if (error) {
    return (
      <div className="space-y-6 py-6">
        <div>
          <h1 className="text-3xl font-display">Students</h1>
          <p className="mt-1 text-muted-foreground">
            Manage student accounts and their subscriptions.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-destructive">
            <p>Unable to load students.</p>
            <p className="text-sm opacity-80">{error.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.reload();
              }}
            >
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-display">Students</h1>
        <p className="mt-1 text-muted-foreground">
          Manage student accounts and their subscriptions.
        </p>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or Student ID"
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
            <EmptyState query={query} setQuery={setQuery} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <StudentRow
                      key={s.id}
                      student={s}
                      onClick={() =>
                        navigate({
                          to: "/admin/students/$studentId",
                          params: { studentId: s.id },
                        })
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
      <Users className="h-8 w-8" />
      <p>{query ? "No students match your search." : "No students found."}</p>
      {query && (
        <Button variant="ghost" size="sm" onClick={() => setQuery("")}>
          Clear search
        </Button>
      )}
    </div>
  );
}

function StudentRow({ student, onClick }: { student: StudentSearchResult; onClick: () => void }) {
  const sub = student.subscription;
  const status = sub?.status ?? "none";

  return (
    <TableRow
      className="group cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          {student.avatar_url ? (
            <img
              src={student.avatar_url}
              alt={student.full_name ?? "Student"}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <div className="font-medium">{student.full_name || "Unnamed"}</div>
            <div className="text-sm text-muted-foreground">{student.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm">{formatUserReferenceNo(student.reference_no) ?? "N/A"}</span>
      </TableCell>
      <TableCell>
        {sub ? (
          <Badge variant={status === "active" ? "default" : "secondary"}>
            {statusLabel(status)}
          </Badge>
        ) : (
          <Badge variant="outline">No subscription</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        {sub ? (
          <span className="font-medium">
            {usableSessions(sub)} / {sub.total_session_slots}
          </span>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <span className="text-sm">{sub ? formatDate(sub.expires_at) : "N/A"}</span>
      </TableCell>
    </TableRow>
  );
}
