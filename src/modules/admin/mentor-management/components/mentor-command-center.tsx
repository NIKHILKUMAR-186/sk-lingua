import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  useMentorList,
  useMentorStats,
  type MentorListState,
  DEFAULT_MENTOR_LIST_STATE,
} from "../hooks/use-mentors";
import { MentorMetrics } from "./mentor-metrics";
import { MentorFilters } from "./mentor-filters";
import { MentorDirectory } from "./mentor-directory";
import { MentorEmptyState } from "./mentor-empty-state";
import { ListSkeleton } from "./mentor-skeletons";
import { PageHeader } from "./page-header";

const FILTER_LABELS: Record<string, string> = {
  all: "All Mentors",
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  verified: "Verified",
  unverified: "Unverified",
  needs_attention: "Needs Attention",
  available_today: "Available Today",
  no_availability: "No Availability",
  incomplete_profile: "Incomplete Profile",
};

export function MentorCommandCenter() {
  const navigate = useNavigate();
  const location = useLocation();

  const parseInitialState = (): MentorListState => {
    const params = new URLSearchParams(location.search);
    return {
      search: params.get("search") || "",
      filter: (params.get("filter") as MentorListState["filter"]) || "all",
      sort: (params.get("sort") as MentorListState["sort"]) || "recently_joined",
      page: Number(params.get("page") || "0"),
      limit: DEFAULT_MENTOR_LIST_STATE.limit,
    };
  };

  const [state, setState] = useState<MentorListState>(parseInitialState);

  useEffect(() => {
    const params = new URLSearchParams();
    if (state.search) params.set("search", state.search);
    if (state.filter !== "all") params.set("filter", state.filter);
    if (state.sort !== "recently_joined") params.set("sort", state.sort);
    if (state.page > 0) params.set("page", String(state.page));
    const qs = params.toString();
    navigate({ to: `/admin/mentors${qs ? `?${qs}` : ""}`, replace: true });
  }, [state, navigate]);

  const onChange = (patch: Partial<MentorListState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const offset = state.page * state.limit;

  const { data: listData, isLoading: listLoading, isError: listError } = useMentorList(state);
  const { data: stats, isLoading: statsLoading, isError: statsError } = useMentorStats();

  const filterLabel = state.filter !== "all" ? FILTER_LABELS[state.filter] : undefined;
  const mentors = listData?.mentors || [];
  const total = listData?.total || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mentor Command Center"
        description="View and manage every mentor in the Lingua network. Click a metric to filter."
        stats={{ total, statsLoading }}
      />

      {statsLoading ? (
        <MetricsSkeleton />
      ) : statsError ? (
        <p className="text-sm text-destructive">Unable to load mentor metrics.</p>
      ) : stats ? (
        <>
          <MentorMetrics stats={stats} />
          {stats.degraded && stats.degraded.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Some stats were estimated because {stats.degraded.map((d) => d.section).join(", ")}{" "}
              could not be read.
            </p>
          )}
        </>
      ) : null}

      <MentorFilters
        state={state}
        onChange={onChange}
        resultCount={mentors.length}
        totalCount={total}
      />

      {listLoading ? (
        <ListSkeleton />
      ) : listError ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Unable to load mentors. Please refresh the page.
        </div>
      ) : mentors.length > 0 ? (
        <MentorDirectory
          mentors={mentors}
          total={total}
          limit={state.limit}
          offset={offset}
          onPageChange={(p) => onChange({ page: p })}
          currentFilterLabel={filterLabel}
        />
      ) : (
        <MentorEmptyState
          title="No mentors found"
          description={
            state.search ? "Try a different search term." : "No mentors match your filters."
          }
        />
      )}
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ListSkeleton key={i} items={1} />
      ))}
    </div>
  );
}
