import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  PauseCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

export { initials } from "@/lib/utils";

const HEALTH_VARIANT: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  healthy: {
    label: "Healthy",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: ShieldCheck,
  },
  good: { label: "Good", color: "text-blue-700 bg-blue-50 border-blue-200", icon: ShieldCheck },
  needs_attention: {
    label: "Needs attention",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    icon: ShieldQuestion,
  },
  incomplete: {
    label: "Incomplete",
    color: "text-orange-700 bg-orange-50 border-orange-200",
    icon: ShieldX,
  },
  inactive: {
    label: "Inactive",
    color: "text-slate-700 bg-slate-100 border-slate-200",
    icon: PauseCircle,
  },
};

const STATUS_VARIANT: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "text-amber-700 bg-amber-50 border-amber-200", icon: Clock },
  approved: {
    label: "Approved",
    color: "text-green-700 bg-green-50 border-green-200",
    icon: CheckCircle2,
  },
  active: {
    label: "Active",
    color: "text-green-700 bg-green-50 border-green-200",
    icon: CheckCircle2,
  },
  rejected: { label: "Rejected", color: "text-red-700 bg-red-50 border-red-200", icon: ShieldX },
  suspended: {
    label: "Suspended",
    color: "text-red-700 bg-red-50 border-red-200",
    icon: PauseCircle,
  },
  inactive: {
    label: "Inactive",
    color: "text-slate-700 bg-slate-100 border-slate-200",
    icon: PauseCircle,
  },
};

export function MentorHealthBadge({
  health,
  reasons,
  className,
}: {
  health: string;
  reasons?: string[];
  className?: string;
}) {
  const v = HEALTH_VARIANT[health] || HEALTH_VARIANT.needs_attention;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        v.color,
        className,
      )}
      title={reasons && reasons.length > 0 ? reasons.join(", ") : undefined}
    >
      <v.icon className="h-3 w-3" />
      {v.label}
    </span>
  );
}

export function MentorStatusBadge({ status, className }: { status: string; className?: string }) {
  const v = STATUS_VARIANT[status] || STATUS_VARIANT.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        v.color,
        className,
      )}
    >
      <v.icon className="h-3 w-3" />
      {v.label}
    </span>
  );
}

export function VerificationBadge({
  verified,
  className,
}: {
  verified: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        verified
          ? "text-purple-700 bg-purple-50 border-purple-200"
          : "text-slate-600 bg-slate-100 border-slate-200",
        className,
      )}
    >
      <ShieldCheck className={cn("h-3 w-3", !verified && "text-slate-400")} />
      {verified ? "Verified" : "Unverified"}
    </span>
  );
}
