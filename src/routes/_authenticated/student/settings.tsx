import { createFileRoute } from "@tanstack/react-router";
import { StudentSettingsPage } from "./student-settings";

export const Route = createFileRoute("/_authenticated/student/settings")({
  component: StudentSettings,
});

function StudentSettings() {
  return <StudentSettingsPage />;
}
