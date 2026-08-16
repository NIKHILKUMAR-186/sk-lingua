import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Minus, CalendarClock, Ban, CheckCircle, Crown } from "lucide-react";
import {
  formatDate,
  usableSessions,
  type StudentSubscriptionLite,
  type PlanLite,
} from "../services/student-control.service";
import { usePlans } from "../hooks/use-student-control";
import type { UseMutationResult } from "@tanstack/react-query";

type MutationLike = UseMutationResult<
  StudentSubscriptionLite,
  any,
  { amount: number; reason: string },
  unknown
>;

interface BaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: StudentSubscriptionLite;
}

interface AmountDialogProps extends BaseDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  icon: React.ReactNode;
  mutation: MutationLike;
  current: number;
  preview: (amount: number) => number;
  maxAmount?: number;
}

function AmountDialog({
  open,
  onOpenChange,
  subscription,
  title,
  description,
  confirmLabel,
  icon,
  mutation,
  current,
  preview,
  maxAmount,
}: AmountDialogProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const parsed = Number(amount);
  const valid =
    Number.isInteger(parsed) && parsed >= 1 && (maxAmount === undefined || parsed <= maxAmount);

  function reset() {
    setAmount("");
    setReason("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function submit() {
    if (!valid) return;
    await mutation.mutateAsync({ amount: parsed, reason });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon} {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              placeholder="5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="e.g. Promotional bonus / Manual correction"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Current</span>
              <span>{current}</span>
            </div>
            <div className="flex justify-between font-medium text-foreground">
              <span>After</span>
              <span>{valid ? preview(parsed) : current}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function AddSessionsDialog({
  open,
  onOpenChange,
  subscription,
  mutation,
}: Omit<
  AmountDialogProps,
  "title" | "description" | "confirmLabel" | "icon" | "current" | "preview"
>) {
  return (
    <AmountDialog
      open={open}
      onOpenChange={onOpenChange}
      subscription={subscription}
      title="Add Sessions"
      description="Increase this student's usable session balance."
      confirmLabel="Add"
      icon={<Plus className="h-4 w-4" />}
      mutation={mutation}
      current={usableSessions(subscription)}
      preview={(amount) => usableSessions(subscription) + amount}
    />
  );
}

export function RemoveSessionsDialog({
  open,
  onOpenChange,
  subscription,
  mutation,
}: Omit<
  AmountDialogProps,
  "title" | "description" | "confirmLabel" | "icon" | "current" | "preview" | "maxAmount"
>) {
  const current = usableSessions(subscription);
  return (
    <AmountDialog
      open={open}
      onOpenChange={onOpenChange}
      subscription={subscription}
      title="Remove Sessions"
      description="Reduce this student's usable session balance."
      confirmLabel="Remove"
      icon={<Minus className="h-4 w-4" />}
      mutation={mutation}
      current={current}
      preview={(amount) => Math.max(0, current - amount)}
      maxAmount={current}
    />
  );
}
export function ExtendExpiryDialog({
  open,
  onOpenChange,
  subscription,
  mutation,
}: BaseDialogProps & {
  mutation: UseMutationResult<
    StudentSubscriptionLite,
    any,
    { days: number; reason: string },
    unknown
  >;
}) {
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");

  const parsedDays = Number(days);
  const valid = Number.isInteger(parsedDays) && parsedDays >= 1;

  const currentExpiry = subscription.expires_at ? new Date(subscription.expires_at) : new Date();
  const newExpiry = valid
    ? new Date(currentExpiry.getTime() + parsedDays * 24 * 60 * 60 * 1000)
    : currentExpiry;

  function reset() {
    setDays("");
    setReason("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function submit() {
    if (!valid) return;
    await mutation.mutateAsync({ days: parsedDays, reason });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Extend Expiry
          </DialogTitle>
          <DialogDescription>Extend this subscription's expiry date.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Current</span>
              <span>{formatDate(subscription.expires_at)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="days">Extend by (days)</Label>
            <Input
              id="days"
              type="number"
              min={1}
              placeholder="15"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            <div className="flex justify-between font-medium text-foreground">
              <span>New expiry</span>
              <span>{formatDate(newExpiry.toISOString())}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expiry-reason">Reason</Label>
            <Textarea
              id="expiry-reason"
              placeholder="e.g. Compensation for cancelled sessions"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Extend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeactivateSubscriptionDialog({
  open,
  onOpenChange,
  subscription,
  mutation,
  studentName,
}: BaseDialogProps & {
  mutation: UseMutationResult<
    StudentSubscriptionLite,
    any,
    { subscriptionId: string; reason: string },
    unknown
  >;
  studentName: string;
}) {
  const [reason, setReason] = useState("");

  function reset() {
    setReason("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function submit() {
    await mutation.mutateAsync({ subscriptionId: subscription.id, reason });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-4 w-4" /> Deactivate subscription?
          </DialogTitle>
          <DialogDescription>
            {studentName} will no longer have an active subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="deactivate-reason">Reason (optional)</Label>
            <Textarea
              id="deactivate-reason"
              placeholder="e.g. Manual cancellation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ActivateSubscriptionDialog({
  open,
  onOpenChange,
  subscription,
  mutation,
}: BaseDialogProps & {
  mutation: UseMutationResult<
    StudentSubscriptionLite,
    any,
    { subscriptionId: string; reason: string },
    unknown
  >;
}) {
  const [reason, setReason] = useState("");

  function reset() {
    setReason("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function submit() {
    await mutation.mutateAsync({ subscriptionId: subscription.id, reason });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Activate subscription?
          </DialogTitle>
          <DialogDescription>Reactivate this student's subscription entitlement.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="activate-reason">Reason (optional)</Label>
            <Textarea
              id="activate-reason"
              placeholder="e.g. Reactivation by admin"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Activate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateSubscriptionDialog({
  open,
  onOpenChange,
  studentId,
  mutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  mutation: UseMutationResult<
    StudentSubscriptionLite,
    any,
    { planId: string; reason: string },
    unknown
  >;
}) {
  const [planId, setPlanId] = useState("");
  const [reason, setReason] = useState("");
  const { data: plans, isLoading } = usePlans();

  function reset() {
    setPlanId("");
    setReason("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function submit() {
    if (!planId) return;
    await mutation.mutateAsync({ planId, reason });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Activate Plan
          </DialogTitle>
          <DialogDescription>Select a subscription plan for this student.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading plans...
            </div>
          ) : (
            <RadioGroup value={planId} onValueChange={setPlanId}>
              {(plans ?? []).map((plan) => (
                <label
                  key={plan.id}
                  className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 ${
                    planId === plan.id ? "border-primary bg-muted/50" : ""
                  }`}
                >
                  <RadioGroupItem value={plan.id} />
                  <div className="flex-1">
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {plan.price !== null
                        ? `₹${Number(plan.price).toLocaleString("en-IN")}`
                        : "Free"}
                      {" · "}
                      {plan.num_sessions} Sessions
                      {" · "}
                      {plan.billing_cycle || "—"}
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="create-reason">Reason (optional)</Label>
            <Textarea
              id="create-reason"
              placeholder="e.g. Admin created subscription"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!planId || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Activate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChangePlanDialog({
  open,
  onOpenChange,
  subscription,
  mutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: StudentSubscriptionLite;
  mutation: UseMutationResult<
    StudentSubscriptionLite,
    any,
    { subscriptionId: string; newPlanId: string; reason: string },
    unknown
  >;
}) {
  const [newPlanId, setNewPlanId] = useState("");
  const [reason, setReason] = useState("");
  const { data: plans, isLoading } = usePlans();

  function reset() {
    setNewPlanId("");
    setReason("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function submit() {
    if (!newPlanId) return;
    await mutation.mutateAsync({ subscriptionId: subscription.id, newPlanId, reason });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-4 w-4" /> Change Plan
          </DialogTitle>
          <DialogDescription>
            Replace the current plan. The old subscription will be preserved in history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading plans...
            </div>
          ) : (
            <RadioGroup value={newPlanId} onValueChange={setNewPlanId}>
              {(plans ?? []).map((plan) => (
                <label
                  key={plan.id}
                  className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 ${
                    newPlanId === plan.id ? "border-primary bg-muted/50" : ""
                  }`}
                >
                  <RadioGroupItem value={plan.id} />
                  <div className="flex-1">
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {plan.price !== null
                        ? `₹${Number(plan.price).toLocaleString("en-IN")}`
                        : "Free"}
                      {" · "}
                      {plan.num_sessions} Sessions
                      {" · "}
                      {plan.billing_cycle || "—"}
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="change-reason">Reason (optional)</Label>
            <Textarea
              id="change-reason"
              placeholder="e.g. Student upgraded plan"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!newPlanId || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Change Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdjustSessionsDialog({
  open,
  onOpenChange,
  subscription,
  mutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: StudentSubscriptionLite;
  mutation: UseMutationResult<
    StudentSubscriptionLite,
    any,
    { amount: number; reason: string },
    unknown
  >;
}) {
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const current = usableSessions(subscription);
  const parsed = Number(amount);
  const isInteger = Number.isInteger(parsed);
  const isPositive = parsed > 0;

  let preview = current;
  let valid = false;

  if (mode === "add" && isInteger && isPositive) {
    preview = current + parsed;
    valid = true;
  } else if (mode === "remove" && isInteger && isPositive) {
    preview = Math.max(0, current - parsed);
    valid = parsed <= current;
  } else if (mode === "set" && isInteger && isPositive) {
    preview = parsed;
    valid = true;
  }

  function reset() {
    setMode("add");
    setAmount("");
    setReason("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function submit() {
    if (!valid || !isInteger) return;
    let delta = 0;
    if (mode === "add") delta = parsed;
    else if (mode === "remove") delta = -parsed;
    else if (mode === "set") delta = preview - current;

    await mutation.mutateAsync({ amount: delta, reason });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Adjust Session Credits
          </DialogTitle>
          <DialogDescription>
            Manually adjust the student's remaining session balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Current remaining</span>
              <span className="font-medium">{current}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Adjustment type</Label>
            <RadioGroup value={mode} onValueChange={(v: any) => { setMode(v); setAmount(""); }}>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50 flex-1">
                  <RadioGroupItem value="add" />
                  <span className="text-sm">Add</span>
                </label>
                <label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50 flex-1">
                  <RadioGroupItem value="remove" />
                  <span className="text-sm">Remove</span>
                </label>
                <label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50 flex-1">
                  <RadioGroupItem value="set" />
                  <span className="text-sm">Set exact</span>
                </label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adjust-amount">
              {mode === "set" ? "New balance" : mode === "add" ? "Sessions to add" : "Sessions to remove"}
            </Label>
            <Input
              id="adjust-amount"
              type="number"
              min={1}
              placeholder={mode === "set" ? "30" : "5"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            <div className="flex justify-between font-medium text-foreground">
              <span>New balance</span>
              <span>{valid ? preview : current}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adjust-reason">Reason (required)</Label>
            <Textarea
              id="adjust-reason"
              placeholder="e.g. Compensation for cancelled session / Manual correction"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || !reason.trim() || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
