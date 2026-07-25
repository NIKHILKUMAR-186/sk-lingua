import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResourceUpload } from "@/components/resource-upload";
import { uploadStorageFile } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, ExternalLink, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mentor/resources")({
  component: MentorResources,
});

const visibilityOptions = ["public", "session", "private"] as const;

function toHumanText(value: string) {
  return value.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MentorResources() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const { data: resources = [] } = useQuery({
    queryKey: ["mentor-resources", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("resources").select("*").eq("mentor_id", uid!).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["mentor-completed-sessions", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("sessions").select("id, student_id, scheduled_time").eq("mentor_id", uid!).eq("status", "completed").order("scheduled_time", { ascending: false })).data ?? [],
  });

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<typeof visibilityOptions[number]>("public");
  const [sessionId, setSessionId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const sessionMap = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);

  async function addResource() {
    if (!uid) return;
    if (!title) {
      toast.error("Title is required.");
      return;
    }
    if (visibility === "session" && !sessionId) {
      toast.error("Please select a completed session for session resources.");
      return;
    }
    if (!selectedFile && !url) {
      toast.error("Please provide a link or upload a file.");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    let filePayload = {
      resource_type: "link",
      url,
      storage_url: null as string | null,
      storage_path: null as string | null,
      file_name: null as string | null,
      file_type: null as string | null,
      file_size: null as number | null,
      thumbnail_url: null as string | null,
    };

    if (selectedFile) {
      try {
        const upload = await uploadStorageFile(selectedFile, `mentor/${uid}/resources`);
        filePayload = {
          ...filePayload,
          resource_type: "file",
          url: upload.publicUrl,
          storage_url: upload.publicUrl,
          storage_path: upload.path,
          file_name: upload.fileName,
          file_type: upload.fileType,
          file_size: upload.fileSize,
        };
      } catch (error) {
        setUploading(false);
        setUploadProgress(0);
        toast.error((error as Error).message ?? "Upload failed");
        return;
      }
    }

    setUploadProgress(60);

    const record = {
      mentor_id: uid,
      title,
      description: description || null,
      language: null,
      visibility,
      resource_type: filePayload.resource_type,
      url: filePayload.url,
      storage_url: filePayload.storage_url,
      storage_path: filePayload.storage_path,
      file_name: filePayload.file_name,
      file_type: filePayload.file_type,
      file_size: filePayload.file_size,
      thumbnail_url: filePayload.thumbnail_url,
      student_id: visibility === "session" ? sessionMap.get(sessionId)?.student_id ?? null : null,
      session_id: visibility === "session" ? sessionId : null,
      created_by: uid,
      is_public: visibility === "public",
      shared_with: visibility === "session" ? sessionMap.get(sessionId)?.student_id ?? null : null,
      created_at: undefined,
    };

    const { error } = await supabase.from("resources").insert(record);
    setUploading(false);
    setUploadProgress(100);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Resource shared");
    setTitle("");
    setUrl("");
    setDescription("");
    setVisibility("public");
    setSessionId("");
    setSelectedFile(null);
    setUploadProgress(0);
    qc.invalidateQueries({ queryKey: ["mentor-resources", uid] });
  }

  async function deleteResource(id: string) {
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Resource removed");
    qc.invalidateQueries({ queryKey: ["mentor-resources", uid] });
  }

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Resources</h1>
          <p className="text-muted-foreground">Share learning material, homework, or session files with your students.</p>
        </div>
        <ResourceUpload
          title={title}
          url={url}
          description={description}
          visibility={visibility}
          sessionId={sessionId}
          fileName={selectedFile?.name || ""}
          fileSize={selectedFile?.size ?? 0}
          uploadProgress={uploadProgress}
          uploading={uploading}
          sessions={sessions.map((session) => ({
            id: session.id,
            label: `${new Date(session.scheduled_time).toLocaleString()} • ${session.student_id.slice(0, 8)}`,
          }))}
          onChangeTitle={setTitle}
          onChangeUrl={setUrl}
          onChangeDescription={setDescription}
          onChangeVisibility={setVisibility}
          onChangeSessionId={setSessionId}
          onChangeFile={setSelectedFile}
          onUpload={addResource}
          onClear={() => setSelectedFile(null)}
        />

        <div className="space-y-4">
          {resources.map((resource) => (
            <Card key={resource.id}>
              <CardHeader className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{resource.title}</CardTitle>
                  <div className="mt-1 text-sm text-muted-foreground">{toHumanText(resource.visibility)}</div>
                </div>
                <Badge>{resource.resource_type === "file" ? "File" : "Link"}</Badge>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] items-start">
                <div className="space-y-2">
                  {resource.description ? <p className="text-sm text-muted-foreground">{resource.description}</p> : null}
                  {resource.session_id ? <div className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">Session resource</div> : null}
                  <div className="text-xs text-muted-foreground">
                    {resource.file_name ? `${resource.file_name} • ${resource.file_type} • ${formatBytes(resource.file_size ?? 0)}` : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" asChild variant="outline">
                    <a href={resource.storage_url || resource.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />Open
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteResource(resource.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
