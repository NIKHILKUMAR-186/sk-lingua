import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FileUp, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ResourceUpload } from "@/components/resource-upload";
import { uploadStorageFile } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/mentor/sessions")({
  component: MentorSessions,
});

function MentorSessions() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const uid = auth?.user?.id;
  const { data: sessions = [] } = useQuery({
    queryKey: ["mentor-all-sessions", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("sessions").select("*").eq("mentor_id", uid!).order("scheduled_time", { ascending: false })).data ?? [],
  });
  const { data: sharedResources = [] } = useQuery({
    queryKey: ["mentor-shared-resources", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("resources").select("*").eq("mentor_id", uid!).order("created_at", { ascending: false })).data ?? [],
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceVisibility, setResourceVisibility] = useState<"public" | "session" | "private">("session");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});

  async function complete(id: string) {
    const { error } = await supabase.from("sessions").update({ status: "completed" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Marked complete"); qc.invalidateQueries(); }
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
        const upload = await uploadStorageFile(selectedFile, `mentor/${uid}/homework/${activeSessionId}`);
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

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Sessions</h1>
          <p className="text-sm text-muted-foreground">Keep session paperwork and homework attached to each lesson.</p>
        </div>
        {activeSessionId ? (
          <Card>
            <CardHeader>
              <CardTitle>Share homework for this session</CardTitle>
            </CardHeader>
            <CardContent>
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
                sessions={sessions.filter((session) => session.status === "completed").map((session) => ({ id: session.id, label: `${new Date(session.scheduled_time).toLocaleString()} • ${session.student_id?.slice(0, 8) ?? "student"}` }))}
                onChangeTitle={setResourceTitle}
                onChangeUrl={setResourceUrl}
                onChangeDescription={setResourceDescription}
                onChangeVisibility={setResourceVisibility}
                onChangeSessionId={setActiveSessionId}
                onChangeFile={setSelectedFile}
                onUpload={shareHomework}
                onClear={() => setSelectedFile(null)}
              />
            </CardContent>
          </Card>
        ) : null}
        {sessions.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No sessions yet.</CardContent></Card>
        ) : sessions.map((s) => {
          const sessionResources = sharedResources.filter((resource) => resource.session_id === s.id);
          return (
            <Card key={s.id}><CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-medium">{new Date(s.scheduled_time).toLocaleString()}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Badge variant="secondary">{s.status}</Badge><span>{s.duration_mins} min</span></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/mentor/session/$id" params={{ id: s.id }}>
                      Open workspace
                    </Link>
                  </Button>
                  {s.status === "accepted" && s.video_call_link && <Button size="sm" asChild><a href={s.video_call_link} target="_blank" rel="noreferrer"><Video className="mr-1 h-4 w-4" />Join</a></Button>}
                  {s.status === "accepted" && <Button size="sm" variant="outline" onClick={() => complete(s.id)}>Mark complete</Button>}
                  {s.status === "completed" && <Button size="sm" variant="secondary" onClick={() => setActiveSessionId(s.id)}><FileUp className="mr-1 h-4 w-4" />Upload resource</Button>}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="font-medium">Homework attached</div>
                {sessionResources.length === 0 ? <div className="mt-1 text-muted-foreground">No materials shared for this lesson yet.</div> : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sessionResources.slice(0, 3).map((resource) => <Badge key={resource.id} variant="outline">{resource.title}</Badge>)}
                  </div>
                )}
              </div>
              <div className="rounded-lg border bg-background/70 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">Session notes</div>
                  <Button size="sm" variant="outline" onClick={() => saveNotes(s.id)}>Save</Button>
                </div>
                <Textarea
                  className="mt-2 min-h-24"
                  placeholder="Capture the lesson summary, homework, or follow-up points..."
                  value={notesDrafts[s.id] ?? s.notes ?? ""}
                  onChange={(event) => setNotesDrafts((prev) => ({ ...prev, [s.id]: event.target.value }))}
                />
              </div>
            </CardContent></Card>
          );
        })}
      </div>
    </AppShell>
  );
}
