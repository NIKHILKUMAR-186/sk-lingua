import { createFileRoute } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ExternalLink,
  Download,
  Search,
  Bookmark,
  BookmarkCheck,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/student/resources")({
  component: Resources,
});

const RESOURCE_CATEGORIES = [
  "All",
  "Grammar",
  "Vocabulary",
  "Pronunciation",
  "Listening",
  "Reading",
  "Writing",
  "Speaking",
  "Culture",
  "Exam Prep",
  "Homework",
];

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Resources() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);

  const { data: resources = [] } = useQuery({
    queryKey: ["student-resources", auth?.user?.id],
    enabled: !!auth?.user,
    queryFn: async () =>
      (
        await supabase
          .from("resources")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(60)
      ).data ?? [],
  });

  const sessionResources = resources.filter(
    (r) => r.visibility === "session" && r.student_id === auth?.user?.id,
  );
  const publicResources = resources.filter((r) => r.visibility === "public");

  const allResources = useMemo(() => {
    let items = [...sessionResources, ...publicResources];

    if (showBookmarked) items = items.filter((r) => r.is_bookmarked);
    if (category !== "All") items = items.filter((r) => r.category === category.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (r) => r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q),
      );
    }

    items.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortNewest ? db - da : da - db;
    });

    return items;
  }, [sessionResources, publicResources, showBookmarked, category, search, sortNewest]);

  async function toggleBookmark(id: string, current: boolean) {
    const { error } = await supabase
      .from("resources")
      .update({ is_bookmarked: !current })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["student-resources", auth?.user?.id] });
      toast.success(current ? "Bookmark removed" : "Bookmarked");
    }
  }

  return (
    <StudentLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Resources</h1>
          <p className="text-muted-foreground">
            Access materials shared by your mentors and session homework.
          </p>
        </div>

        {/* Search & filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-auto">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {RESOURCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Button
              variant={showBookmarked ? "default" : "outline"}
              size="sm"
              onClick={() => setShowBookmarked(!showBookmarked)}
            >
              {showBookmarked ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSortNewest(!sortNewest)}>
              <ArrowUpDown className="h-4 w-4 mr-1" /> {sortNewest ? "Newest" : "Oldest"}
            </Button>
          </div>
        </div>

        {/* Categories quick nav */}
        <div className="flex flex-wrap gap-2">
          {RESOURCE_CATEGORIES.slice(0, 6).map((cat) => (
            <Badge
              key={cat}
              variant={category === cat ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Resource list */}
        {allResources.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No resources found"
            description={search ? "Try a different search term." : "No resources available yet."}
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
            className="grid gap-4 md:grid-cols-2"
          >
            {allResources.map((resource) => {
              const lang = LANGUAGES.find((l) => l.code === resource.language);
              return (
                <motion.div
                  key={resource.id}
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                >
                  <Card className="transition hover:shadow-soft group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{resource.title}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {lang && (
                                <Badge variant="outline" className="text-[10px]">
                                  {lang.emoji} {lang.name}
                                </Badge>
                              )}
                              {resource.category && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {resource.category}
                                </Badge>
                              )}
                              {resource.visibility === "session" && (
                                <Badge variant="outline" className="text-[10px] text-primary">
                                  Protected
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleBookmark(resource.id, resource.is_bookmarked)}
                          >
                            {resource.is_bookmarked ? (
                              <BookmarkCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <Bookmark className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <a
                            href={resource.storage_url || resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                      {resource.description && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {resource.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {resource.file_name
                            ? `${resource.file_name} · ${formatBytes(resource.file_size)}`
                            : "External link"}
                        </span>
                        <a
                          href={resource.storage_url || resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline"
                        >
                          <Download className="h-3.5 w-3.5" /> Open
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </StudentLayout>
  );
}
