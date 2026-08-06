import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token ?? null;
        const res = await fetch(`/api/signed-url?key=${encodeURIComponent(key)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "failed");
        if (mounted) setSigned(data.signedUrl ?? data.signed_url ?? null);
      } catch (err) {
        console.error("Signed URL fetch failed", err);
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
