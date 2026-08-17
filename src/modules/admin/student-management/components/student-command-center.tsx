import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  useStudentList,
  useStudentStats,
  type StudentListState,
  DEFAULT_STUDENT_LIST_STATE,
} from "../hooks/use-students";
import { StudentMetrics } from "./student-metrics";
import { StudentFilters } from "./student-filters";
import { StudentDirectory } from "./student-directory";
import { StudentEmptyState } from "./student-empty-state";
import { StudentListSkeleton, StudentMetricsSkeleton } from "./student-skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { useStudentRisks } from "@/hooks/use-admin-operations";
import { Link } from "@tanstack/react-router";

const FILTER_LABELS: Record<string, string> = {
  all: "All Students",
  active_subscription: "Subscribed",
  no_subscription: "No Subscription",
  expired_subscription: "Expired Subscription",
  active_account: "Active Account",
  suspended_account: "Suspended Account",
};

export function StudentCommandCenter() {
  const navigate = useNavigate();
  const location = useLocation();

  const parseInitialState = (): StudentListState => {
    const params = new URLSearchParams(location.search);
    return {
      search: params.get("search") || "",
      filter: (params.get("filter") as StudentListState["filter"]) || "all",
      sort: (params.get("sort") as StudentListState["sort"]) || "recently_joined",
      page: Number(params.get("page") || "0"),
      limit: DEFAULT_STUDENT_LIST_STATE.limit,
    };
  };

  const [state, setState] = useState<StudentListState>(parseInitialState);

  useEffect(() => {
    const params = new URLSearchParams();
    if (state.search) params.set("search", state.search);
    if (state.filter !== "all") params.set("filter", state.filter);
    if (state.sort !== "recently_joined") params.set("sort", state.sort);
    if (state.page > 0) params.set("page", String(state.page));
    const qs = params.toString();
    navigate({ to: `/admin/students${qs ? `?${qs}` : ""}`, replace: true });
  }, [state, navigate]);

  const onChange = (patch: Partial<StudentListState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const offset = state.page * state.limit;

  const { data: listData, isLoading: listLoading, isError: listError } = useStudentList(state);
  const { data: stats, isLoading: statsLoading, isError: statsError } = useStudentStats();
  const { data: risksData, isLoading: risksLoading } = useStudentRisks();

  const filterLabel = state.filter !== "all" ? FILTER_LABELS[state.filter] : undefined;
  const students = listData?.students || [];
  const total = listData?.total || 0;
  const activeAccounts = listData?.stats?.activeAccounts;
  const risks = risksData?.risks ?? [];
  const highRisks = risks.filter((r) => r.risk_level === "high");
  const mediumRisks = risks.filter((r) => r.risk_level === "medium");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-display tracking-tight">Student Command Center</h1>
          {!listData && (
            <span className="inline-flex items-center rounded-md bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {total} students
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Understand and operate every learner. Click a metric to filter the directory.
        </p>
      </div>

      {(highRisks.length > 0 || mediumRisks.length > 0) && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-900">
              <ShieldAlert className="h-4 w-4" /> Student Attention Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {highRisks.slice(0, 5).map((r) => (
              <Link key={r.user_id} to={`/admin/students/${r.user_id}`} className="block text-xs hover:underline">
                <span className="font-medium">{r.full_name || r.email || r.user_id}</span>
                {" — "}
                {r.signals.join(", ")}
              </Link>
            ))}
            {mediumRisks.length > 0 && (
              <p className="text-xs text-muted-foreground">
                +{mediumRisks.length} more students with medium risk signals.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {statsLoading ? (
        <StudentMetricsSkeleton />
      ) : statsError ? (
        <p className="text-sm text-destructive">Unable to load student metrics.</p>
      ) : stats ? (
        <StudentMetrics stats={stats} activeAccounts={activeAccounts} />
      ) : null}

      <StudentFilters
        state={state}
        onChange={onChange}
        resultCount={students.length}
        totalCount={total}
      />

      {listLoading ? (
        <StudentListSkeleton />
      ) : listError ? (
        <div className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">
          Unable to load students. Please refresh the page.
        </div>
      ) : students.length > 0 ? (
        <StudentDirectory
          students={students}
          total={total}
          limit={state.limit}
          offset={offset}
          onPageChange={(p) => onChange({ page: p })}
        />
      ) : (
        <StudentEmptyState
          title="No students found"
          description={
            state.search
              ? "Try a different name or email."
              : filterLabel
                ? `No students match the "${filterLabel}" filter.`
                : "No students match your current filters."
          }
        />
      )}
    </div>
  );
}
