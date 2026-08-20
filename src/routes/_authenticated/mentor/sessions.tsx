import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/mentor/page-header";
import { MentorSectionHeader } from "@/components/mentor-design/MentorSectionHeader";
import { MentorEmptyState } from "@/components/mentor-design/MentorEmptyState";
import { MentorStatusBadge } from "@/components/mentor-design/MentorStatusBadge";
import { MentorDateChip } from "@/components/mentor-design/MentorDateChip";
import { MentorAvatar } from "@/components/mentor-design/MentorAvatar";
import { MentorPageContainer } from "@/components/mentor-design/MentorPageContainer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, FileUp, Loader2, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ResourceUpload } from "@/components/resource-upload";
import { uploadStorageFile } from "@/lib/storage";
import { mapCompletionError } from "@/lib/booking";
import { format, parseISO, isToday, isTomorrow } from "date-fns";

export const Route = createFileRoute("/_authenticated/mentor/sessions")({
  component: MentorSessions,
});

function MentorSessions() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const uid = auth?.user?.id;
  const { data: sessions = [] } = useQuery({
    queryKey: ["mentor-all-sessions", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("sessions")
          .select("*")
          .eq("mentor_id", uid!)
          .order("scheduled_time", { ascending: false })
      ).data ?? [],
  });

  const sessionStudentIds = useMemo(
    () => [...new Set(sessions.map((s) => s.student_id).filter(Boolean))],
    [sessions],
  );
  const { data: sessionStudents = [] } = useQuery({
    queryKey: ["mentor-session-students", sessionStudentIds.join(",")],
    enabled: sessionStudentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").in("id", sessionStudentIds);
      return data ?? [];
    },
  });
  const sessionStudentMap = useMemo(
    () => new Map(sessionStudents.map((s) => [s.id, s])),
    [sessionStudents],
  );
  const { data: sharedResources = [] } = useQuery({
    queryKey: ["mentor-shared-resources", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("resources")
          .select("*")
          .eq("mentor_id", uid!)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceVisibility, setResourceVisibility] = useState<"public" | "session" | "private">(
    "session",
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});

  async function complete(id: string) {
    if (!uid) return;
    const { data, error } = await supabase
      .from("sessions")
      .update({ status: "completed" })
      .eq("id", id)
      .eq("mentor_id", uid)
      .in("status", ["accepted", "confirmed"])
      .select("id");

    if (error) {
      toast.error(mapCompletionError(error.message));
      return;
    }
    if (!data || data.length === 0) {
      toast.info("This session was already completed.");
      return;
    }
    toast.success("Marked complete — one session credit consumed.");
    qc.invalidateQueries({ queryKey: ["mentor-all-sessions", uid] });
  }

  async function shareHomework() {
    if (!uid || !activeSessionId) return;
    if (!resourceTitle) {
      toast.error("Title is required.");
      return;
    }
    if (!selectedFile && !resourceUrl) {
      toast.error("Please upload a file or add an external URL.");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    let storageUrl: string | null = null;
    let storagePath: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;
    let fileSize: number | null = null;

    try {
      if (selectedFile) {
        const upload = await uploadStorageFile(
          selectedFile,
          `mentor/${uid}/homework/${activeSessionId}`,
        );
        storageUrl = upload.publicUrl;
        storagePath = upload.path;
        fileName = upload.fileName;
        fileType = upload.fileType;
        fileSize = upload.fileSize;
      }

      setUploadProgress(60);
      const session = sessions.find((entry) => entry.id === activeSessionId);
      const { error } = await supabase.from("resources").insert({
        mentor_id: uid,
        title: resourceTitle,
        description: resourceDescription || null,
        visibility: resourceVisibility,
        resource_type: selectedFile ? "file" : "link",
        url: resourceUrl || storageUrl || "",
        storage_url: storageUrl,
        storage_path: storagePath,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        session_id: activeSessionId,
        student_id: session?.student_id ?? null,
        created_by: uid,
        is_public: resourceVisibility === "public",
        shared_with: session?.student_id ?? null,
      });
      setUploading(false);
      setUploadProgress(100);
      if (error) throw error;
      toast.success("Homework shared with the student");
      setResourceTitle("");
      setResourceUrl("");
      setResourceDescription("");
      setResourceVisibility("session");
      setActiveSessionId(null);
      setSelectedFile(null);
      qc.invalidateQueries({ queryKey: ["student-dashboard-resources", session?.student_id] });
      qc.invalidateQueries({ queryKey: ["mentor-shared-resources", uid] });
    } catch (error) {
      setUploading(false);
      setUploadProgress(0);
      toast.error((error as Error).message ?? "Unable to share homework");
    }
  }

  async function saveNotes(id: string) {
    if (!uid) return;
    const notes = notesDrafts[id] ?? "";
    const { error } = await supabase.from("sessions").update({ notes }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Session notes saved");
      qc.invalidateQueries({ queryKey: ["mentor-all-sessions", uid] });
    }
  }

  const upcoming = sessions.filter((s) => s.status === "accepted" || s.status === "confirmed");
  const todayList = upcoming.filter((s) => {
    const dt = parseISO(s.scheduled_time);
    return isToday(dt);
  });
  const past = sessions.filter((s) => ["completed", "rejected", "cancelled"].includes(s.status));

  return (
    <MentorLayout>
      <MentorPageContainer>
        <PageHeader
          title="Sessions"
          description="Your upcoming, today, and past sessions."
          action={
            activeSessionId && (
              <Button variant="outline" size="sm" onClick={() => setActiveSessionId(null)}>
                Cancel sharing
              </Button>
            )
          }
        />

        {activeSessionId && (
          <div className="mentor-card p-5">
            <p className="mentor-section-label mb-3">Share homework for this session</p>
            <ResourceUpload
              title={resourceTitle}
              url={resourceUrl}
              description={resourceDescription}
              visibility={resourceVisibility}
              sessionId={activeSessionId}
              fileName={selectedFile?.name || ""}
              fileSize={selectedFile?.size ?? 0}
              uploadProgress={uploadProgress}
              uploading={uploading}
              sessions={sessions
                .filter((session) => session.status === "completed")
                .map((session) => ({
                  id: session.id,
                  label: `${format(parseISO(session.scheduled_time), "MMM d, yyyy")} · ${session.student_id?.slice(0, 8) ?? "student"}`,
                }))}
              onChangeTitle={setResourceTitle}
              onChangeUrl={setResourceUrl}
              onChangeDescription={setResourceDescription}
              onChangeVisibility={setResourceVisibility}
              onChangeSessionId={setActiveSessionId}
              onChangeFile={setSelectedFile}
              onUpload={shareHomework}
              onClear={() => setSelectedFile(null)}
            />
          </div>
        )}

        {/* Today */}
        <section>
          <MentorSectionHeader
            title="Today"
            className="mb-4"
          />
          {todayList.length === 0 ? (
            <div className="mentor-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No sessions scheduled today.</p>
            </div>
          ) : (
            <div className="mentor-card divide-y divide-border/60">
              {todayList.map((s) => {
                const start = parseISO(s.scheduled_time);
                const student = sessionStudentMap.get(s.student_id);
                return (
                  <div
                    key={s.id}
                    className="mentor-timeline-item"
                    onClick={() => navigate({ to: "/mentor/session/$id", params: { id: s.id } })}
                  >
                    <span className="text-sm font-medium text-muted-foreground tabular-nums w-16 shrink-0">
                      {format(start, "h:mm a")}
                    </span>
                    <div className="h-2 w-2 rounded-full bg-electric-iris shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {student?.full_name || "Student"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(s as any).gig?.title || "Session"} · {s.duration_mins} min
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {s.video_call_link && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(s.video_call_link!, "_blank");
                          }}
                        >
                          <Video className="mr-1 h-3.5 w-3.5" />
                          Join
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate({ to: "/mentor/session/$id", params: { id: s.id } });
                        }}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Upcoming */}
        <section>
          <MentorSectionHeader
            title="Upcoming"
            className="mb-4"
          />
          {upcoming.length === 0 ? (
            <div className="mentor-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
            </div>
          ) : (
            <div className="mentor-card divide-y divide-border/60">
              {upcoming.map((s) => {
                const start = parseISO(s.scheduled_time);
                const student = sessionStudentMap.get(s.student_id);
                const dayLabel = isToday(start)
                  ? "Today"
                  : isTomorrow(start)
                    ? "Tomorrow"
                    : format(start, "EEE, MMM d");

                return (
                  <div
                    key={s.id}
                    className="mentor-session-row"
                    onClick={() => navigate({ to: "/mentor/session/$id", params: { id: s.id } })}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {student?.full_name || "Student"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dayLabel} · {format(start, "h:mm a")} · {s.duration_mins} min
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize shrink-0">
                      {s.status === "accepted" || s.status === "confirmed" ? "Confirmed" : s.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past */}
        <section>
          <MentorSectionHeader
            title="Past"
            className="mb-4"
          />
          {past.length === 0 ? (
            <div className="mentor-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No past sessions yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Once a session is completed, it will appear here.
              </p>
            </div>
          ) : (
            <div className="mentor-card divide-y divide-border/60">
              {past.slice(0, 20).map((s) => {
                const start = parseISO(s.scheduled_time);
                const student = sessionStudentMap.get(s.student_id);
                return (
                  <div
                    key={s.id}
                    className="mentor-session-row opacity-70"
                    onClick={() => navigate({ to: "/mentor/session/$id", params: { id: s.id } })}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {student?.full_name || "Student"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(start, "MMM d, yyyy")} · {format(start, "h:mm a")} · {s.duration_mins} min
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize shrink-0">
                      {s.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </MentorPageContainer>
    </MentorLayout>
  );
}
