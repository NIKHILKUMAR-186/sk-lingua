import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/student/book")({
  beforeLoad: () => {
    throw redirect({ to: "/student/book-session" });
  },
});
