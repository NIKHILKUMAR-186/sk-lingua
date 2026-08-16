import { DAY_KEYS, DAY_LABELS } from "@/lib/booking";
import { useAuth } from "@/hooks/use-auth";
import { useAvailability } from "@/hooks/use-availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Clock, Copy, Plus, Trash2, Globe, ChevronDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function MentorAvailability() {
  const { data: auth } = useAuth();
  const mentorId = auth?.user?.id;
  const { slots, isLoading, addSlot, deleteSlot, duplicateToDay, updateSlot } =
    useAvailability(mentorId);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newLabel, setNewLabel] = useState("");
  const [newTimezone, setNewTimezone] = useState(() => {
    if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return "Asia/Kolkata";
  });

  const grouped = useMemo(() => {
    const result: Record<string, any[]> = {};
    (slots ?? []).forEach((s) => {
      result[s.day_of_week] = result[s.day_of_week] ?? [];
      result[s.day_of_week].push(s);
    });
    return result;
  }, [slots]);

  const firstTimezone = useMemo(() => {
    const seen = new Set<string>();
    for (const s of slots ?? []) {
      if (s.timezone) {
        if (!seen.has(s.timezone)) {
          seen.add(s.timezone);
          return s.timezone;
        }
      }
    }
    return newTimezone;
  }, [slots, newTimezone]);

  const totalSlots = useMemo(() => (slots ?? []).length, [slots]);

  const activeDays = useMemo(
    () => DAY_KEYS.filter((key) => (grouped[key] ?? []).length > 0),
    [grouped],
  );

  function getDayEnabled(dayKey: string): boolean {
    return (grouped[dayKey] ?? []).some((s: any) => s.is_available !== false);
  }

  function getSlotEnabled(slotId: string): boolean {
    const slot = (slots ?? []).find((s: any) => s.id === slotId);
    return slot?.is_available !== false;
  }

  async function handleAdd() {
    if (!mentorId) return;
    if (selectedDayIndex === null) {
      toast.error("Select a day first");
      return;
    }
    if (newStart >= newEnd) {
      toast.error("Start time must be before end time");
      return;
    }

    const dayKey = DAY_KEYS[selectedDayIndex];
    const daySlots = grouped[dayKey] ?? [];
    const overlaps = daySlots.find((s: any) => {
      const sStart = s.start_time?.slice(0, 5);
      const sEnd = s.end_time?.slice(0, 5);
      return (newStart < sEnd && newEnd > sStart);
    });

    if (overlaps) {
      toast.error("This slot overlaps with an existing slot");
      return;
    }

    try {
      await addSlot({
        mentor_id: mentorId,
        day_of_week: dayKey,
        start_time: newStart,
        end_time: newEnd,
        is_available: true,
        label: newLabel || null,
        timezone: newTimezone || null,
      });
      setNewLabel("");
      toast.success("Slot added");
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    }
  }

  async function handleToggleDay(dayKey: string, enable: boolean) {
    if (!mentorId) return;
    const daySlots = grouped[dayKey] ?? [];
    if (daySlots.length === 0) {
      if (enable) {
        await addSlot({
          mentor_id: mentorId,
          day_of_week: dayKey,
          start_time: "09:00",
          end_time: "10:00",
          is_available: true,
          label: null,
          timezone: newTimezone || null,
        });
        toast.success("Day enabled with default slot");
      }
      return;
    }
    for (const slot of daySlots) {
      await updateSlot(slot.id, { is_available: enable });
    }
    toast.success(`${DAY_LABELS[DAY_KEYS.indexOf(dayKey as (typeof DAY_KEYS)[number])]} ${enable ? "enabled" : "disabled"}`);
  }

  async function handleToggleSlot(slotId: string, currentAvailable: boolean) {
    const newValue = !currentAvailable;
    try {
      await updateSlot(slotId, { is_available: newValue });
      toast.success(newValue ? "Slot enabled" : "Slot disabled");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    (slots ?? []).forEach((s: any) => {
      if (s.start_time && s.end_time && s.start_time >= s.end_time) {
        issues.push(`Invalid slot on ${DAY_LABELS[DAY_KEYS.indexOf(s.day_of_week)]}: ${s.start_time} — ${s.end_time}`);
      }
    });
    return issues;
  }, [slots]);

  return (
    <div className="space-y-6">
      {validationIssues.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">Availability issues detected</p>
            <ul className="mt-1 list-disc list-inside text-xs text-red-700">
              {validationIssues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            {firstTimezone}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {totalSlots} slot{totalSlots !== 1 ? "s" : ""} configured
          </Badge>
        </div>
      </div>

      <div className="grid gap-2">
        {DAY_LABELS.map((label, i) => {
          const dayKey = DAY_KEYS[i];
          const daySlots = grouped[dayKey] ?? [];
          const isEnabled = getDayEnabled(dayKey);
          const isSelected = selectedDayIndex === i;
          const activeCount = daySlots.filter((s: any) => s.is_available !== false).length;

          return (
            <div
              key={label}
              className={cn(
                "rounded-xl border border-border/60 bg-card transition-all",
                isSelected && "ring-2 ring-primary/20 border-primary/40",
              )}
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setSelectedDayIndex(isSelected ? null : i)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-20">{label}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        isEnabled ? "bg-emerald-500" : "bg-gray-300",
                      )}
                    />
                    <span className="text-xs text-muted-foreground">
                      {isEnabled ? "Available" : "Unavailable"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {activeCount} slot{activeCount !== 1 ? "s" : ""}
                  </span>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggleDay(dayKey, checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isSelected && "rotate-180",
                    )}
                  />
                </div>
              </div>

              {isSelected && (
                <div className="border-t border-border/60 p-4 space-y-4">
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Start</label>
                      <Input
                        type="time"
                        value={newStart}
                        onChange={(e) => setNewStart(e.target.value)}
                        className="w-28"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">End</label>
                      <Input
                        type="time"
                        value={newEnd}
                        onChange={(e) => setNewEnd(e.target.value)}
                        className="w-28"
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-[120px]">
                      <label className="text-xs text-muted-foreground">Label (optional)</label>
                      <Input
                        placeholder="e.g., Evening batch"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAdd} size="sm" className="mt-auto">
                      <Plus className="h-4 w-4 mr-1.5" /> Add time
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {daySlots.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-center">
                        <Clock className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          No time slots for {label}
                        </p>
                      </div>
                    ) : (
                      daySlots.map((s: any) => {
                        const slotEnabled = getSlotEnabled(s.id);
                        return (
                          <div
                            key={s.id}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-lg border p-3 transition-all",
                              !slotEnabled ? "bg-muted/30 opacity-60" : "hover:border-primary/30",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={slotEnabled}
                                onCheckedChange={() => handleToggleSlot(s.id, slotEnabled)}
                              />
                              <div>
                                <div className="text-sm font-medium">
                                  {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                                </div>
                                {s.label && (
                                  <div className="text-xs text-muted-foreground">{s.label}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  slotEnabled
                                    ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                                    : "text-muted-foreground",
                                )}
                              >
                                {slotEnabled ? "Active" : "Inactive"}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="Duplicate to next day"
                                onClick={async () => {
                                  try {
                                    const currentIndex = DAY_KEYS.indexOf(s.day_of_week as (typeof DAY_KEYS)[number]);
                                    const nextDayKey = DAY_KEYS[(currentIndex + 1) % 7];
                                    await duplicateToDay(s.id, nextDayKey);
                                    toast.success(`Duplicated to ${DAY_LABELS[(currentIndex + 1) % 7]}`);
                                  } catch (e) {
                                    toast.error((e as Error).message);
                                  }
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Delete slot"
                                onClick={async () => {
                                  try {
                                    await deleteSlot(s.id);
                                    toast.success("Slot deleted");
                                  } catch (e) {
                                    toast.error((e as Error).message);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}