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
import type { MentorFilter, MentorSort } from "../services/mentor-service";
import type { MentorListState } from "../hooks/use-mentors";

interface MentorFiltersProps {
  state: MentorListState;
  onChange: (patch: Partial<MentorListState>) => void;
  resultCount: number;
  totalCount: number;
}

const FILTER_OPTIONS: Array<{ value: MentorFilter; label: string }> = [
  { value: "all", label: "All Mentors" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
  { value: "needs_attention", label: "Needs Attention" },
  { value: "available_today", label: "Available Today" },
  { value: "no_availability", label: "No Availability" },
  { value: "incomplete_profile", label: "Incomplete Profile" },
];

const SORT_OPTIONS: Array<{ value: MentorSort; label: string }> = [
  { value: "recently_joined", label: "Recently Joined" },
  { value: "recently_active", label: "Recently Active" },
  { value: "highest_rated", label: "Highest Rated" },
  { value: "most_sessions", label: "Most Sessions" },
  { value: "most_experienced", label: "Most Experienced" },
  { value: "best_availability", label: "Best Availability" },
  { value: "profile_completeness", label: "Profile Completeness" },
  { value: "needs_attention", label: "Needs Attention" },
];

export function MentorFilters({ state, onChange, resultCount, totalCount }: MentorFiltersProps) {
  const hasActiveFilter = state.filter !== "all";
  const clearFilters = () => {
    onChange({ filter: "all", sort: "recently_joined", page: 0 });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, language or skill..."
            value={state.search}
            onChange={(e) => onChange({ search: e.target.value, page: 0 })}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={state.filter}
            onValueChange={(v) => onChange({ filter: v as MentorFilter, page: 0 })}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
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
            onValueChange={(v) => onChange({ sort: v as MentorSort, page: 0 })}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
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
              ? "No mentors"
              : `${resultCount} of ${totalCount} mentor${totalCount !== 1 ? "s" : ""} shown`}
          </span>
          {hasActiveFilter && (
            <Badge variant="secondary" className="text-xs">
              {FILTER_OPTIONS.find((o) => o.value === state.filter)?.label}
            </Badge>
          )}
          {state.search && (
            <Badge variant="outline" className="text-xs">
              "{state.search}"
            </Badge>
          )}
        </div>
        {(hasActiveFilter || state.search) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
