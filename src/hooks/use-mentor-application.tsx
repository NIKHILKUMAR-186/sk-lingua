import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyApplication, upsertMyApplication, uploadResume } from "@/lib/mentorApplications";
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
    if (!userId) return;
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

  useEffect(() => {
    if (!userId || draft == null) return;
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}:${userId}`, JSON.stringify(draft));

    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => void saveDraft(), 2000);
  }, [draft]);

  async function saveDraft() {
    if (!userId || !draft) return;
    setSaving(true);
    try {
      const payload = { ...draft, user_id: userId };
      await upsertMyApplication(payload);
      qc.invalidateQueries({ queryKey: ["mentor-application", userId] });
    } catch (err) {
      console.error("Save draft failed", err);
    } finally {
      setSaving(false);
    }
  }

  async function replaceResume(file: File) {
    if (!userId) throw new Error("Not authenticated");
    const upload = await uploadResume(file, `mentor/${userId}/applications`);
    setDraft((d: any) => ({
      ...d,
      resume_url: upload.publicUrl,
      resume_path: upload.path,
      resume_file_name: upload.fileName,
      resume_file_type: upload.fileType,
    }));
    await saveDraft();
  }

  return { draft, setDraft, saveDraft, replaceResume, saving, isLoading };
}
