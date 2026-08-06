import { DAY_KEYS, DAY_LABELS } from "@/lib/booking";
import { useAuth } from "@/hooks/use-auth";
import { useAvailability } from "@/hooks/use-availability";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Clock, Copy, Plus, Trash2 } from "lucide-react";

export function MentorAvailability() {
  const { data: auth } = useAuth();
  const mentorId = auth?.user?.id;
  const { slots, isLoading, addSlot, deleteSlot, duplicateToDay, updateSlot } =
    useAvailability(mentorId);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newLabel, setNewLabel] = useState("");
  const [dayIndex, setDayIndex] = useState(0);
  // Optimistic toggle state: immediately reflect toggle changes before API responds
  const [optimisticToggles, setOptimisticToggles] = useState<Record<string, boolean | undefined>>(
    {},
  );
  // Track loading state per day key
  const [dayLoading, setDayLoading] = useState<Record<string, boolean>>({});

  const grouped: Record<string, any[]> = {};
  (slots ?? []).forEach((s) => {
    grouped[s.day_of_week] = grouped[s.day_of_week] ?? [];
    grouped[s.day_of_week].push(s);
  });

  // Compute if a day is effectively enabled (considering optimistic toggles)
  function getDayEnabled(dayKey: string): boolean {
    const dayOptKey = `day:${dayKey}`;
    // If there's an optimistic toggle pending, use that
    if (dayOptKey in optimisticToggles) {
      return optimisticToggles[dayOptKey] ?? false;
    }
    // Otherwise fall back to actual data
    return (grouped[dayKey] ?? []).some((s: any) => s.is_available !== false);
  }

  // Compute if a slot is effectively enabled (considering optimistic toggles)
  function getSlotEnabled(slotId: string): boolean {
    if (slotId in optimisticToggles) {
      return optimisticToggles[slotId] ?? false;
    }
    const slot = (slots ?? []).find((s: any) => s.id === slotId);
    return slot?.is_available !== false;
  }

  // Check which days have any slots configured (ignoring availability)
  const dayHasSlots = useMemo(() => {
    const result: Record<string, boolean> = {};
    DAY_KEYS.forEach((key) => {
      result[key] = (grouped[key] ?? []).length > 0;
    });
    return result;
  }, [grouped]);

  // Count total active slots across the week
  const totalSlots = useMemo(() => {
    return (slots ?? []).length;
  }, [slots]);

  async function handleAdd() {
    if (!mentorId) {
      console.warn("⚠️  mentorId is not set");
      return;
    }
    try {
      await addSlot({
        mentor_id: mentorId,
        day_of_week: DAY_KEYS[dayIndex],
        start_time: newStart,
        end_time: newEnd,
        is_available: true,
        label: newLabel || null,
      });
      setNewLabel("");
      toast.success("Slot added");
    } catch (e) {
      console.error("❌ handleAdd error:", e);
      toast.error(String(e instanceof Error ? e.message : e));
    }
  }

  async function handleToggleDay(dayKey: string, enable: boolean) {
    if (!mentorId) return;

    const dayOptKey = `day:${dayKey}`;

    // Optimistic: immediately reflect the toggle
    setOptimisticToggles((prev) => ({ ...prev, [dayOptKey]: enable }));
    setDayLoading((prev) => ({ ...prev, [dayKey]: true }));

    try {
      // If enabling a day that has no slots, add a default slot
      if (enable && (!grouped[dayKey] || grouped[dayKey].length === 0)) {
        await addSlot({
          mentor_id: mentorId,
          day_of_week: dayKey,
          start_time: "09:00",
          end_time: "10:00",
          is_available: true,
          label: null,
        });
        toast.success(
          `${DAY_LABELS[DAY_KEYS.indexOf(dayKey as (typeof DAY_KEYS)[number])]} enabled with default slot`,
        );
      } else {
        // Toggle availability of all slots in that day
        const daySlots = grouped[dayKey] ?? [];
        if (daySlots.length > 0) {
          for (const slot of daySlots) {
            await updateSlot(slot.id, { is_available: enable });
          }
          toast.success(
            `${DAY_LABELS[DAY_KEYS.indexOf(dayKey as (typeof DAY_KEYS)[number])]} ${enable ? "enabled" : "disabled"}`,
          );
        }
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      // Clear optimistic state - data will come from server via refetch
      setOptimisticToggles((prev) => {
        const next = { ...prev };
        delete next[dayOptKey];
        return next;
      });
      setDayLoading((prev) => ({ ...prev, [dayKey]: false }));
    }
  }

  async function handleToggleSlot(slotId: string, currentAvailable: boolean) {
    const newValue = !currentAvailable;

    // Optimistic: immediately reflect
    setOptimisticToggles((prev) => ({ ...prev, [slotId]: newValue }));

    try {
      await updateSlot(slotId, { is_available: newValue });
      toast.success(newValue ? "Slot enabled" : "Slot disabled");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      // Clear optimistic state
      setOptimisticToggles((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
    }
  }

  function handleSelectDay(index: number) {
    setDayIndex(index);
  }

  return (
    <div className="space-y-6">
      {/* Weekly summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Weekly availability</span>
            <Badge variant="secondary" className="text-xs">
              {totalSlots} slot{totalSlots !== 1 ? "s" : ""} configured
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* All 7 days overview with toggles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-6">
            {DAY_LABELS.map((label, i) => {
              const dayKey = DAY_KEYS[i];
              const hasSlots = dayHasSlots[dayKey];
              const isEnabled = getDayEnabled(dayKey);
              const isCurrent = i === dayIndex;
              const isLoadingDay = dayLoading[dayKey];

              return (
                <div
                  key={label}
                  className={`relative rounded-lg border p-3 transition-all cursor-pointer ${
                    isCurrent
                      ? "ring-2 ring-primary border-primary bg-primary/5"
                      : "hover:border-primary/30 hover:bg-accent/30"
                  } ${!hasSlots && !isEnabled ? "opacity-60" : ""}`}
                  onClick={() => handleSelectDay(i)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate">{label.slice(0, 3)}</span>
                    <Switch
                      checked={isEnabled}
                      disabled={isLoadingDay}
                      onCheckedChange={(checked) => {
                        handleToggleDay(dayKey, checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="scale-75"
                    />
                  </div>
                  {hasSlots ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {(grouped[dayKey] ?? []).length} slot
                        {(grouped[dayKey] ?? []).length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground/50">No slots</div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected day management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {DAY_LABELS[dayIndex]} — Time slots
              </h3>
              <Badge variant="outline" className="text-xs">
                {(grouped[DAY_KEYS[dayIndex]] ?? []).length} total
              </Badge>
            </div>

            {/* Add new slot form */}
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-28"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="w-28"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-[120px]">
                <Label className="text-xs">Label (optional)</Label>
                <Input
                  placeholder="e.g., Lunch break, Evening batch"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <Button onClick={handleAdd} size="sm" className="mt-auto">
                <Plus className="h-4 w-4 mr-1" /> Add slot
              </Button>
            </div>

            {/* Slot list for selected day */}
            <div className="space-y-2">
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading slots...
                </div>
              )}

              {!isLoading &&
                (!grouped[DAY_KEYS[dayIndex]] || grouped[DAY_KEYS[dayIndex]].length === 0) && (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No time slots for {DAY_LABELS[dayIndex]}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Add your first time slot above
                    </p>
                  </div>
                )}

              {(grouped[DAY_KEYS[dayIndex]] ?? []).map((s: any) => {
                const slotEnabled = getSlotEnabled(s.id);
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border p-3 transition-all ${
                      !slotEnabled ? "bg-muted/30 opacity-60" : "hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={slotEnabled}
                        onCheckedChange={() => handleToggleSlot(s.id, slotEnabled)}
                      />
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          <span>
                            {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                          </span>
                          {!slotEnabled ? (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Disabled
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-green-600 border-green-200 bg-green-50"
                            >
                              Active
                            </Badge>
                          )}
                        </div>
                        {s.label && <div className="text-xs text-muted-foreground">{s.label}</div>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="Duplicate to tomorrow"
                        onClick={async () => {
                          try {
                            const nextDayKey = DAY_KEYS[(dayIndex + 1) % 7];
                            await duplicateToDay(s.id, nextDayKey);
                            toast.success(`Duplicated to ${DAY_LABELS[(dayIndex + 1) % 7]}`);
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
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
