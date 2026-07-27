import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createSessionTimelineEntry, fetchSessionWorkspace } from "@/lib/session-workspace";

export function useSessionWorkspace(sessionId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["session-workspace", sessionId, userId],
    enabled: !!sessionId && !!userId,
    queryFn: async () => {
      if (!sessionId || !userId) return null;
      const workspace = await fetchSessionWorkspace(sessionId, userId);
      if (workspace?.timeline?.length === 0) {
        try {
          await createSessionTimelineEntry(sessionId, "booking_created", "Booking created", "The session is now ready for planning and preparation.", userId);
          workspace.timeline = [{ id: "temp", session_id: sessionId, event_type: "booking_created", title: "Booking created", detail: "The session is now ready for planning and preparation.", created_by: userId, metadata: null, created_at: new Date().toISOString() }];
        } catch {
          // Ignore timeline bootstrap failures and keep the workspace view intact.
        }
      }
      return workspace;
    },
  });

  async function addTimeline(sessionId: string, eventType: string, title: string, detail: string | null, createdBy: string | null) {
    try {
      await createSessionTimelineEntry(sessionId, eventType, title, detail, createdBy);
    } catch {
      // Best effort only; UI should continue even if timeline table is unavailable.
    }
  }

  async function createHomework(payload: Record<string, any>) {
    if (!sessionId || !userId) return;
    const { error } = await supabase.from("homeworks").insert({ ...payload, mentor_id: userId });
    if (error) throw error;
    await addTimeline(sessionId, "homework_created", "Homework assigned", payload.title, userId);
    await qc.invalidateQueries({ queryKey: ["session-workspace", sessionId, userId] });
  }

  async function submitHomework(payload: Record<string, any>) {
    if (!sessionId || !userId) return;
    const { error } = await supabase.from("homework_submissions").insert({ ...payload, student_id: userId, submitted_at: new Date().toISOString() });
    if (error) throw error;
    await addTimeline(sessionId, "homework_submitted", "Homework submitted", payload.submission_text ?? "Submission uploaded", userId);
    await qc.invalidateQueries({ queryKey: ["session-workspace", sessionId, userId] });
  }

  async function reviewHomework(payload: Record<string, any>) {
    if (!sessionId || !userId) return;
    const { error } = await supabase.from("homework_submissions").update({
      mentor_feedback: payload.mentor_feedback,
      mentor_score: payload.mentor_score,
      corrections: payload.corrections,
      reviewed_at: new Date().toISOString(),
      status: "Reviewed",
    }).eq("homework_id", payload.homework_id).eq("student_id", payload.student_id ?? userId);
    if (error) throw error;
    await addTimeline(sessionId, "homework_reviewed", "Homework reviewed", payload.mentor_feedback ?? "Feedback shared", userId);
    await qc.invalidateQueries({ queryKey: ["session-workspace", sessionId, userId] });
  }

  async function createNote(payload: Record<string, any>) {
    if (!sessionId || !userId) return;
    const { error } = await supabase.from("session_notes").insert({ session_id: sessionId, created_by: userId, ...payload });
    if (error) throw error;
    await addTimeline(sessionId, "note_added", "Note shared", payload.title ?? "A note was added", userId);
    await qc.invalidateQueries({ queryKey: ["session-workspace", sessionId, userId] });
  }

  async function submitReview(payload: { mentor_id: string; rating: number; comment?: string }) {
    if (!sessionId || !userId) return;
    const { error } = await supabase.from("reviews").insert({
      session_id: sessionId,
      student_id: userId,
      mentor_id: payload.mentor_id,
      rating: payload.rating,
      comment: payload.comment ?? null,
    });
    if (error) throw error;
    await addTimeline(sessionId, "review_submitted", `Rating: ${payload.rating}/5`, payload.comment ?? "No comment", userId);
    await qc.invalidateQueries({ queryKey: ["session-workspace", sessionId, userId] });
  }

  // Check if user has already reviewed this session
  async function fetchExistingReview() {
    if (!sessionId || !userId) return null;
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("session_id", sessionId)
      .eq("student_id", userId)
      .maybeSingle();
    return data;
  }

  return { ...query, createHomework, submitHomework, reviewHomework, createNote, submitReview, fetchExistingReview };
}
