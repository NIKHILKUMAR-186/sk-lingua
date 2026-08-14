import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardSkeleton } from "@/components/skeleton-loader";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/subscriptions";
import {
  useAdminPlans,
  useCreatePlan,
  useSetPlanActive,
  useUpdatePlan,
} from "@/hooks/use-subscriptions";

export const Route = createFileRoute("/_authenticated/admin/subscription-plans")({
  component: AdminSubscriptionPlans,
});

const BILLING_CYCLE_OPTIONS = ["once", "weekly", "monthly", "quarterly", "yearly"] as const;

interface PlanDialogState {
  name: string;
  description: string;
  price: string;
  num_sessions: string;
  validity_days: string;
  sort_order: string;
  billing_cycle: string;
  is_active: boolean;
  recommended: boolean;
}

const EMPTY_FORM: PlanDialogState = {
  name: "",
  description: "",
  price: "",
  num_sessions: "",
  validity_days: "",
  sort_order: "0",
  billing_cycle: "monthly",
  is_active: true,
  recommended: false,
};

function planToForm(plan: SubscriptionPlan): PlanDialogState {
  return {
    name: plan.name,
    description: plan.description ?? "",
    price: String(plan.price),
    num_sessions: String(plan.num_sessions),
    validity_days: plan.validity_days != null ? String(plan.validity_days) : "",
    sort_order: String(plan.sort_order ?? 0),
    billing_cycle: plan.billing_cycle,
    is_active: plan.is_active,
    recommended: plan.recommended,
  };
}

// Client-side validation mirroring the database CHECK constraints.
function validatePlanForm(form: PlanDialogState): string | null {
  if (!form.name.trim()) return "Plan name is required.";

  if (form.price === "" || Number.isNaN(Number(form.price))) {
    return "Price is required.";
  }
  if (Number(form.price) < 0) return "Price must be 0 or greater.";

  if (form.num_sessions === "" || Number.isNaN(Number(form.num_sessions))) {
    return "Session count is required.";
  }
  if (Number(form.num_sessions) <= 0) return "Session count must be greater than 0.";

  if (form.validity_days === "" || Number.isNaN(Number(form.validity_days))) {
    return "Validity is required.";
  }
  if (Number(form.validity_days) <= 0) return "Validity must be greater than 0.";

  if (
    form.sort_order !== "" &&
    (Number.isNaN(Number(form.sort_order)) || !Number.isInteger(Number(form.sort_order)))
  ) {
    return "Display order must be a whole number.";
  }

  return null;
}

function PlanFormDialog({
  open,
  onOpenChange,
  plan,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  isSubmitting: boolean;
  onSubmit: (form: PlanDialogState) => void;
}) {
  const [form, setForm] = useState<PlanDialogState>(plan ? planToForm(plan) : EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form whenever the dialog is (re)opened for a target plan.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setFormError(null);
      onOpenChange(false);
      return;
    }
    setForm(plan ? planToForm(plan) : EMPTY_FORM);
    setFormError(null);
    onOpenChange(true);
  }

  function set<K extends keyof PlanDialogState>(key: K, value: PlanDialogState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    const error = validatePlanForm(form);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit Plan" : "Create Plan"}</DialogTitle>
          <DialogDescription>
            {plan
              ? "Update the plan details below. Changes are saved to the database."
              : "Create a new subscription plan. Only active plans are shown to students."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">
              Plan Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="plan-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Starter"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">Description</Label>
            <Textarea
              id="plan-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short description shown on the card"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan-price">
                Price (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan-price"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="49"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-billing-cycle">Billing Cycle</Label>
              <Select value={form.billing_cycle} onValueChange={(v) => set("billing_cycle", v)}>
                <SelectTrigger id="plan-billing-cycle" className="w-full">
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLE_OPTIONS.map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {cycle[0].toUpperCase() + cycle.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan-sessions">
                Sessions <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan-sessions"
                type="number"
                min={1}
                step={1}
                value={form.num_sessions}
                onChange={(e) => set("num_sessions", e.target.value)}
                placeholder="22"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-validity">
                Validity (days) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan-validity"
                type="number"
                min={1}
                step={1}
                value={form.validity_days}
                onChange={(e) => set("validity_days", e.target.value)}
                placeholder="30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-sort-order">Display Order</Label>
            <Input
              id="plan-sort-order"
              type="number"
              step={1}
              value={form.sort_order}
              onChange={(e) => set("sort_order", e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers are shown first. Defaults to 0.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="plan-active">Active</Label>
              <p className="text-xs text-muted-foreground">Active plans are visible to students.</p>
            </div>
            <Switch
              id="plan-active"
              checked={form.is_active}
              onCheckedChange={(v) => set("is_active", v)}
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {plan ? "Save Changes" : "Create Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminSubscriptionPlans() {
  const { data: plans = [], isLoading, isError, refetch } = useAdminPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const setPlanActive = useSetPlanActive();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const anyBusy = createPlan.isPending || updatePlan.isPending || setPlanActive.isPending;

  function handleCreate(form: PlanDialogState) {
    createPlan.mutate(
      {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        num_sessions: Number(form.num_sessions),
        validity_days: Number(form.validity_days),
        billing_cycle: form.billing_cycle,
        sort_order: Number(form.sort_order || 0),
        is_active: form.is_active,
        recommended: form.recommended,
      },
      {
        onSuccess: () => setIsCreateOpen(false),
      },
    );
  }

  function handleEdit(form: PlanDialogState) {
    if (!editingPlan) return;
    updatePlan.mutate(
      {
        planId: editingPlan.id,
        input: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          price: Number(form.price),
          num_sessions: Number(form.num_sessions),
          validity_days: Number(form.validity_days),
          billing_cycle: form.billing_cycle,
          sort_order: Number(form.sort_order || 0),
          is_active: form.is_active,
          recommended: form.recommended,
        },
      },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          setEditingPlan(null);
        },
      },
    );
  }

  function openEdit(plan: SubscriptionPlan) {
    setEditingPlan(plan);
    setIsEditOpen(true);
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display">Subscription Plans</h1>
            <p className="text-muted-foreground">
              Manage subscription plans and pricing. Deactivate instead of deleting so historical
              subscriptions stay intact.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} rows={4} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-10 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium">Could not load plans.</p>
              <p className="text-sm text-muted-foreground">
                Please try again. If this persists, check your connection.
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-10 text-center">
            <div className="text-4xl">📋</div>
            <div>
              <p className="font-medium">No subscription plans yet.</p>
              <p className="text-sm text-muted-foreground">
                Create your first plan to start offering sessions to students.
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first plan
            </Button>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              >
                <Card className={plan.is_active ? "" : "opacity-70"}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle>{plan.name}</CardTitle>
                          {plan.recommended && <Badge variant="default">Popular</Badge>}
                        </div>
                        <p className="text-2xl font-bold text-primary mt-2">
                          ₹{Number(plan.price).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <Badge variant={plan.is_active ? "default" : "secondary"}>
                        {plan.is_active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plan.description && (
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    )}
                    <div className="text-sm">
                      <span className="font-medium">{plan.num_sessions}</span> sessions
                      {plan.validity_days != null && (
                        <span> • {plan.validity_days} days validity</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEdit(plan)}
                        disabled={anyBusy}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant={plan.is_active ? "outline" : "default"}
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          setPlanActive.mutate({ planId: plan.id, isActive: !plan.is_active })
                        }
                        disabled={anyBusy}
                      >
                        {plan.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <PlanFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        plan={null}
        isSubmitting={createPlan.isPending}
        onSubmit={handleCreate}
      />

      <PlanFormDialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingPlan(null);
        }}
        plan={editingPlan}
        isSubmitting={updatePlan.isPending}
        onSubmit={handleEdit}
      />
    </AdminLayout>
  );
}
