import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function fetchAvailabilitySlots(mentorId: string) {
  const { data, error } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("mentor_id", mentorId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createAvailabilitySlot(payload: {
  mentor_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  label?: string | null;
  timezone?: string | null;
}) {
  const { data, error } = await supabase
    .from("availability_slots")
    .insert({
      mentor_id: payload.mentor_id,
      day_of_week: payload.day_of_week,
      start_time: payload.start_time,
      end_time: payload.end_time,
      label: payload.label ?? null,
      timezone: payload.timezone ?? null,
      is_available: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAvailabilitySlot(
  id: string,
  patch: Partial<{
    day_of_week: string;
    start_time: string;
    end_time: string;
    label: string | null;
    is_available: boolean;
    timezone: string | null;
  }>,
) {
  const { data, error } = await supabase
    .from("availability_slots")
    .update(patch as any)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAvailabilitySlot(id: string) {
  const { error } = await supabase
    .from("availability_slots")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export function useAvailability(mentorId?: string) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["availability_slots", mentorId],
    enabled: !!mentorId,
    queryFn: async () => fetchAvailabilitySlots(mentorId!),
  });

  async function addSlot(payload: {
    mentor_id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    label?: string | null;
    is_available?: boolean;
    timezone?: string | null;
  }) {
    const slot = await createAvailabilitySlot({
      mentor_id: payload.mentor_id,
      day_of_week: payload.day_of_week,
      start_time: payload.start_time,
      end_time: payload.end_time,
      label: payload.label ?? null,
      timezone: payload.timezone ?? null,
    });
    qc.invalidateQueries({ queryKey: ["availability_slots", mentorId] });
    return slot;
  }

  async function updateSlot(
    id: string,
    patch: Partial<{
      day_of_week: string;
      start_time: string;
      end_time: string;
      label: string | null;
      is_available: boolean;
      timezone: string | null;
    }>,
  ) {
    const slot = await updateAvailabilitySlot(id, patch);
    qc.invalidateQueries({ queryKey: ["availability_slots", mentorId] });
    return slot;
  }

  async function deleteSlot(id: string) {
    await deleteAvailabilitySlot(id);
    qc.invalidateQueries({ queryKey: ["availability_slots", mentorId] });
  }

  async function duplicateToDay(slotId: string, targetDay: string) {
    const existing = (data as any[]).find((s) => s.id === slotId);
    if (!existing) throw new Error("Slot not found");

    const slot = await createAvailabilitySlot({
      mentor_id: existing.mentor_id,
      day_of_week: targetDay,
      start_time: existing.start_time,
      end_time: existing.end_time,
      label: existing.label,
      timezone: existing.timezone,
    });
    qc.invalidateQueries({ queryKey: ["availability_slots", mentorId] });
    return slot;
  }

  return { slots: data, isLoading, addSlot, updateSlot, deleteSlot, duplicateToDay };
}
