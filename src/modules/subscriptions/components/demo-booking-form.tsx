import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Calendar, Clock, Languages, MessageSquare, AlertCircle } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";

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
}

export function DemoBookingForm({ onSubmit, loading, error }: DemoBookingFormProps) {
  const [date, setDate] = useState<string>("");
  const [timeStart, setTimeStart] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const availableTimes = [
    { start: "09:00", end: "09:30", label: "09:00 AM - 09:30 AM" },
    { start: "10:00", end: "10:30", label: "10:00 AM - 10:30 AM" },
    { start: "11:00", end: "11:30", label: "11:00 AM - 11:30 AM" },
    { start: "14:00", end: "14:30", label: "02:00 PM - 02:30 PM" },
    { start: "15:00", end: "15:30", label: "03:00 PM - 03:30 PM" },
    { start: "16:00", end: "16:30", label: "04:00 PM - 04:30 PM" },
    { start: "17:00", end: "17:30", label: "05:00 PM - 05:30 PM" },
    { start: "18:00", end: "18:30", label: "06:00 PM - 06:30 PM" },
    { start: "19:00", end: "19:30", label: "07:00 PM - 07:30 PM" },
  ];

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
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
            onChange={(e) => setDate(e.target.value)}
            min={minDate}
            disabled={loading}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">Choose any date from tomorrow onwards</p>
        </div>

        {/* Time Selection */}
        <div className="space-y-2">
          <Label htmlFor="time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Select Time (IST)
          </Label>
          <Select value={timeStart} onValueChange={setTimeStart} disabled={loading}>
            <SelectTrigger id="time">
              <SelectValue placeholder="Choose a time slot" />
            </SelectTrigger>
            <SelectContent>
              {availableTimes.map((time) => (
                <SelectItem key={time.start} value={time.start}>
                  {time.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Session duration: 30 minutes</p>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <Label htmlFor="language" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Learning Language
          </Label>
          <Select value={language} onValueChange={setLanguage} disabled={loading}>
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
          <p className="text-xs text-muted-foreground">Your mentor will teach in this language</p>
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
            Share any specific goals or concerns with your mentor
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
                  <span className="text-muted-foreground">Language:</span>
                  <span className="font-medium">
                    {LANGUAGES.find((item) => item.code === language)?.name ?? language}
                  </span>
                </div>
                <div className="border-t border-primary/20 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Price:</span>
                    <span>₹9</span>
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
      </motion.div>
    </div>
  );
}
