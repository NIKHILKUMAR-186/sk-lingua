import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  Clock,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Languages,
  ArrowRight,
  GraduationCap,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { formatHoldRemaining, type BookingHold } from "@/lib/slot-holds";

export function SessionConfirmCard({
  mentorName,
  date,
  slotLabel,
  durationMins,
  sessionsBefore,
  sessionsAfter,
  isPending,
  onConfirm,
  onCancel,
  hold,
  onHoldExpired,
}: {
  mentorName: string;
  date: string;
  slotLabel: string;
  durationMins: number;
  sessionsBefore: number;
  sessionsAfter: number;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  hold?: BookingHold | null;
  onHoldExpired?: () => void;
}) {
  const [holdRemaining, setHoldRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!hold?.expires_at) return;
    const update = () => {
      const remaining = formatHoldRemaining(hold.expires_at);
      setHoldRemaining(remaining);
      if (remaining === "Expired") {
        onHoldExpired?.();
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [hold, onHoldExpired]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Confirm Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mentor</span>
              <span className="font-medium flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-primary" />
                {mentorName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> Date
              </span>
              <span className="font-medium">{format(new Date(date), "d MMM yyyy")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" /> Time
              </span>
              <span className="font-medium">{slotLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" /> Duration
              </span>
              <span className="font-medium">{durationMins} minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Languages className="h-4 w-4" /> Language
              </span>
              <span className="font-medium">English</span>
            </div>
          </div>

          <Separator />

          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Sessions remaining</div>
            <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
              {sessionsBefore}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              {sessionsAfter}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Balance unchanged when booking. One session credit is consumed when this session is
              completed.
            </p>
          </div>

          {holdRemaining && (
            <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3 text-sm">
              <span className="text-muted-foreground">Slot reserved for</span>
              <span className="font-medium text-primary">{holdRemaining}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={onConfirm} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking...
                </>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Confirming reserves this slot. Your session credit is consumed after the session is
            completed.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** P5 — Success screen after a confirmed booking. */
export function BookingSuccessCard({
  mentorName,
  dateLabel,
  slotLabel,
  sessionsRemaining,
  onViewSessions,
}: {
  mentorName: string;
  dateLabel: string;
  slotLabel: string;
  sessionsRemaining: number;
  onViewSessions: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-emerald-500/30">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h3 className="mt-3 text-lg font-semibold">Session booked</h3>
          <p className="mt-1 text-sm font-medium">{mentorName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateLabel} · {slotLabel}
          </p>
          <p className="mt-3 rounded-lg bg-muted/50 py-2 text-sm font-semibold">
            {sessionsRemaining} sessions remaining
          </p>
          <Button className="mt-4 w-full" onClick={onViewSessions}>
            View My Sessions
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
