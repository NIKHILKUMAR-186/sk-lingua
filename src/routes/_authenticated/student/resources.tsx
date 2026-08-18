import { createFileRoute, Link } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  ExternalLink,
  Download,
  Search,
  Bookmark,
  BookmarkCheck,
  ArrowUpDown,
  FileText,
  Video,
  Headphones,
  PenTool,
  Globe,
  BookMarked,
  GraduationCap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/skeleton-loader";
import { format } from "date-fns";
import { useStudentLearningState } from "@/hooks/use-student-learning-state";

const CATEGORIES = [
  { id: "all", label: "All", icon: BookOpen },
  { id: "grammar", label: "Grammar", icon: FileText },
  { id: "vocabulary", label: "Vocabulary", icon: BookMarked },
  { id: "pronunciation", label: "Pronunciation", icon: Video },
  { id: "listening", label: "Listening", icon: Headphones },
  { id: "reading", label: "Reading", icon: BookOpen },
  { id: "writing", label: "Writing", icon: PenTool },
  { id: "speaking", label: "Speaking", icon: GraduationCap },
  { id: "culture", label: "Culture", icon: Globe },
  { id: "homework", label: "Homework", icon: BookOpen },
] as const;

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const Route = createFileRoute("/_authenticated/student/resources")({
  component: Resources,
});

function Resources() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);

  const learningState = useStudentLearningState();

  const { data: resources = [], isLoading } = useQuery({
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
    if (activeCategory !== "all") {
      items = items.filter((r) => r.category === activeCategory);
    }
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
  }, [sessionResources, publicResources, showBookmarked, activeCategory, search, sortNewest]);

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

  const sessionResourceCount = sessionResources.length;
  const publicResourceCount = publicResources.length;

  return (
    <StudentLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Learning Library</h1>
          <p className="text-muted-foreground">
            Materials from your sessions and curated learning resources.
          </p>
        </div>

        {learningState.state === "TRIAL_REQUIRED" && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">Start with a demo</h3>
                  <p className="text-sm text-muted-foreground">
                    Book a demo session to access personalized learning materials.
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="shrink-0 gap-2">
                <Link to="/student/demo-session">
                  Book a Demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {learningState.state === "TRIAL_COMPLETED_NO_SUBSCRIPTION" && (
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-background">
            <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <Sparkles className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">Choose a plan</h3>
                  <p className="text-sm text-muted-foreground">
                    Get a subscription to unlock the full learning library.
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="shrink-0 gap-2">
                <Link to="/student/pricing">
                  View Plans
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Category tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5">
                <cat.icon className="h-3.5 w-3.5" />
                {cat.label}
                {cat.id === "homework" && sessionResourceCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {sessionResourceCount}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

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
          <div className="flex gap-2">
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
              <ArrowUpDown className="h-4 w-4 mr-1" />
              {sortNewest ? "Newest" : "Oldest"}
            </Button>
          </div>
        </div>

        {/* Resource list */}
        {isLoading ? (
          <ListSkeleton items={6} />
        ) : allResources.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No resources found"
            description={
              search
                ? "Try a different search term."
                : activeCategory === "homework"
                  ? "No homework shared yet. Resources will appear here after your sessions."
                  : "No resources in this category yet."
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {allResources.map((resource) => {
              const lang = LANGUAGES.find((l) => l.code === resource.language);
              return (
                <Card key={resource.id} className="transition hover:shadow-md group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
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
                                From session
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
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" /> Open
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
