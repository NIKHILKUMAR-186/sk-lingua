import React, { useEffect, useState } from "react";
import { createSignedUrlForPath } from "@/lib/mentorApplications";

export function ResumePreview({
  url,
  path,
  fileName,
}: {
  url?: string | null;
  path?: string | null;
  fileName?: string | null;
}) {
  const [signed, setSigned] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchSigned() {
      const key = path ?? url;
      if (!key) return;
      try {
        // Generate the signed URL directly via Supabase storage. This avoids
        // the fragile /api/signed-url endpoint that could return HTML (404)
        // and cause "Unexpected token '<'" when parsed as JSON.
        const signedUrl = await createSignedUrlForPath(key);
        if (mounted) setSigned(signedUrl);
      } catch (err) {
        console.error("Signed URL fetch failed", err);
        if (mounted) setSigned(null);
      }
    }
    fetchSigned();
    return () => {
      mounted = false;
    };
  }, [url, path]);

  if (!url && !path)
    return <div className="text-sm text-muted-foreground">No resume uploaded.</div>;
  const openUrl = signed ?? url;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{fileName ?? "Resume"}</div>
        <div className="flex gap-2">
          {openUrl ? (
            <a href={openUrl} target="_blank" rel="noreferrer" className="text-primary underline">
              Open
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">Loading…</span>
          )}
          {openUrl ? (
            <a href={openUrl} download className="text-muted-foreground">
              Download
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
