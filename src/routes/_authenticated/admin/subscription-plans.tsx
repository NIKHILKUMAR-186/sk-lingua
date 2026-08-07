import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ListSkeleton } from "@/components/skeleton-loader";

export const Route = createFileRoute("/_authenticated/admin/subscription-plans")({
  component: AdminSubscriptionPlans,
});

function AdminSubscriptionPlans() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin-subscription-plans"],
    enabled: !!auth?.user,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price", { ascending: true });
      return data ?? [];
    },
  });

  async function toggleActive(planId: string, isActive: boolean) {
    const { error } = await supabase
      .from("subscription_plans")
      .update({ is_active: !isActive })
      .eq("id", planId);
    if (error) toast.error(error.message);
    else {
      toast.success(`Plan ${!isActive ? "activated" : "deactivated"}`);
      qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
    }
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Subscription Plans</h1>
          <p className="text-muted-foreground">Manage subscription plans and pricing.</p>
        </div>

        {isLoading ? (
          <ListSkeleton items={3} />
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
                <Card className={plan.is_active ? "" : "opacity-60"}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{plan.name}</CardTitle>
                        <p className="text-2xl font-bold text-primary mt-2">₹{plan.price}</p>
                      </div>
                      <Badge variant={plan.is_active ? "default" : "secondary"}>
                        {plan.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="text-sm">
                      <span className="font-medium">{plan.num_sessions}</span> sessions
                      {plan.validity_days && <span> • {plan.validity_days} days validity</span>}
                    </div>
                    <Button
                      variant={plan.is_active ? "outline" : "default"}
                      size="sm"
                      className="w-full"
                      onClick={() => toggleActive(plan.id, plan.is_active)}
                    >
                      {plan.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}