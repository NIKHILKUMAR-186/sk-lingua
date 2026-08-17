import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudentFilter, StudentSort } from "../services/student-service";
import type { StudentListState } from "../hooks/use-students";

interface StudentFiltersProps {
  state: StudentListState;
  onChange: (patch: Partial<StudentListState>) => void;
  resultCount: number;
  totalCount: number;
}

const FILTER_OPTIONS: Array<{ value: StudentFilter; label: string }> = [
  { value: "all", label: "All Students" },
  { value: "active_subscription", label: "Subscribed" },
  { value: "no_subscription", label: "No Subscription" },
  { value: "expired_subscription", label: "Expired Subscription" },
  { value: "active_account", label: "Active Account" },
  { value: "suspended_account", label: "Suspended Account" },
];

const SORT_OPTIONS: Array<{ value: StudentSort; label: string }> = [
  { value: "recently_joined", label: "Recently Joined" },
  { value: "recently_active", label: "Recently Active" },
  { value: "oldest", label: "Oldest" },
  { value: "least_active", label: "Least Active" },
  { value: "most_sessions", label: "Most Sessions" },
  { value: "least_sessions", label: "Least Sessions" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "low_balance", label: "Low Session Balance" },
  { value: "name", label: "Name A–Z" },
];

export function StudentFilters({ state, onChange, resultCount, totalCount }: StudentFiltersProps) {
  // Debounce the search box so we query the backend (not React) per keystroke.
  const [draft, setDraft] = useState(state.search);
  useEffect(() => {
    setDraft(state.search);
  }, [state.search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (draft !== state.search) onChange({ search: draft, page: 0 });
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const hasActiveFilter = state.filter !== "all";
  const clearFilters = () => {
    setDraft("");
    onChange({ search: "", filter: "all", sort: "recently_joined", page: 0 });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="pl-9"
            aria-label="Search students"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={state.filter}
            onValueChange={(v) => onChange({ filter: v as StudentFilter, page: 0 })}
          >
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={state.sort}
            onValueChange={(v) => onChange({ sort: v as StudentSort, page: 0 })}
          >
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {totalCount === 0
              ? "No students"
              : `${resultCount} of ${totalCount} student${totalCount !== 1 ? "s" : ""} shown`}
          </span>
          {hasActiveFilter && (
            <Badge variant="secondary" className="text-xs">
              {FILTER_OPTIONS.find((o) => o.value === state.filter)?.label}
            </Badge>
          )}
          {state.search && (
            <Badge variant="outline" className="text-xs">
              &ldquo;{state.search}&rdquo;
            </Badge>
          )}
        </div>
        {(hasActiveFilter || state.search || state.sort !== "recently_joined") && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
