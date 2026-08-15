import { createFileRoute, Link } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, Shield, Video, Clock, Users } from "lucide-react";
import { useSearch } from "@/hooks/use-search";
import { SearchFiltersPanel } from "@/components/search-filters";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/student/explore")({
  component: Explore,
});

function Explore() {
  const { mentors, filters, isLoading, setFilters, resetFilters } = useSearch();

  return (
    <StudentLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Find your mentor</h1>
          <p className="text-muted-foreground">Real people, ready to teach.</p>
        </div>

        <SearchFiltersPanel
          filters={filters}
          onFilterChange={setFilters}
          onReset={resetFilters}
          resultsCount={mentors.length}
        />

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-3/4 rounded bg-muted" />
                        <div className="h-3 w-1/2 rounded bg-muted" />
                      </div>
                    </div>
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : mentors.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <Users className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold">No mentors match your filters</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your search criteria or clearing filters.
            </p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {mentors.map((m: any, index: number) => (
              <motion.div
                key={m.user_id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <Link to="/student/mentor/$id" params={{ id: m.user_id }}>
                  <Card className="h-full transition-all duration-200 hover:shadow-soft hover:border-primary/30 group">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={m.profile?.avatar_url || undefined}
                            alt={m.profile?.full_name || ""}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {m.profile?.full_name?.charAt(0) || "M"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold truncate">
                              {m.profile?.full_name ?? "Mentor"}
                            </span>
                            {m.is_verified && (
                              <Shield className="h-3.5 w-3.5 shrink-0 text-primary" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {m.profile?.state}
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                        {m.headline || m.bio}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t pt-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                          {Number(m.rating_avg).toFixed(1)}
                          <span className="text-xs text-muted-foreground">({m.total_reviews})</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {m.demo_lesson_url && <Video className="h-3.5 w-3.5" />}
                          {m.years_experience > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {m.years_experience}y
                            </span>
                          )}
                          <span className="text-sm font-semibold text-foreground">
                            ${Number(m.hourly_rate).toFixed(0)}
                            <span className="text-xs text-muted-foreground">/hr</span>
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </StudentLayout>
  );
}
