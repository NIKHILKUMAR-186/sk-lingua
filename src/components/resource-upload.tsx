import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  ExternalLink,
  File,
  ImageIcon,
  Loader2,
  Trash2,
  Video,
  Volume2,
  Archive,
  FileText,
} from "lucide-react";

export interface ResourceUploadProps {
  title: string;
  url: string;
  description: string;
  visibility: "public" | "session" | "private";
  sessionId: string;
  fileName: string;
  fileSize: number;
  uploadProgress: number;
  uploading: boolean;
  onChangeTitle: (value: string) => void;
  onChangeUrl: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeVisibility: (value: "public" | "session" | "private") => void;
  onChangeSessionId: (value: string) => void;
  onChangeFile: (file: File | null) => void;
  onUpload: () => void;
  onClear: () => void;
  sessions: Array<{ id: string; label: string }>;
}

export function ResourceUpload({
  title,
  url,
  description,
  visibility,
  sessionId,
  fileName,
  fileSize,
  uploadProgress,
  uploading,
  onChangeTitle,
  onChangeUrl,
  onChangeDescription,
  onChangeVisibility,
  onChangeSessionId,
  onChangeFile,
  onUpload,
  onClear,
  sessions,
}: ResourceUploadProps) {
  const PreviewIcon = fileName ? getFileIcon(fileName) : BookOpen;
  const sizeLabel = fileSize ? `${Math.max(1, Math.round(fileSize / 1024))} KB` : "";

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => onChangeTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>External URL</Label>
          <Input
            value={url}
            onChange={(e) => onChangeUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Visibility</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={visibility}
              onChange={(e) =>
                onChangeVisibility(e.target.value as "public" | "session" | "private")
              }
            >
              <option value="public">Public Resource</option>
              <option value="session">Session Resource</option>
              <option value="private">Private Resource</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Session</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={sessionId}
              onChange={(e) => onChangeSessionId(e.target.value)}
            >
              <option value="">Select a completed session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Upload file</Label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            <PreviewIcon className="h-4 w-4" />
            <span>{fileName || "Choose PDF, DOCX, image, video, audio, ZIP, or other file"}</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => onChangeFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Maximum 12 MB • PDF, DOC, DOCX, PPT, PPTX, images, ZIP, audio, video, and links are
            supported.
          </p>
          {fileName ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  {fileName}
                </div>
                <Button size="sm" variant="ghost" onClick={onClear}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between text-right">
                <span>{sizeLabel}</span>
                <span>Ready to upload</span>
              </div>
            </div>
          ) : null}
        </div>

        {uploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Uploading…</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button onClick={onUpload} disabled={uploading}>
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Share resource
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getFileIcon(fileName: string) {
  const normalized = fileName.toLowerCase();
  if (normalized.match(/\.(png|jpg|jpeg|gif|webp)$/)) return ImageIcon;
  if (normalized.match(/\.(mp4|mov|webm)$/)) return Video;
  if (normalized.match(/\.(mp3|wav|m4a)$/)) return Volume2;
  if (normalized.match(/\.(zip|rar|7z)$/)) return Archive;
  if (normalized.match(/\.(pdf|doc|docx|ppt|pptx|txt)$/)) return FileText;
  return File;
}
