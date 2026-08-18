import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Video,
  Sparkles,
  Clock,
  CheckCircle2,
  ArrowRight,
  Star,
  BookOpen,
  XCircle,
  CalendarX,
} from "lucide-react";

interface DemoCtaCardProps {
  hasDemoBooking?: boolean;
  demoStatus?: string;
  demoUsed?: boolean;
}

type DemoState = "available" | "requested" | "confirmed" | "completed" | "cancelled" | "ineligible";

function getDemoState(props: DemoCtaCardProps): DemoState {
  if (props.demoUsed) return "ineligible";
  if (!props.hasDemoBooking) return "available";
  const status = props.demoStatus;
  if (status === "confirmed") return "confirmed";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "no_show") return "cancelled";
  return "requested";
}

export function DemoCtaCard({ hasDemoBooking, demoStatus, demoUsed }: DemoCtaCardProps) {
  const state = getDemoState({ hasDemoBooking, demoStatus, demoUsed });

  if (state === "ineligible") {
    return null;
  }

  if (state === "requested") {
    return (
      <Card className="overflow-hidden border-2 border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-background">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">Demo Request Received</h3>
                <p className="text-sm text-muted-foreground">
                  Our team is reviewing your request and will confirm your slot shortly.
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Pending
            </Badge>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-2 w-2 rounded-full bg-amber-500" />
            <span>Check your notifications for updates</span>
          </div>
        </div>
      </Card>
    );
  }

  if (state === "confirmed") {
    return (
      <Card className="overflow-hidden border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-background">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">Demo Confirmed</h3>
                <p className="text-sm text-muted-foreground">
                  Your demo session is scheduled. Check your notifications for the meeting link.
                </p>
              </div>
            </div>
            <Badge variant="default" className="gap-1 bg-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              Confirmed
            </Badge>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Video className="h-4 w-4 text-emerald-600" />
            <span>Join 5 minutes early to test your audio and video</span>
          </div>
        </div>
      </Card>
    );
  }

  if (state === "completed") {
    return (
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">Demo Complete</h3>
                <p className="text-sm text-muted-foreground">
                  Your demo is done. Find a mentor to continue your learning journey.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </Badge>
          </div>

          <div className="mt-4">
            <Button asChild size="sm" className="gap-2">
              <Link to="/student/explore">
                Find your mentor
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (state === "cancelled") {
    return (
      <Card className="overflow-hidden border-2 border-dashed border-border">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60">
                <CalendarX className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">Demo Cancelled</h3>
                <p className="text-sm text-muted-foreground">
                  Your demo was cancelled. Book a new demo to get started.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/student/demo-session">
                Book a Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // STATE: available — show promotional CTA
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
              >
                <Sparkles className="h-7 w-7" />
              </motion.div>
              <div>
                <h3 className="font-display text-xl font-bold">Start your Lingua journey</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Not sure where to start? Let us match you with a mentor.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-background/50 p-4">
              <h4 className="mb-2 text-sm font-semibold">Demo Session</h4>
              <p className="text-xs text-muted-foreground">
                Tell us when you&apos;d like to learn. Our team will match you with an available mentor and confirm the details.
              </p>
            </div>
            <div className="rounded-xl border bg-background/50 p-4">
              <h4 className="mb-2 text-sm font-semibold">Regular Session</h4>
              <p className="text-xs text-muted-foreground">
                Already know what you need? Browse mentors and book a session directly.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link to="/student/demo-session">
                <Video className="h-4 w-4" />
                Book a Demo
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link to="/student/explore">
                <BookOpen className="h-4 w-4" />
                Browse Mentors
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}