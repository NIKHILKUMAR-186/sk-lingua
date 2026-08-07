import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getSignedUrlForPath(path: string, expires = 60) {
  // Server-side: returns a signed URL for private resource access.
  // Resume uploads live in the private `mentor-resumes` bucket (paths start with `mentor/`),
  // while all other resources live in the `resources` bucket.
  const bucket = path.startsWith("mentor/") ? "mentor-resumes" : "resources";
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expires);
  if (error) throw error;
  return data.signedUrl;
}