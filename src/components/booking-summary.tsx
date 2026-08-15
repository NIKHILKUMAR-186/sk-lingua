import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock, Video, Shield, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { BookingSummary as BookingSummaryType } from "@/hooks/use-booking";

interface BookingSummaryProps {
  summary: BookingSummaryType;
  onMessageChange: (msg: string) => void;
  message: string;
  onConfirm: () => void;
  isPending: boolean;
}

export function BookingSummary({
  summary,
  onMessageChange,
  message,
  onConfirm,
  isPending,
}: BookingSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Booking summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mentor</span>
              <span className="text-sm font-medium">{summary.mentorName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Session</span>
              <span className="text-sm font-medium">{summary.sessionType}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> Date
              </span>
              <span className="text-sm font-medium">
                {format(new Date(summary.date), "EEEE, MMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" /> Time
              </span>
              <span className="text-sm font-medium">{summary.slotLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" /> Duration
              </span>
              <span className="text-sm font-medium">{summary.durationMins} minutes</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message to mentor (optional)</label>
            <Textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Tell your mentor what you'd like to focus on..."
              rows={3}
            />
          </div>

          <Button className="w-full" size="lg" onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" /> Confirm Booking
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your session will be confirmed immediately.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
