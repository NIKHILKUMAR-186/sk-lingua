import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadStorageFile } from "@/lib/storage";
import type { Json } from "@/integrations/supabase/types";

export interface GigFormData {
  title: string;
  description: string;
  price: number;
  duration_mins: number;
  language: string;
  category: string;
  level: string;
  tags: string[];
  cover_image: string | null;
  whats_included: string[];
  learning_outcomes: string[];
  prerequisites: string;
  homework_included: boolean;
  recording_included: boolean;
  certificate_included: boolean;
  featured: boolean;
  is_active: boolean;
}

const defaultGigForm: GigFormData = {
  title: "",
  description: "",
  price: 25,
  duration_mins: 30,
  language: "en",
  category: "",
  level: "beginner",
  tags: [],
  cover_image: null,
  whats_included: [],
  learning_outcomes: [],
  prerequisites: "",
  homework_included: false,
  recording_included: false,
  certificate_included: false,
  featured: false,
  is_active: true,
};

export function useGigs(mentorId?: string) {
  const qc = useQueryClient();

  const { data: gigs = [], isLoading } = useQuery({
    queryKey: ["gigs", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("gigs")
        .select("*")
        .eq("mentor_id", mentorId!)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: activeGigs = [] } = useQuery({
    queryKey: ["gigs-active", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("gigs")
        .select("*")
        .eq("mentor_id", mentorId!)
        .eq("is_active", true)
        .eq("is_archived", false)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createGig = useMutation({
    mutationFn: async (form: GigFormData) => {
      const { error } = await supabase.from("gigs").insert({
        mentor_id: mentorId!,
        title: form.title,
        description: form.description || null,
        price: form.price,
        duration_mins: form.duration_mins,
        language: form.language,
        category: form.category || null,
        level: form.level || null,
        tags: form.tags,
        cover_image: form.cover_image,
        whats_included: form.whats_included as unknown as Json,
        learning_outcomes: form.learning_outcomes as unknown as Json,
        prerequisites: form.prerequisites || null,
        homework_included: form.homework_included,
        recording_included: form.recording_included,
        certificate_included: form.certificate_included,
        featured: form.featured,
        is_active: form.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gigs", mentorId] });
      qc.invalidateQueries({ queryKey: ["gigs-active", mentorId] });
    },
  });

  const updateGig = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: Partial<GigFormData> }) => {
      const { error } = await supabase.from("gigs").update({
        title: form.title,
        description: form.description || null,
        price: form.price,
        duration_mins: form.duration_mins,
        language: form.language,
        category: form.category || null,
        level: form.level || null,
        tags: form.tags,
        cover_image: form.cover_image,
        whats_included: form.whats_included as unknown as Json,
        learning_outcomes: form.learning_outcomes as unknown as Json,
        prerequisites: form.prerequisites || null,
        homework_included: form.homework_included,
        recording_included: form.recording_included,
        certificate_included: form.certificate_included,
        featured: form.featured,
        is_active: form.is_active,
      }).eq("id", id).eq("mentor_id", mentorId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gigs", mentorId] });
      qc.invalidateQueries({ queryKey: ["gigs-active", mentorId] });
    },
  });

  const archiveGig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gigs").update({ is_archived: true, is_active: false }).eq("id", id).eq("mentor_id", mentorId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gigs", mentorId] });
      qc.invalidateQueries({ queryKey: ["gigs-active", mentorId] });
    },
  });

  const deleteGig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gigs").delete().eq("id", id).eq("mentor_id", mentorId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gigs", mentorId] });
      qc.invalidateQueries({ queryKey: ["gigs-active", mentorId] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("gigs").update({ is_active }).eq("id", id).eq("mentor_id", mentorId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gigs", mentorId] });
      qc.invalidateQueries({ queryKey: ["gigs-active", mentorId] });
    },
  });

  async function uploadCoverImage(file: File): Promise<string> {
    const upload = await uploadStorageFile(file, `mentor/${mentorId}/gigs`);
    return upload.publicUrl;
  }

  return {
    gigs,
    activeGigs,
    isLoading,
    createGig,
    updateGig,
    archiveGig,
    deleteGig,
    toggleActive,
    uploadCoverImage,
    defaultGigForm,
  };
}

