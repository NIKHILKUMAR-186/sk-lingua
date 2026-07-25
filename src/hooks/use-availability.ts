import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAvailability(mentorId?: string) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["availability_slots", mentorId],
    enabled: !!mentorId,
    queryFn: async () => (await supabase.from("availability_slots").select("*").eq("mentor_id", mentorId)).data ?? [],
  });

  async function addSlot(payload: { mentor_id: string; day: string; start_time: string; end_time: string; label?: string | null }) {
    const { error } = await supabase.from("availability_slots").insert(payload);
    if (error) throw error;
    qc.invalidateQueries(["availability_slots", mentorId]);
  }

  async function updateSlot(id: string, patch: Partial<{ start_time: string; end_time: string; label?: string | null; is_blocked?: boolean }>) {
    const { error } = await supabase.from("availability_slots").update(patch).eq("id", id);
    if (error) throw error;
    qc.invalidateQueries(["availability_slots", mentorId]);
  }

  async function deleteSlot(id: string) {
    const { error } = await supabase.from("availability_slots").delete().eq("id", id);
    if (error) throw error;
    qc.invalidateQueries(["availability_slots", mentorId]);
  }

  async function duplicateToDay(slotId: string, targetDay: string) {
    const { data } = await supabase.from("availability_slots").select("*").eq("id", slotId).maybeSingle();
    if (!data) throw new Error("Slot not found");
    const { error } = await supabase.from("availability_slots").insert({
      mentor_id: data.mentor_id,
      day: targetDay,
      start_time: data.start_time,
      end_time: data.end_time,
      label: data.label,
    });
    if (error) throw error;
    qc.invalidateQueries(["availability_slots", mentorId]);
  }

  return { slots: data, isLoading, addSlot, updateSlot, deleteSlot, duplicateToDay };
}
