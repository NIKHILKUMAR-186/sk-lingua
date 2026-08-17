import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayDayName, type MentorAvailabilitySlot, type MentorDetail } from "@/lib/mentor-domain";

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

type SlotGroup = { day: string; slots: MentorAvailabilitySlot[] };

export function MentorAvailabilityView({ mentor }: { mentor: MentorDetail }) {
  const slots = mentor.availabilitySlots || [];
  const today = todayDayName();

  const groups = DAY_ORDER.filter((d) => slots.some((s) => s.dayOfWeek === d)).map((d) => ({
    day: d,
    slots: slots
      .filter((s) => s.dayOfWeek === d)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
  const extra = slots.filter((s) => !DAY_ORDER.includes(s.dayOfWeek));
  if (extra.length > 0) groups.push({ day: "other", slots: extra });

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        <div>
          <h3 className="text-sm font-medium">Weekly availability</h3>
          <p className="text-xs text-muted-foreground">
            {mentor.availability.activeSlots} active slot
            {mentor.availability.activeSlots !== 1 ? "s" : ""} across{" "}
            {mentor.availability.totalSlots} total
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This mentor has not configured any availability.
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map((g: SlotGroup) => (
              <div key={g.day} className="flex items-start gap-3">
                <div className="w-20 text-xs font-medium uppercase text-muted-foreground">
                  {g.day === "other" ? "Other" : DAY_LABELS[g.day]}
                </div>
                <div className="flex-1 space-y-1.5">
                  {g.slots.map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-1.5",
                        s.dayOfWeek === today && s.isAvailable
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-border bg-muted/30",
                        !s.isAvailable && "opacity-50",
                      )}
                      title={s.label || undefined}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {formatTime(s.startTime)} – {formatTime(s.endTime)}
                        </span>
                        {s.timezone && (
                          <span className="text-xs text-muted-foreground">({s.timezone})</span>
                        )}
                        {s.dayOfWeek === today && s.isAvailable && (
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-800">
                            Today
                          </Badge>
                        )}
                        {!s.isAvailable && (
                          <Badge variant="outline" className="text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Availability summary</CardTitle>
            <CardDescription>Utilization for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span>Booked vs available</span>
                <span className="font-medium">
                  {mentor.availability.bookedOccurrences ?? 0}/
                  {mentor.availability.totalOccurrences ?? 0}
                </span>
              </div>
              <Progress value={mentor.availability.utilizationPercent} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-display">{mentor.availability.todaySlots}</p>
                <p className="text-xs text-muted-foreground">Slots today</p>
              </div>
              <div>
                <p className="text-2xl font-display">{mentor.availability.todayBooked}</p>
                <p className="text-xs text-muted-foreground">Booked today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {mentor.timezone && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Primary timezone: {mentor.timezone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(t: string): string {
  try {
    const d = new Date(`1970-01-01T${t}`);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return t;
  }
}
