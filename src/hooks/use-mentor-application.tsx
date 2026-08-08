import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyApplication,
  upsertMyApplication,
  uploadResume,
  fetchApplicationHistory,
  fetchApplicationInterviews,
} from "@/lib/mentorApplications";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY_PREFIX = "lingua-mentor-application-draft";

export function useMentorApplication() {
  const { data: auth } = useAuth();
  const userId = auth?.user?.id;
  const qc = useQueryClient();
  const [draft, setDraft] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const autosaveTimer = useRef<number | null>(null as any);

  const { data: remote, isLoading } = useQuery({
    queryKey: ["mentor-application", userId],
    enabled: !!userId,
    queryFn: async () => await fetchMyApplication(userId!),
  });

  useEffect(() => {
    if (!userId) {
      // Not authenticated: load from localStorage only
      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem(`${STORAGE_KEY_PREFIX}:guest`)
          : null;
      if (saved) {
        try {
          setDraft(JSON.parse(saved));
          return;
        } catch {}
      }
      setDraft({});
      return;
    }

    // Authenticated: check if there's a guest draft to migrate
    const guestKey = `${STORAGE_KEY_PREFIX}:guest`;
    const guestSaved =
      typeof window !== "undefined" ? window.localStorage.getItem(guestKey) : null;
    if (guestSaved) {
      try {
        const guestDraft = JSON.parse(guestSaved);
        // Migrate guest draft to user-specific key
        const userKey = `${STORAGE_KEY_PREFIX}:${userId}`;
        const existingSaved =
          typeof window !== "undefined" ? window.localStorage.getItem(userKey) : null;
        if (!existingSaved && Object.keys(guestDraft).length > 0) {
          window.localStorage.setItem(userKey, JSON.stringify(guestDraft));
          window.localStorage.removeItem(guestKey);
          setDraft(guestDraft);
          return;
        }
        window.localStorage.removeItem(guestKey);
      } catch {}
    }

    // Authenticated: prefer localStorage, fall back to remote
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(`${STORAGE_KEY_PREFIX}:${userId}`)
        : null;
    if (saved) {
      try {
        setDraft(JSON.parse(saved));
        return;
      } catch {}
    }
    setDraft(remote ?? {});
  }, [userId, remote]);

  const saveDraft = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      // Always persist to localStorage
      const storageKey = userId ? `${STORAGE_KEY_PREFIX}:${userId}` : `${STORAGE_KEY_PREFIX}:guest`;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(draft));
      }

      // If authenticated, also persist to Supabase
      if (!userId) {
        return;
      }
      const payload = { ...draft, user_id: userId };
      const saved = await upsertMyApplication(payload);
      // Ensure the returned row (with id) is reflected in local state
      if (saved?.id) {
        setDraft((d: any) => ({ ...(d ?? {}), id: saved.id }));
      }
      qc.invalidateQueries({ queryKey: ["mentor-application", userId] });
      return saved;
    } catch (err) {
      console.error("Save draft failed", err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userId, draft, qc]);

  useEffect(() => {
    if (!draft) return;
    const storageKey = userId ? `${STORAGE_KEY_PREFIX}:${userId}` : `${STORAGE_KEY_PREFIX}:guest`;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(draft));
    }

    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => void saveDraft(), 2000);
  }, [draft, userId, saveDraft]);

  async function replaceResume(file: File) {
    // Auth is REQUIRED for mentor application resume uploads. No guest /
    // anonymous / temporary-ID flow is permitted. The storage bucket is
    // private and its RLS policies require the caller to be authenticated
    // with an auth.uid() that matches the owner folder.
    if (!userId) {
      throw new Error("You must be signed in to upload your resume.");
    }

    const upload = await uploadResume(file, `mentor/${userId}/applications`);
    setDraft((d: any) => ({
      ...d,
      // resume_path is the source of truth for a private bucket. resume_url may
      // hold an ephemeral signed URL but must never be treated as a public URL.
      resume_path: upload.path,
      resume_url: upload.signedUrl ?? upload.publicUrl ?? null,
      resume_file_name: upload.fileName,
      resume_file_type: upload.fileType,
    }));
    await saveDraft();
  }

  const { data: history = [] } = useQuery({
    queryKey: ["mentor-application-history", draft?.id],
    enabled: !!draft?.id,
    queryFn: async () => await fetchApplicationHistory(draft.id),
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ["mentor-application-interviews", draft?.id],
    enabled: !!draft?.id,
    queryFn: async () => await fetchApplicationInterviews(draft.id),
  });

  return {
    draft,
    setDraft,
    saveDraft,
    replaceResume,
    saving,
    isLoading,
    history,
    interviews,
  };
}
