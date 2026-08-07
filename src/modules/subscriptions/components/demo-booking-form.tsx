import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, Languages, MessageSquare, AlertCircle, Loader2 } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSlotsByDate } from "@/hooks/use-slots";
import { getSlotAvailabilityStatus, formatSlotTime } from "@/lib/slots";
import { Badge } from "@/components/ui/badge";

interface DemoBookingFormProps {
  onSubmit: (data: {
    booking_date: string;
    booking_time_start: string;
    booking_time_end: string;
    language: string;
    notes?: string;
  }) => void;
  loading?: boolean;
  error?: string;
  price?: number;
}

export function DemoBookingForm({ onSubmit, loading, error, price = 9 }: DemoBookingFormProps) {
  const [date, setDate] = useState<string>("");
  const [timeStart, setTimeStart] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  // Fetch real available slots from the database for the selected date/language
  const { data: slots = [], isLoading: slotsLoading } = useSlotsByDate(
    date || null,
    language || undefined,
  );

  // Group slots by date for the date picker
  const availableDates = useMemo(() => {
    const dateSet = new Set<string>();
    const start = new Date(tomorrow);
    const end = new Date();
    end.setDate(end.getDate() + 30); // Show next 30 days

    // Add tomorrow onwards
    while (start <= end) {
      dateSet.add(start.toISOString().split("T")[0]);
      start.setDate(start.getDate() + 1);
    }
    return Array.from(dateSet);
  }, []);

  const availableTimes = useMemo(() => {
    return slots
      .filter((slot) => slot.status === "available" || slot.status === "limited")
      .map((slot) => ({
        id: slot.id,
        start: slot.slot_time_start,
        end: slot.slot_time_end,
        slot,
        label: formatSlotTime(slot),
        availability: getSlotAvailabilityStatus(slot),
      }));
  }, [slots]);

  const selectedTimeSlot = availableTimes.find((t) => t.start === timeStart)?.slot;

  function handleSubmit() {
    if (!date || !timeStart || !language) {
      return;
    }

    const timeSlot = availableTimes.find((t) => t.start === timeStart);
    if (!timeSlot) return;

    onSubmit({
      booking_date: date,
      booking_time_start: timeStart,
      booking_time_end: timeSlot.end,
      language,
      notes: notes || undefined,
    });
  }

  const isValid = date && timeStart && language;

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {/* Date Selection */}
        <div className="space-y-2">
          <Label htmlFor="date" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Select Date
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setTimeStart(""); // reset time when date changes
            }}
            min={minDate}
            max={availableDates[availableDates.length - 1]}
            disabled={loading}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">Choose any date from tomorrow onwards</p>
        </div>

        {/* Language Selection (moved before time so slots can filter by language) */}
        <div className="space-y-2">
          <Label htmlFor="language" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Learning Language
          </Label>
          <Select
            value={language}
            onValueChange={(val) => {
              setLanguage(val);
              setTimeStart(""); // reset time when language changes
            }}
            disabled={loading}
          >
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((languageOption) => (
                <SelectItem key={languageOption.code} value={languageOption.code}>
                  {languageOption.emoji} {languageOption.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
<p className="text-xs text-muted-foreground">Your session will be conducted in this language</p>
        </div>

        {/* Time Selection - populated from real available slots */}
        <div className="space-y-2">
          <Label htmlFor="time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Select Time (IST)
          </Label>

          {date && !language ? (
            <Alert className="bg-muted">
              <AlertDescription className="text-sm">
                Select a language first to see available time slots.
              </AlertDescription>
            </Alert>
          ) : date && language && slotsLoading ? (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading available slots...
            </div>
          ) : date && language && availableTimes.length === 0 ? (
            <Alert>
              <AlertDescription className="text-sm">
                No available slots for this date and language. Please try a different date.
              </AlertDescription>
            </Alert>
          ) : (
            <Select value={timeStart} onValueChange={setTimeStart} disabled={loading || !date || !language}>
              <SelectTrigger id="time">
                <SelectValue placeholder={date && language ? "Choose a time slot" : "Select date & language first"} />
              </SelectTrigger>
              <SelectContent>
                {availableTimes.map((time) => (
                  <SelectItem key={time.start} value={time.start}>
                    <div className="flex items-center justify-between gap-3">
                      <span>{time.label}</span>
                      <Badge
                        variant={time.availability.status === "available" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {time.availability.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground">Session duration: 30 minutes</p>
        </div>

        {/* Optional Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Additional Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="E.g., 'I'm a complete beginner', 'I want to focus on conversational skills', etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={loading}
            rows={4}
          />
<p className="text-xs text-muted-foreground">
            Share any specific goals or concerns with our expert team
          </p>
        </div>

        {/* Summary */}
        {date && timeStart && language && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{new Date(date).toDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">
                    {availableTimes.find((t) => t.start === timeStart)?.label}
                  </span>
                </div>
<div className="flex justify-between">
                  <span className="text-muted-foreground">Conducted by:</span>
                  <span className="font-medium">Our expert team</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Language:</span>
                  <span className="font-medium">
                    {LANGUAGES.find((item) => item.code === language)?.name ?? language}
                  </span>
                </div>
                <div className="border-t border-primary/20 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Price:</span>
                    <span>₹{price}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Button onClick={handleSubmit} disabled={!isValid || loading} size="lg" className="w-full">
          {loading ? "Processing..." : "Continue to Payment"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          ✓ Secure payment • ✓ Money-back guarantee • ✓ No commitment
        </p>
      </div>
    </div>
  );
}