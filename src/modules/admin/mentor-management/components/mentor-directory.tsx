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
import { ChevronLeft, ChevronRight, ExternalLink, Users } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { formatRating } from "@/lib/mentor-domain";
import { MentorHealthBadge, MentorStatusBadge, VerificationBadge } from "./mentor-badges";
import type { Mentor } from "@/lib/mentor-domain";

interface MentorDirectoryProps {
  mentors: Mentor[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (page: number) => void;
  currentFilterLabel?: string;
}

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function LanguageTags({ languages }: { languages: string[] }) {
  if (!languages || languages.length === 0) {
    return <span className="text-xs text-muted-foreground/60">No languages</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {languages.slice(0, 3).map((l) => (
        <span
          key={l}
          className="inline-block rounded bg-slate-100 px-1.5 py-0.25 text-xs text-slate-700"
        >
          {l}
        </span>
      ))}
      {languages.length > 3 && (
        <span className="text-xs text-muted-foreground">+{languages.length - 3}</span>
      )}
    </div>
  );
}

function AvailabilityIndicator({ today, slots }: { today: boolean; slots: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        today
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600",
      )}
      title={today ? "Available today" : "Not available today"}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", today ? "bg-emerald-500" : "bg-slate-400")} />
      {today ? `${slots} slot${slots !== 1 ? "s" : ""} today` : "Unavailable"}
    </span>
  );
}

function RatingCell({ rating, count }: { rating: number; count: number }) {
  if (count === 0) {
    return <span className="text-xs text-muted-foreground">No reviews</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium">
      <span className="text-amber-400">★</span>
      {formatRating(rating)}
      <span className="text-xs text-muted-foreground">({count})</span>
    </span>
  );
}

function LastActiveCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-xs text-muted-foreground">—</span>;
  try {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    let label = "";
    if (diffDays === 0) label = "Today";
    else if (diffDays === 1) label = "Yesterday";
    else if (diffDays < 7) label = `${diffDays}d ago`;
    else if (diffDays < 30) label = `${Math.round(diffDays / 7)}w ago`;
    else label = `${Math.round(diffDays / 30)}mo ago`;
    return (
      <span className="text-xs text-muted-foreground" title={d.toLocaleString()}>
        {label}
      </span>
    );
  } catch {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
}

export function MentorDirectory({
  mentors,
  total,
  limit,
  offset,
  onPageChange,
  currentFilterLabel,
}: MentorDirectoryProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit);

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Mentor</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead className="w-[130px]">Health</TableHead>
            <TableHead>Languages & Experience</TableHead>
            <TableHead className="w-[140px]">Rating</TableHead>
            <TableHead className="w-[150px]">Sessions</TableHead>
            <TableHead className="w-[150px]">Availability</TableHead>
            <TableHead className="w-[130px]">Last active</TableHead>
            <TableHead className="w-[110px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mentors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9}>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium">
                    {currentFilterLabel
                      ? `No mentors match “${currentFilterLabel}”`
                      : "No mentors found"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try adjusting your search or filters.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            mentors.map((mentor) => <MentorRow key={mentor.userId} mentor={mentor} />)
          )}
        </TableBody>
      </Table>

      {total > limit && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
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

function MentorRow({ mentor }: { mentor: Mentor }) {
  return (
    <TableRow className="group">
      <TableCell>
        <Link to={`/admin/mentors/$mentorId`} params={{ mentorId: mentor.userId }}>
          <div className="flex items-center gap-3 cursor-pointer">
            <Avatar className="h-9 w-9">
              <AvatarImage src={mentor.avatarUrl || ""} alt={mentor.fullName || "Mentor"} />
              <AvatarFallback className="text-xs">{initials(mentor.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">
                {mentor.fullName || "Unnamed mentor"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{mentor.email || ""}</p>
            </div>
          </div>
        </Link>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <MentorStatusBadge status={mentor.accountStatus} />
          <VerificationBadge verified={mentor.isVerified} />
        </div>
      </TableCell>
      <TableCell>
        <MentorHealthBadge health={mentor.health} reasons={mentor.healthReasons} />
      </TableCell>
      <TableCell>
        <LanguageTags languages={mentor.languagesTaught} />
        <p className="mt-1 text-xs text-muted-foreground">
          {mentor.yearsExperience
            ? `${mentor.yearsExperience} yr${mentor.yearsExperience > 1 ? "s" : ""} exp`
            : "Experience N/A"}
        </p>
      </TableCell>
      <TableCell>
        <RatingCell rating={mentor.ratingAvg} count={mentor.totalReviews} />
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <p className="font-medium">{mentor.sessions.completed} completed</p>
          <p className="text-xs text-muted-foreground">
            {mentor.sessions.cancelled} cancelled · {mentor.sessions.total} total
          </p>
        </div>
      </TableCell>
      <TableCell>
        <AvailabilityIndicator today={mentor.availableToday} slots={mentor.activeSlotCount} />
      </TableCell>
      <TableCell>
        <LastActiveCell date={mentor.lastActive} />
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="opacity-0 group-hover:opacity-100"
          title="View mentor profile"
        >
          <Link to={`/admin/mentors/$mentorId`} params={{ mentorId: mentor.userId }}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
