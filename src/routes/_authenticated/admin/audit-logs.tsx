import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Search, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/audit-logs")({
  component: AdminAuditLogs,
});

function AdminAuditLogs() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const client = supabase as any;

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs", scopeFilter, actionFilter, search],
    enabled: !!auth?.user && (auth.roles ?? []).includes("admin"),
    queryFn: async () => {
      let query = client.from("audit_logs").select("*");
      if (scopeFilter) query = query.eq("scope", scopeFilter);
      if (actionFilter) query = query.eq("action", actionFilter);
      if (search) {
        query = query.or(`description.ilike.%${search}%,action.ilike.%${search}%,scope.ilike.%${search}%`);
      }
      const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!auth?.user)
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!(auth.roles ?? []).includes("admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Access denied — admin role required.</p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Immutable system audit trail. Read-only.</p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="Scope (e.g. mentor_profiles)"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="w-48"
            />
            <Input
              placeholder="Action (e.g. approve)"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-48"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading logs…</div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <Filter className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No audit logs found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log: any) => (
              <Card key={log.id}>
                <CardContent className="flex items-start justify-between p-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{log.scope}</Badge>
                      <Badge variant="secondary" className="text-xs">{log.action}</Badge>
                      {log.actor_role && <Badge variant="outline" className="text-xs">{log.actor_role}</Badge>}
                    </div>
                    <div className="text-sm">{log.description || log.action}</div>
                    {log.target_entity && (
                      <div className="text-xs text-muted-foreground">
                        Target: {log.target_entity} {log.target_id ? `(${log.target_id})` : ""}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                      {log.ip_address ? ` • IP: ${log.ip_address}` : ""}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
