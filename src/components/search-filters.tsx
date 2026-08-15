import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Search, RotateCcw, Star, DollarSign } from "lucide-react";
import type { SearchFilters } from "@/hooks/use-search";
import { useState } from "react";

interface SearchFiltersProps {
  filters: SearchFilters;
  onFilterChange: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  onReset: () => void;
  resultsCount: number;
}

const CATEGORIES = [
  "Conversation",
  "Grammar",
  "Business",
  "Exam Prep",
  "Pronunciation",
  "Writing",
  "Reading",
  "Culture",
  "Academic",
  "Travel",
  "Kids",
  "Test Prep",
  "Interview Prep",
  "Debate",
  "Literature",
];

const LEVELS = ["beginner", "intermediate", "advanced", "all levels"];

export function SearchFiltersPanel({
  filters,
  onFilterChange,
  onReset,
  resultsCount,
}: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search mentors, skills, languages…"
            value={filters.query}
            onChange={(e) => onFilterChange("query", e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.sortBy}
            onChange={(e) => onFilterChange("sortBy", e.target.value as SearchFilters["sortBy"])}
          >
            <option value="rating">Top rated</option>
            <option value="price_low">Price: Low to high</option>
            <option value="price_high">Price: High to low</option>
            <option value="experience">Most experienced</option>
            <option value="popular">Most popular</option>
          </select>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            Filters
          </Button>
        </div>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Advanced filters</CardTitle>
              <Button variant="ghost" size="sm" onClick={onReset}>
                <RotateCcw className="mr-1 h-3 w-3" /> Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Price range */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Price range
                </Label>
                <div className="flex items-center gap-2 text-sm">
                  <span>${filters.minPrice}</span>
                  <Slider
                    min={0}
                    max={200}
                    step={5}
                    value={[filters.minPrice, filters.maxPrice]}
                    onValueChange={([min, max]) => {
                      onFilterChange("minPrice", min);
                      onFilterChange("maxPrice", max);
                    }}
                    className="flex-1"
                  />
                  <span>${filters.maxPrice}</span>
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3" /> Minimum rating
                </Label>
                <div className="flex items-center gap-2">
                  {[0, 3, 4, 4.5].map((rating) => (
                    <Button
                      key={rating}
                      size="sm"
                      variant={filters.minRating === rating ? "default" : "outline"}
                      onClick={() => onFilterChange("minRating", rating)}
                      className="text-xs"
                    >
                      {rating === 0 ? "Any" : `${rating}+`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Experience</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={filters.maxExperience}
                  onChange={(e) => onFilterChange("maxExperience", Number(e.target.value))}
                >
                  <option value={20}>Any experience</option>
                  <option value={1}>Less than 1 year</option>
                  <option value={3}>1-3 years</option>
                  <option value={5}>3-5 years</option>
                  <option value={10}>5-10 years</option>
                  <option value={100}>10+ years</option>
                </select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={filters.category}
                  onChange={(e) => onFilterChange("category", e.target.value)}
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Level */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Difficulty level</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={filters.level}
                  onChange={(e) => onFilterChange("level", e.target.value)}
                >
                  <option value="">All levels</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Verified */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Verified only</div>
                  <div className="text-xs text-muted-foreground">Identity verified mentors</div>
                </div>
                <Switch
                  checked={filters.verifiedOnly}
                  onCheckedChange={(v) => onFilterChange("verifiedOnly", v)}
                />
              </div>

              {/* Demo available */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Demo lesson</div>
                  <div className="text-xs text-muted-foreground">Has demo video</div>
                </div>
                <Switch
                  checked={filters.demoAvailable}
                  onCheckedChange={(v) => onFilterChange("demoAvailable", v)}
                />
              </div>

              {/* Results count */}
              <div className="flex items-center justify-center rounded-lg border p-3">
                <div className="text-center">
                  <div className="text-2xl font-display font-bold text-primary">{resultsCount}</div>
                  <div className="text-xs text-muted-foreground">mentors found</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active filter badges */}
      <div className="flex flex-wrap gap-2">
        {filters.minRating > 0 && (
          <Badge variant="secondary">
            <Star className="mr-0.5 h-3 w-3" /> {filters.minRating}+
            <button
              onClick={() => onFilterChange("minRating", 0)}
              className="ml-1 hover:text-foreground"
            >
              &times;
            </button>
          </Badge>
        )}
        {filters.verifiedOnly && (
          <Badge variant="secondary">
            Verified
            <button
              onClick={() => onFilterChange("verifiedOnly", false)}
              className="ml-1 hover:text-foreground"
            >
              &times;
            </button>
          </Badge>
        )}
        {filters.demoAvailable && (
          <Badge variant="secondary">
            Demo available
            <button
              onClick={() => onFilterChange("demoAvailable", false)}
              className="ml-1 hover:text-foreground"
            >
              &times;
            </button>
          </Badge>
        )}
        {filters.category && (
          <Badge variant="secondary">
            {filters.category}
            <button
              onClick={() => onFilterChange("category", "")}
              className="ml-1 hover:text-foreground"
            >
              &times;
            </button>
          </Badge>
        )}
      </div>
    </div>
  );
}
