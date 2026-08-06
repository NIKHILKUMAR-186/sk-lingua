import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAvailability(mentorId?: string) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["availability_slots", mentorId],
    enabled: !!mentorId,
    queryFn: async () =>
      (await supabase.from("availability_slots").select("*").eq("mentor_id", mentorId!)).data ?? [],
  });

  async function addSlot(payload: {
    mentor_id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    label?: string | null;
    is_available?: boolean;
  }) {
    const insertPayload = {
      ...payload,
      is_available: payload.is_available ?? true,
    };
    console.log("📍 addSlot called");
    console.log("Insert Payload:", insertPayload);
    console.log("Hook mentorId:", mentorId);

    const { error } = await supabase.from("availability_slots").insert(insertPayload);

    if (error) {
      console.error("❌ Insert Error:", error);
      console.error("Error Code:", error.code);
      console.error("Error Message:", error.message);
      console.error("Full Error Object:", JSON.stringify(error, null, 2));
      const msg = error.message || JSON.stringify(error);
      throw new Error(msg);
    }
    console.log("✅ Insert successful");
    qc.invalidateQueries({ queryKey: ["availability_slots", mentorId] });
  }

  async function updateSlot(
    id: string,
    patch: Partial<{
      day_of_week?: string;
      start_time?: string;
      end_time?: string;
      label?: string | null;
      is_available?: boolean;
    }>,
  ) {
    const { error } = await supabase.from("availability_slots").update(patch).eq("id", id);
    if (error) {
      const msg = error.message || JSON.stringify(error);
      throw new Error(msg);
    }
    qc.invalidateQueries({ queryKey: ["availability_slots", mentorId] });
  }

  async function deleteSlot(id: string) {
    const { error } = await supabase.from("availability_slots").delete().eq("id", id);
    if (error) {
      const msg = error.message || JSON.stringify(error);
      throw new Error(msg);
    }
    qc.invalidateQueries({ queryKey: ["availability_slots", mentorId] });
  }

  async function duplicateToDay(slotId: string, targetDay: string) {
    const { data } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("id", slotId)
      .maybeSingle();
    if (!data) throw new Error("Slot not found");
    const { error } = await supabase.from("availability_slots").insert({
      mentor_id: data.mentor_id,
      day_of_week: targetDay,
      start_time: data.start_time,
      end_time: data.end_time,
      is_available: data.is_available ?? true,
      label: data.label,
    });
    if (error) {
      const msg = error.message || JSON.stringify(error);
      throw new Error(msg);
    }
    qc.invalidateQueries({ queryKey: ["availability_slots", mentorId] });
  }

  return { slots: data, isLoading, addSlot, updateSlot, deleteSlot, duplicateToDay };
}
