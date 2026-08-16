import { createFileRoute, redirect } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";

export const Route = createFileRoute("/_authenticated/mentor/demo-requests")({
  beforeLoad: () => {
    throw redirect({ to: "/mentor/calendar" });
  },
  component: () => null,
});