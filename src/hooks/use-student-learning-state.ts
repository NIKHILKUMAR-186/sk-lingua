import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useStudentSubscription } from "@/hooks/use-subscriptions";
import type { DemoBooking } from "@/lib/demo-bookings";

/**
 * P1 — Centralised student lifecycle state.
 *
 * Derives the student's current learning state from the authoritative
 * backend sources (demo_session_bookings + student_subscriptions) and
 * returns a single primary CTA that other components can use directly.
 *
 * States
 * ------
 * TRIAL_REQUIRED                – no trial completed yet
 * TRIAL_COMPLETED_NO_SUBSCRIPTION – trial is done, no active subscription
 * ACTIVE_SUBSCRIPTION           – trial is done, subscription is active & not expired
 */

export type StudentLearningState =
  | "TRIAL_REQUIRED"
  | "TRIAL_COMPLETED_NO_SUBSCRIPTION"
  | "ACTIVE_SUBSCRIPTION";

export interface PrimaryCta {
  label: string;
  to: string;
}

export interface LearningStateResult {
  state: StudentLearningState;
  /** Has the student ever booked a trial (any non-cancelled status)? */
  trialBooked: boolean;
  /** Has a trial session reached the "completed" terminal state? */
  trialCompleted: boolean;
  /** Is there an active subscription (status = active, not expired)? */
  activeSubscription: boolean;
  /** Is there an expired subscription? */
  expiredSubscription: boolean;
  /** Total available sessions (current + bonus). */
  remainingSessions: number;
  /** The raw subscription row (or null). */
  subscription: any;
  /** The primary call-to-action for this state. */
  primaryCta: PrimaryCta;
  /** Data refresh — invalidate the underlying queries. */
  invalidate: () => void;
}

// Statuses that count as "consumed the demo slot" (non-rebookable).
const CONSUMED_STATUSES = [
  "pending_admin_confirmation",
  "confirmed",
  "completed",
  "no_show",
];

export function useStudentLearningState(): LearningStateResult {
  const { data: auth } = useAuth();
  const userId = auth?.user?.id;

  const { data: demoBookings = [] } = useQuery<DemoBooking[]>({
    queryKey: ["user-demo-bookings", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("demo_session_bookings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return (data ?? []) as DemoBooking[];
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });

  const { data: subscription } = useStudentSubscription(userId ?? null);

  const trialBooked = demoBookings.some((d) =>
    CONSUMED_STATUSES.includes(d.booking_status),
  );
  const trialCompleted = demoBookings.some(
    (d) => d.booking_status === "completed",
  );

  const now = new Date();
  const activeSubscription = !!(
    subscription &&
    subscription.status === "active" &&
    (!subscription.expires_at || new Date(subscription.expires_at) > now)
  );

  const expiredSubscription = !!(
    subscription &&
    subscription.expires_at &&
    new Date(subscription.expires_at) <= now
  );

  const remainingSessions =
    (subscription?.current_session_slots ?? 0) +
    (subscription?.bonus_slots ?? 0);

  // ── State resolution ──────────────────────────────────────────
  let state: StudentLearningState = "TRIAL_REQUIRED";
  let primaryCta: PrimaryCta = { label: "Book a Trial", to: "/student/demo-session" };

  if (trialCompleted && activeSubscription) {
    state = "ACTIVE_SUBSCRIPTION";
    primaryCta = { label: "Book a Session", to: "/student/book" };
  } else if (trialCompleted && !activeSubscription) {
    state = "TRIAL_COMPLETED_NO_SUBSCRIPTION";
    primaryCta = { label: "View Plans", to: "/student/pricing" };
  }
  // else TRIAL_REQUIRED (default above)

  return {
    state,
    trialBooked,
    trialCompleted,
    activeSubscription,
    expiredSubscription,
    remainingSessions,
    subscription,
    primaryCta,
    invalidate: () => {
      // no-op for now; consumers invalidate as needed
    },
  };
}