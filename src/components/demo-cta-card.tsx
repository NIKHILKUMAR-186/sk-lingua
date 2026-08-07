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
} from "lucide-react";

interface DemoCtaCardProps {
  hasDemoBooking?: boolean;
  demoStatus?: string;
  onBookDemo?: () => void;
}

export function DemoCtaCard({ hasDemoBooking, demoStatus, onBookDemo }: DemoCtaCardProps) {
  if (hasDemoBooking) {
    return (
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">Demo Session Booked</h3>
                <p className="text-sm text-muted-foreground">
                  Our team is confirming your demo slot
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {demoStatus === "confirmed"
                ? "Confirmed"
                : demoStatus === "completed"
                  ? "Completed"
                  : "Pending Confirmation"}
            </Badge>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Check your notifications for the meeting link and scheduling details</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg"
              >
                <Sparkles className="h-8 w-8" />
              </motion.div>
              <div>
                <Badge className="mb-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <Star className="mr-1 h-3 w-3" />
                  Limited Offer
                </Badge>
                <h3 className="font-display text-2xl font-bold">Book Your Demo Session</h3>
<p className="mt-1 text-muted-foreground">
                  Experience personalized learning with our expert team
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">₹9</div>
              <div className="text-xs text-muted-foreground">30 minutes</div>
            </div>
          </div>

{/* Benefits */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Video, text: "Live video session" },
              { icon: Sparkles, text: "Personalized learning plan" },
              { icon: Star, text: "Expert guidance" },
              { icon: BookOpen, text: "Language assessment" },
            ].map((benefit, index) => (
              <motion.div
                key={benefit.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 rounded-lg border bg-background/50 p-3"
              >
                <benefit.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{benefit.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Timeline */}
          <div className="mt-6 rounded-xl border bg-background/50 p-4">
            <h4 className="mb-3 text-sm font-semibold">What to expect:</h4>
            <div className="space-y-2">
              {[
                "Discuss your learning goals and current level",
                "Experience our platform features and teaching methodology",
                "Get a personalized learning roadmap",
                "Learn about subscription plans and pricing",
              ].map((step, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <span className="text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 flex items-center justify-between rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
            <div>
              <p className="font-semibold">Ready to get started?</p>
              <p className="text-sm text-muted-foreground">
                Book now and take the first step towards fluency
              </p>
            </div>
            <Button asChild size="lg" className="gap-2 shadow-lg">
              <Link to="/student/demo-session">
                Book Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
