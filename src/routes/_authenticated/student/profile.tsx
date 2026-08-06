import { createFileRoute } from "@tanstack/react-router";
import { StudentSettingsPage } from "./student-settings";

export const Route = createFileRoute("/_authenticated/student/profile")({
  component: StudentSettingsPage,
});
