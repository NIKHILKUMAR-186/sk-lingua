import { createFileRoute } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { MentorAvailability } from "@/components/mentor-availability";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/mentor/availability")({
  component: MentorAvailabilityPage,
});

/**
 * Mentor Availability page.
 *
 * Backed by the single, canonical P4 availability engine:
 *   mentor -> availability_slots (Supabase JS client + RLS).
 *
 * This page deliberately does NOT use the legacy `mentor_availability`
 * (working_days) table, nor any `/api/mentor/availability` endpoint, so the
 * mentor write path stays consistent with mentor-profile editing and avoids a
 * second backend architecture / unresolvable-endpoint 404.
 */
function MentorAvailabilityPage() {
  return (
    <MentorLayout>
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-display">Availability</h1>
          <p className="text-muted-foreground">
            Set the weekly time slots when you are available for sessions. These
            slots define when students can book you.
          </p>
        </motion.div>

        <MentorAvailability />
      </div>
    </MentorLayout>
  );
}
