import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  UserCheck,
  PauseCircle,
  RefreshCw,
  ExternalLink,
  CalendarDays,
  Clock,
  Users,
  ShieldCheck,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { MentorHealthBadge, MentorStatusBadge, VerificationBadge } from "./mentor-badges";
import { StatusConfirmDialog, type ConfirmAction } from "./mentor-status-dialog";
import type { MentorDetail } from "@/lib/mentor-domain";
import { useSetMentorStatus } from "../hooks/use-mentor-detail";

interface StatusChange {
  isActive: boolean | null;
  status: string | null;
  isVerified: boolean | null;
}

interface ActionDef {
  key: string;
  label: string;
  action: ConfirmAction;
  destructive?: boolean;
  apply: StatusChange;
}

const ACTION_COLORS: Record<string, string> = {
  activate: "border-green-200 text-green-700 hover:bg-green-50",
  unsuspend: "border-green-200 text-green-700 hover:bg-green-50",
  approve: "border-green-200 text-green-700 hover:bg-green-50",
  reinstate: "border-green-200 text-green-700 hover:bg-green-50",
  verify: "border-purple-200 text-purple-700 hover:bg-purple-50",
};

export function MentorDetailOverview({ mentor }: { mentor: MentorDetail }) {
  const setStatus = useSetMentorStatus();

  const applyAction = (def: ActionDef) => (notes?: string) => {
    const c = def.apply;
    setStatus.mutate({
      mentorId: mentor.userId,
      isActive: c.isActive,
      status: c.status as any,
      isVerified: c.isVerified,
      adminNotes: notes,
    });
  };

  const actions = computeActions(mentor);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 ring-1 ring-border">
              <AvatarImage src={mentor.avatarUrl || ""} alt={mentor.fullName || "Mentor"} />
              <AvatarFallback className="text-2xl">{initials(mentor.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-display tracking-tight">
                  {mentor.fullName || "Unnamed mentor"}
                </h2>
                <MentorStatusBadge status={mentor.accountStatus} />
                <VerificationBadge verified={mentor.isVerified} />
              </div>
              <p className="mt-1 max-w-md text-sm text-muted-foreground line-clamp-2">
                {mentor.headline || mentor.bio || "No headline set."}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {mentor.totalStudents} students
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />{" "}
                  {mentor.languagesTaught?.join(", ") || "No languages"}
                </span>
                {mentor.timezone && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {mentor.timezone}
                  </span>
                )}
                {mentor.yearsExperience !== null && (
                  <span>· {mentor.yearsExperience} yr experience</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mentor.introVideoUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={mentor.introVideoUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" /> Intro video
                </a>
              </Button>
            )}
            {actions.map((a) => (
              <StatusConfirmDialog key={a.key} action={a.action} onConfirm={applyAction(a)}>
                <Button
                  variant={a.destructive ? "destructive" : "outline"}
                  size="sm"
                  className={a.destructive ? undefined : cn(ACTION_COLORS[a.key])}
                >
                  {a.label}
                </Button>
              </StatusConfirmDialog>
            ))}
            {actions.length === 0 && <Badge variant="secondary">No actions available</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <MentorHealthBadge health={mentor.health} reasons={mentor.healthReasons} />
          {mentor.healthReasons.length > 0 ? (
            <ul className="list-disc list-inside text-xs text-muted-foreground">
              {mentor.healthReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function computeActions(mentor: MentorDetail): ActionDef[] {
  const actions: ActionDef[] = [];
  const s = mentor.accountStatus;

  if (s === "inactive") {
    actions.push({
      key: "activate",
      label: "Activate",
      action: {
        label: "Activate mentor",
        description: "Grant this mentor access and mark as active.",
        icon: UserCheck,
      },
      apply: { isActive: true, status: "approved", isVerified: null },
    });
  } else if (s === "suspended") {
    actions.push({
      key: "unsuspend",
      label: "Unsuspend",
      action: {
        label: "Unsuspend mentor",
        description: "Restore this mentor's access and availability.",
        icon: RefreshCw,
      },
      apply: { isActive: true, status: "approved", isVerified: null },
    });
  } else if (s === "pending") {
    actions.push({
      key: "approve",
      label: "Approve",
      action: {
        label: "Approve mentor",
        description: "Approve and activate this mentor.",
        icon: UserCheck,
      },
      apply: { isActive: true, status: "approved", isVerified: null },
    });
  }

  if (s === "active" || s === "approved") {
    actions.push({
      key: "deactivate",
      label: "Deactivate",
      action: {
        label: "Deactivate mentor",
        description: "Deactivate this mentor. They won't appear in assignment.",
        icon: PauseCircle,
        destructive: true,
      },
      destructive: true,
      apply: { isActive: false, status: null, isVerified: null },
    });
    actions.push({
      key: "suspend",
      label: "Suspend",
      action: {
        label: "Suspend mentor",
        description: "Suspend this mentor. They cannot accept sessions while suspended.",
        icon: PauseCircle,
        destructive: true,
      },
      destructive: true,
      apply: { isActive: false, status: "suspended", isVerified: null },
    });
  }

  actions.push({
    key: mentor.isVerified ? "unverify" : "verify",
    label: mentor.isVerified ? "Revoke verification" : "Verify",
    action: {
      label: mentor.isVerified ? "Revoke verification" : "Mark verified",
      description: mentor.isVerified
        ? "Revoke this mentor's verified status."
        : "Mark this mentor's credentials as verified.",
      icon: ShieldCheck,
      destructive: mentor.isVerified,
    },
    destructive: mentor.isVerified,
    apply: { isActive: null, status: null, isVerified: !mentor.isVerified },
  });

  if (s === "rejected") {
    actions.push({
      key: "reinstate",
      label: "Reinstate",
      action: {
        label: "Reinstate mentor",
        description: "Reinstate and activate this mentor.",
        icon: RefreshCw,
      },
      apply: { isActive: true, status: "approved", isVerified: null },
    });
  }

  return actions;
}
