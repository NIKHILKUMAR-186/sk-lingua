import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Clock } from "lucide-react";
import { initials } from "@/lib/utils";
import { type MentorDetail } from "@/lib/mentor-domain";
export function MentorStudents({ mentor }: { mentor: MentorDetail }) {
  const active = mentor.students?.active || [];
  const recent = mentor.students?.recent || [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active students ({active.length})</CardTitle>
          <CardDescription>Students who have booked with this mentor</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {active.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">No active students.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="w-[120px]">Sessions</TableHead>
                  <TableHead className="w-[140px]">Last session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.slice(0, 15).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={s.avatarUrl || ""} alt={s.fullName || "Student"} />
                        <AvatarFallback className="text-xs">{initials(s.fullName)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{s.fullName || "Student"}</span>
                    </TableCell>
                    <TableCell className="text-sm">{s.sessionCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.lastSessionAt ? formatDate(s.lastSessionAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Most recently scheduled students</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">No recent activity.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="w-[140px]">Last session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.slice(0, 10).map((s) => (
                  <TableRow key={`r-${s.id}`}>
                    <TableCell className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">{initials(s.fullName)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{s.fullName || "Student"}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.lastSessionAt ? formatDate(s.lastSessionAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return ts;
  }
}
