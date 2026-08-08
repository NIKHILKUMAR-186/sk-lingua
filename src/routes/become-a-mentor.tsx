import { createFileRoute, Link, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/become-a-mentor")({
  head: () => ({
    meta: [
      { title: "Become a mentor — Lingua" },
      {
        name: "description",
        content:
          "Apply to become a Lingua mentor and join our vetted marketplace of language learners.",
      },
      { property: "og:title", content: "Become a mentor — Lingua" },
      {
        property: "og:description",
        content:
          "Apply to become a Lingua mentor and join our vetted marketplace of language learners.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/mentor-signup" });
  },
});
