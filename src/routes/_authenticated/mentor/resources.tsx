import { createFileRoute, Link } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/mentor/page-header";
import { MentorEmptyState } from "@/components/mentor/mentor-empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Trash2, FileText, Upload } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ResourceUpload } from "@/components/resource-upload";
import { uploadStorageFile } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/mentor/resources")({
  component: MentorResources,
});

function MentorResources() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const { data: resources = [] } = useQuery({
    queryKey: ["mentor-resources", uid],
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
  const { data: sessions = [] } = useQuery({
    queryKey: ["mentor-completed-sessions", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("sessions")
          .select("id, student_id, scheduled_time")
          .eq("mentor_id", uid!)
          .eq("status", "completed")
          .order("scheduled_time", { ascending: false })
      ).data ?? [],
  });

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<(typeof visibilityOptions)[number]>("public");
  const [sessionId, setSessionId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  const visibilityOptions = ["public", "session", "private"] as const;

  const sessionMap = useMemo(
    () => new Map(sessions.map((session) => [session.id, session])),
    [sessions],
  );

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

    let filePayload: {
      resource_type: "link" | "file";
      url: string;
      storage_url: string | null;
      storage_path: string | null;
      file_name: string | null;
      file_type: string | null;
      file_size: number | null;
      thumbnail_url: string | null;
    } = {
      resource_type: "link",
      url,
      storage_url: null,
      storage_path: null,
      file_name: null,
      file_type: null,
      file_size: null,
      thumbnail_url: null,
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
      student_id: visibility === "session" ? (sessionMap.get(sessionId)?.student_id ?? null) : null,
      session_id: visibility === "session" ? sessionId : null,
      created_by: uid,
      is_public: visibility === "public",
      shared_with:
        visibility === "session" ? (sessionMap.get(sessionId)?.student_id ?? null) : null,
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
    setShowUpload(false);
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
    <MentorLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title="Teaching Library"
          description="Everything you use while teaching."
          action={
            <Button onClick={() => setShowUpload(!showUpload)}>
              <Upload className="mr-1.5 h-4 w-4" />
              {showUpload ? "Cancel" : "New material"}
            </Button>
          }
        />

        {showUpload && (
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <p className="text-xs font-medium tracking-[0.12em] uppercase text-muted-foreground mb-4">
              Create resource
            </p>
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
                label: `${format(parseISO(session.scheduled_time), "MMM d, yyyy")} · ${session.student_id.slice(0, 8)}`,
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
          </div>
        )}

        <section>
          <h2 className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground mb-4">
            Library
          </h2>
          {resources.length === 0 ? (
            <MentorEmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Build your teaching library"
              description="Share learning materials, homework, and session files with your students."
              actionLabel="Add material"
              onAction={() => setShowUpload(true)}
            />
          ) : (
            <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-accent/10 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">
                        {resource.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground capitalize">
                        {resource.resource_type === "file" ? "File" : "Link"}
                      </span>
                    </div>
                    {resource.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1 ml-6.5">
                        {resource.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground ml-6.5">
                      <Badge variant="outline" className="text-[10px] h-5 capitalize">
                        {resource.visibility}
                      </Badge>
                      {resource.session_id && <span>Session resource</span>}
                      {resource.file_name && (
                        <span>
                          {resource.file_name} · {formatBytes(resource.file_size ?? 0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-9 w-9" asChild>
                      <a
                        href={resource.storage_url || resource.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open resource"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteResource(resource.id)}
                      aria-label="Delete resource"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </MentorLayout>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
