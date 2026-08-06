import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, ImagePlus, Loader2, PackageOpen } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { useGigs, type GigFormData } from "@/hooks/use-gigs";
import { GigCard } from "@/components/gig-card";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const CATEGORIES = [
  "Conversation",
  "Grammar",
  "Business",
  "Exam Prep",
  "Pronunciation",
  "Writing",
  "Reading",
  "Culture",
  "Academic",
  "Travel",
  "Kids",
];
const LEVELS = ["beginner", "intermediate", "advanced", "all levels"];

interface GigManagerProps {
  mentorId: string;
}

export function GigManager({ mentorId }: GigManagerProps) {
  const {
    gigs,
    isLoading,
    createGig,
    updateGig,
    archiveGig,
    deleteGig,
    toggleActive,
    uploadCoverImage,
    defaultGigForm,
  } = useGigs(mentorId);
  const [isOpen, setIsOpen] = useState(false);
  const [editingGig, setEditingGig] = useState<Tables<"gigs"> | null>(null);
  const [form, setForm] = useState<GigFormData>(defaultGigForm);
  const [uploading, setUploading] = useState(false);

  function resetForm() {
    setForm(defaultGigForm);
    setEditingGig(null);
  }

  function openEdit(gig: Tables<"gigs">) {
    setEditingGig(gig);
    setForm({
      title: gig.title,
      description: gig.description || "",
      price: gig.price,
      duration_mins: gig.duration_mins,
      language: gig.language,
      category: gig.category || "",
      level: gig.level || "",
      tags: gig.tags || [],
      cover_image: gig.cover_image,
      whats_included: Array.isArray(gig.whats_included) ? (gig.whats_included as string[]) : [],
      learning_outcomes: Array.isArray(gig.learning_outcomes)
        ? (gig.learning_outcomes as string[])
        : [],
      prerequisites: gig.prerequisites || "",
      homework_included: gig.homework_included || false,
      recording_included: gig.recording_included || false,
      certificate_included: gig.certificate_included || false,
      featured: gig.featured || false,
      is_active: gig.is_active,
    });
    setIsOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (form.price <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }

    try {
      if (editingGig) {
        await updateGig.mutateAsync({ id: editingGig.id, form });
        toast.success("Gig updated");
      } else {
        await createGig.mutateAsync(form);
        toast.success("Gig created");
      }
      setIsOpen(false);
      resetForm();
    } catch (e) {
      toast.error((e as Error).message || "Failed to save gig");
    }
  }

  async function handleUploadCover(file: File) {
    setUploading(true);
    try {
      const url = await uploadCoverImage(file);
      setForm((prev) => ({ ...prev, cover_image: url }));
      toast.success("Cover image uploaded");
    } catch (e) {
      toast.error((e as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function updateArrayField(field: "whats_included" | "learning_outcomes" | "tags", value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: [...prev[field], value],
    }));
  }

  function removeArrayItem(field: "whats_included" | "learning_outcomes" | "tags", index: number) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display">Gigs & services</h2>
          <p className="text-sm text-muted-foreground">Create and manage your teaching services</p>
        </div>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New gig
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingGig ? "Edit gig" : "Create new gig"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Cover image */}
              <div className="space-y-2">
                <Label>Cover image</Label>
                {form.cover_image && (
                  <div className="relative h-32 w-full overflow-hidden rounded-lg mb-2">
                    <img
                      src={form.cover_image}
                      alt="Cover"
                      className="h-full w-full object-cover"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-2 top-2"
                      onClick={() => setForm((p) => ({ ...p, cover_image: null }))}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground hover:border-primary/50 transition-colors">
                  <ImagePlus className="h-4 w-4" />
                  <span>Upload cover image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadCover(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {uploading && (
                  <p className="text-xs text-muted-foreground">
                    <Loader2 className="inline h-3 w-3 animate-spin" /> Uploading...
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Conversational Spanish"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price ($) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Duration (mins)</Label>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={form.duration_mins}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, duration_mins: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.language}
                    onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.emoji} {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Level</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.level}
                    onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe what this gig offers..."
                />
              </div>

              <div className="space-y-2">
                <Label>What's included</Label>
                <AddItemInput
                  onAdd={(v) => updateArrayField("whats_included", v)}
                  placeholder="e.g., Personalized feedback"
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {form.whats_included.map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {item}
                      <button onClick={() => removeArrayItem("whats_included", i)}>&times;</button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Learning outcomes</Label>
                <AddItemInput
                  onAdd={(v) => updateArrayField("learning_outcomes", v)}
                  placeholder="e.g., Hold a 10-min conversation"
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {form.learning_outcomes.map((item, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {item}
                      <button onClick={() => removeArrayItem("learning_outcomes", i)}>
                        &times;
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Prerequisites</Label>
                <Input
                  value={form.prerequisites}
                  onChange={(e) => setForm((p) => ({ ...p, prerequisites: e.target.value }))}
                  placeholder="e.g., Basic knowledge of the language"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-xs cursor-pointer">Homework</Label>
                  <Switch
                    checked={form.homework_included}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, homework_included: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-xs cursor-pointer">Recording</Label>
                  <Switch
                    checked={form.recording_included}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, recording_included: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-xs cursor-pointer">Certificate</Label>
                  <Switch
                    checked={form.certificate_included}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, certificate_included: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-xs cursor-pointer">Featured</Label>
                  <Switch
                    checked={form.featured}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, featured: v }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="cursor-pointer">Active</Label>
                  <p className="text-xs text-muted-foreground">Visible to students</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={createGig.isPending || updateGig.isPending}
                className="w-full"
              >
                {(createGig.isPending || updateGig.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingGig ? "Update gig" : "Create gig"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {gigs.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No gigs yet"
          description="Create your first teaching service to start receiving bookings from students."
          actionLabel="Create gig"
          onAction={() => setIsOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gigs.map((gig) => (
            <GigCard
              key={gig.id}
              gig={gig}
              showActions
              onEdit={openEdit}
              onArchive={(id) => {
                archiveGig.mutate(id);
                toast.success("Gig archived");
              }}
              onDelete={(id) => {
                deleteGig.mutate(id);
                toast.success("Gig deleted");
              }}
              onToggleActive={(id, active) => toggleActive.mutate({ id, is_active: active })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddItemInput({
  onAdd,
  placeholder,
}: {
  onAdd: (value: string) => void;
  placeholder: string;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            e.preventDefault();
            onAdd(value.trim());
            setValue("");
          }
        }}
      />
      <Button
        size="sm"
        variant="outline"
        type="button"
        onClick={() => {
          if (value.trim()) {
            onAdd(value.trim());
            setValue("");
          }
        }}
      >
        Add
      </Button>
    </div>
  );
}
