import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Eye, Search, Filter, FileText, Mail, Phone, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { APPLICATION_STATUS_LABELS } from "@/lib/mentorApplications";

export const Route = createFileRoute("/_authenticated/admin/mentor-applications")({
  component: AdminMentorApplications,
});

function AdminMentorApplications() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["admin-mentor-applications", statusFilter],
    enabled: !!auth?.user,
    queryFn: async () => {
      let query = supabase
        .from("mentor_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  const filteredApplications = applications.filter((app: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      app.full_name?.toLowerCase().includes(searchLower) ||
      app.email?.toLowerCase().includes(searchLower) ||
      app.application_id_display?.toLowerCase().includes(searchLower)
    );
  });

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    submitted: "default",
    under_review: "outline",
    interview_scheduled: "default",
    interview_completed: "outline",
    approved: "default",
    rejected: "destructive",
    active: "default",
  };

  const stats = {
    total: applications.length,
    submitted: applications.filter((a: any) => a.status === "submitted").length,
    underReview: applications.filter((a: any) => a.status === "under_review").length,
    approved: applications.filter((a: any) => a.status === "approved").length,
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Mentor Applications</h1>
          <p className="text-sm text-muted-foreground">
            Review and manage mentor applications
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Total Applications</div>
              <div className="mt-1 text-2xl font-display">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">New Submissions</div>
              <div className="mt-1 text-2xl font-display text-blue-600">{stats.submitted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Under Review</div>
              <div className="mt-1 text-2xl font-display text-amber-600">{stats.underReview}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Approved</div>
              <div className="mt-1 text-2xl font-display text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or application ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                  <SelectItem value="interview_completed">Interview Completed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Applications List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              Loading applications...
            </CardContent>
          </Card>
        ) : filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              {search || statusFilter !== "all" ? "No applications match your filters" : "No applications yet"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredApplications.map((app: any, index: number) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:shadow-md transition-all duration-200">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base truncate">{app.full_name}</h3>
                          <Badge variant={statusColors[app.status] || "secondary"}>
                            {APPLICATION_STATUS_LABELS[app.status] || app.status}
                          </Badge>
                        </div>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{app.email}</span>
                          </div>
                          {app.phone_number && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{app.phone_number}</span>
                            </div>
                          )}
                          {(app.city || app.state || app.country) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate">
                                {[app.city, app.state, app.country].filter(Boolean).join(", ")}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs">
                            <FileText className="h-3.5 w-3.5" />
                            <span>{app.application_id_display || app.id}</span>
                            <span className="text-border">|</span>
                            <span>{new Date(app.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/admin/mentor-applications/${app.id}` as any}>
                          <Eye className="mr-2 h-4 w-4" />
                          Review
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}