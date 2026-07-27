import { DAY_KEYS, DAY_LABELS } from "@/lib/booking";
import { useAuth } from "@/hooks/use-auth";
import { useAvailability } from "@/hooks/use-availability";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export function MentorAvailability() {
  const { data: auth } = useAuth();
  const mentorId = auth?.user?.id;
  const { slots, isLoading, addSlot, deleteSlot, duplicateToDay } = useAvailability(mentorId);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newLabel, setNewLabel] = useState("");
  const [dayIndex, setDayIndex] = useState(0);

  const grouped: Record<string, any[]> = {};
  (slots ?? []).forEach((s) => {
    grouped[s.day_of_week] = grouped[s.day_of_week] ?? [];
    grouped[s.day_of_week].push(s);
  });

  async function handleAdd() {
    if (!mentorId) {
      console.warn("⚠️  mentorId is not set");
      return;
    }
    console.log("🔵 handleAdd clicked");
    console.log("Current User ID:", auth?.user?.id);
    console.log("mentorId state:", mentorId);
    console.log("Auth object:", { user_id: auth?.user?.id, email: auth?.user?.email });
    
    try {
      await addSlot({ 
        mentor_id: mentorId, 
        day_of_week: DAY_KEYS[dayIndex], 
        start_time: newStart, 
        end_time: newEnd, 
        is_available: true, 
        label: newLabel || null 
      });
      setNewLabel("");
      toast.success("Slot added");
    } catch (e) { 
      console.error("❌ handleAdd error:", e);
      toast.error(String(e instanceof Error ? e.message : e)); 
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 overflow-auto">
          {DAY_LABELS.map((label, i) => (
            <button key={label} type="button" onClick={() => setDayIndex(i)} className={`rounded-md px-3 py-1 text-sm ${i === dayIndex ? "bg-primary text-primary-foreground" : "border"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
            <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            <Input placeholder="Label (optional)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            <Button onClick={handleAdd}>Add Slot</Button>
          </div>
          <div className="space-y-2">
            {(grouped[DAY_KEYS[dayIndex]] ?? []).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                <div className="text-sm">{s.start_time} – {s.end_time} {s.label ? `• ${s.label}` : null}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => duplicateToDay(s.id, DAY_KEYS[(dayIndex + 1) % 7])}>Duplicate → next day</Button>
                  <Button size="sm" variant="destructive" onClick={async () => { try { await deleteSlot(s.id); toast.success('Deleted'); } catch (e) { toast.error((e as Error).message); } }}>Delete</Button>
                </div>
              </div>
            ))}
            {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
