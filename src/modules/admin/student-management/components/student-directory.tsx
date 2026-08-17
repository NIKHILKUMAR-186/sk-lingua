import { Link } from "@tanstack/react-router";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import type { StudentRow } from "../services/student-service";

interface StudentDirectoryProps {
  students: StudentRow[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (page: number) => void;
}

function SubscriptionBadge({ student }: { student: StudentRow }) {
  const sub = student.subscription;
  if (!sub) return <Badge variant="secondary" className="text-xs">No subscription</Badge>;
  if (sub.is_current_active) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Badge className="text-xs bg-green-100 text-green-700 border border-green-200">Active</Badge>
        <span className="text-xs text-muted-foreground">{sub.plan_name || "Plan"}</span>
      </div>
    );
  }
  return <Badge variant="destructive" className="text-xs">Expired / Inactive</Badge>;
}

function SessionBalance({ student }: { student: StudentRow }) {
  const sub = student.subscription;
  if (!sub) return <span className="text-xs text-muted-foreground">—</span>;
  const remaining = Number(sub.current_session_slots || 0) + Number(sub.bonus_slots || 0);
  const used = Number(sub.used_session_slots || 0);
  return (
    <div className="text-sm">
      <p className={cn("font-medium", remaining <= 2 && remaining > 0 ? "text-amber-600" : remaining <= 0 ? "text-destructive" : "")}>
        {remaining} left
      </p>
      <p className="text-xs text-muted-foreground">{used} used</p>
    </div>
  );
}

function LastActivity({ date }: { date: string | null }) {
  if (!date) return <span className="text-xs text-muted-foreground">—</span>;
  try {
    const d = new Date(date);
    const diffDays = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    let label = "";
    if (diffDays === 0) label = "Today";
    else if (diffDays === 1) label = "Yesterday";
    else if (diffDays < 7) label = `${diffDays}d ago`;
    else if (diffDays < 30) label = `${Math.round(diffDays / 7)}w ago`;
    else label = `${Math.round(diffDays / 30)}mo ago`;
    return <span className="text-xs text-muted-foreground" title={d.toLocaleString()}>{label}</span>;
  } catch {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
}

function StudentRowComponent({ student }: { student: StudentRow }) {
  return (
    <TableRow className="group">
      <TableCell>
        <Link to={`/admin/students/$studentId`} params={{ studentId: student.id }}>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={student.avatar_url || ""} alt={student.full_name || "Student"} />
              <AvatarFallback className="text-xs">{initials(student.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">
                {student.full_name || "Unnamed student"}
                {student.reference_no ? (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    #{student.reference_no}
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">{student.email || ""}</p>
            </div>
          </div>
        </Link>
      </TableCell>
      <TableCell>
        <SubscriptionBadge student={student} />
      </TableCell>
      <TableCell>
        <SessionBalance student={student} />
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {student.current_level || "Level not provided"}
        </span>
      </TableCell>
      <TableCell>
        <LastActivity date={student.last_activity} />
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="opacity-0 group-hover:opacity-100"
          title="View student profile"
        >
          <Link to={`/admin/students/$studentId`} params={{ studentId: student.id }}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function StudentDirectory({
  students,
  total,
  limit,
  offset,
  onPageChange,
}: StudentDirectoryProps) {
  const currentPage = Math.floor(offset / limit);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <StudentRowComponent key={s.id} student={s} />
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {offset + 1}–{Math.min(offset + students.length, total)} of {total}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage + 1 >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

