import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Clock, Plus, Trash2, Globe } from "lucide-react";
import { DAY_KEYS, DAY_LABELS } from "@/lib/booking";

/**
 * Admin view/editor for a single mentor's availability slots.
 *
 * Admins manage mentor availability through the admin-only API route
 * (`/api/admin/mentor-availability`) rather than the Supabase anon client,
 * because a browser anon client cannot act as an admin. The mentor
 * self-service flow stays on the direct Supabase-client + RLS
 * `availability_slots` path.
 */
export function AdminMentorAvailability({
  mentorId,
  mentorName,
}: {
  mentorId: string;
  mentorName?: string;
}) {
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newLabel, setNewLabel] = useState("");
  const [newDay, setNewDay] = useState("monday");
  const [newTimezone, setNewTimezone] = useState("Asia/Kolkata");

  const loadSlots = async () => {
    if (!mentorId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/mentor-availability?mentorId=${encodeURIComponent(mentorId)}`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSlots(json.data ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      await loadSlots();
      void mounted;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      mounted = false;
    };
  }, [mentorId]);

  const grouped = slots.reduce<Record<string, any[]>>((acc, s) => {
    acc[s.day_of_week] = acc[s.day_of_week] ?? [];
    acc[s.day_of_week].push(s);
    return acc;
  }, {});
  void grouped;

  async function handleAdd() {
    if (!mentorId) return;
    try {
      const res = await fetch("/api/admin/mentor-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId,
          day_of_week: newDay,
          start_time: newStart,
          end_time: newEnd,
          label: newLabel || null,
          timezone: newTimezone || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSlots((prev) => [...prev, json.data]);
      setNewLabel("");
      toast.success("Slot added");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/mentor-availability/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSlots((prev) => prev.filter((s) => s.id !== id));
      toast.success("Slot deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/admin/mentor-availability/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: !current }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSlots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_available: !current } : s)),
      );
      toast.success(current ? "Slot disabled" : "Slot enabled");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

    const activeCount = slots.filter((s) => s.is_available !== false).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            Availability{" "}
            {mentorName ? `- ${mentorName}` : ""}
          </span>
          <Badge variant="secondary" className="text-xs">
            {activeCount} active slot{activeCount !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new slot form */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <Label>Day</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={newDay}
              onChange={(e) => setNewDay(e.target.value)}
            >
              {DAY_KEYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS[DAY_KEYS.indexOf(d)]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Start</Label>
            <Input
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="w-28"
            />
          </div>
          <div className="space-y-1">
            <Label>End</Label>
            <Input
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="w-28"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-[120px]">
            <Label>Label (optional)</Label>
            <Input
              placeholder="e.g., Evening batch"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1 w-40">
            <Label>Timezone</Label>
            <Input
              value={newTimezone}
              onChange={(e) => setNewTimezone(e.target.value)}
              placeholder="Asia/Kolkata"
            />
          </div>
          <Button onClick={handleAdd} size="sm" className="mt-auto">
            <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
        </div>

        {/* Slot list */}
        <div className="space-y-2">
          {isLoading && (
            <div className="text-sm text-muted-foreground py-2">Loading...</div>
          )}
          {slots.length === 0 && !isLoading && (
            <div className="text-sm text-muted-foreground py-2">
              No availability slots configured.
            </div>
          )}
          {slots
            .slice()
            .sort((a, b) => {
              const da = DAY_KEYS.indexOf(a.day_of_week);
              const db = DAY_KEYS.indexOf(b.day_of_week);
              if (da !== db) return da - db;
              return (a.start_time || "").localeCompare(b.start_time || "");
            })
            .map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between gap-2 rounded-lg border p-3 ${
                  s.is_available === false ? "bg-muted/30 opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={s.is_available !== false}
                    onCheckedChange={() =>
                      handleToggle(s.id, s.is_available !== false)
                    }
                  />
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span>
                        {DAY_LABELS[DAY_KEYS.indexOf(s.day_of_week)]} —{" "}
                        {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                      </span>
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {s.timezone && (
                        <Badge
                          variant="outline"
                          className="text-[10px] flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          {s.timezone}
                        </Badge>
                      )}
                      {s.is_available === false ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground"
                        >
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
                    {s.label && (
                      <div className="text-xs text-muted-foreground">
                        {s.label}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}