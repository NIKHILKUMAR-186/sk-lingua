import { supabase } from "@/integrations/supabase/client";

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "image/png",
  "image/jpeg",
  "image/webp",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
  "video/webm",
  "text/plain",
];

function isAllowedFileType(type: string) {
  return ALLOWED_FILE_TYPES.includes(type) || type.startsWith("image/") || type.startsWith("audio/") || type.startsWith("video/");
}

export async function uploadStorageFile(file: File, folder: string) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File is too large. Maximum size is 12 MB.");
  }

  if (!isAllowedFileType(file.type)) {
    throw new Error("Unsupported file type.");
  }

  const path = `${folder}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("resources").upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from("resources").getPublicUrl(path);
  return {
    path,
    publicUrl: publicUrlData.publicUrl,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
  };
}
