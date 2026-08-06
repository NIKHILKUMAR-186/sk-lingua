import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getSignedUrlForPath(path: string, expires = 60) {
  // Server-side: returns a signed URL for private resource access
  const { data, error } = await supabaseAdmin.storage
    .from("resources")
    .createSignedUrl(path, expires);
  if (error) throw error;
  return data.signedUrl;
}
