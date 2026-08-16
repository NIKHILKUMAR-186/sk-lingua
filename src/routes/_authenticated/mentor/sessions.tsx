import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/mentor/page-header";
import { SessionCard } from "@/components/mentor/session-card";
import { MentorEmptyState } from "@/components/mentor/mentor-empty-state";
import { SectionCard } from "@/components/mentor/section-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileUp, Video, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ResourceUpload } from "@/components/resource-upload";
import { uploadStorageFile } from "@/lib/storage";
import { mapCompletionError } from "@/lib/booking";
import { format, parseISO } from "date-fns";

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
  const past = sessions.filter((s) => ["completed", "rejected", "cancelled"].includes(s.status));

  return (
    <MentorLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Sessions"
          description="Keep session paperwork and homework attached to each lesson."
        />

        {activeSessionId && (
          <SectionCard title="Share homework for this session">
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
          </SectionCard>
        )}

        {/* Upcoming Sessions */}
        <SectionCard title="Upcoming sessions" description={`${upcoming.length} upcoming`}>
          {upcoming.length === 0 ? (
            <MentorEmptyState
              icon={<Video className="h-5 w-5" />}
              title="No upcoming sessions"
              description="Once a student books a session, you'll see it here."
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((s) => (
                <SessionCard
                  key={s.id}
                  studentName={sessionStudentMap.get(s.student_id)?.full_name || "Student"}
                  studentAvatar={sessionStudentMap.get(s.student_id)?.avatar_url}
                  topic="Session"
                  date={format(parseISO(s.scheduled_time), "MMM d, yyyy")}
                  time={format(parseISO(s.scheduled_time), "h:mm a")}
                  duration={s.duration_mins}
                  status={s.status}
                  videoLink={s.video_call_link}
                  onOpen={() => navigate({ to: "/mentor/session/$id", params: { id: s.id } })}
                  onJoin={() => s.video_call_link && window.open(s.video_call_link, "_blank")}
                  onComplete={() => complete(s.id)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Past Sessions */}
        <SectionCard title="Past sessions" description={`${past.length} completed or cancelled`}>
          {past.length === 0 ? (
            <MentorEmptyState
              title="No past sessions"
              description="Completed and cancelled sessions appear here."
            />
          ) : (
            <div className="space-y-3">
              {past.slice(0, 20).map((s) => (
                <SessionCard
                  key={s.id}
                  studentName={sessionStudentMap.get(s.student_id)?.full_name || "Student"}
                  studentAvatar={sessionStudentMap.get(s.student_id)?.avatar_url}
                  topic="Session"
                  date={format(parseISO(s.scheduled_time), "MMM d, yyyy")}
                  time={format(parseISO(s.scheduled_time), "h:mm a")}
                  duration={s.duration_mins}
                  status={s.status}
                  onOpen={() => navigate({ to: "/mentor/session/$id", params: { id: s.id } })}
                  onUploadResource={() => setActiveSessionId(s.id)}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </MentorLayout>
  );
}
