import { createFileRoute } from "@tanstack/react-router";
import { LandingNavbar } from "@/modules/landing/components/landing-navbar";
import { Hero } from "@/modules/landing/components/hero";
import { ProductJourney } from "@/modules/landing/components/product-journey";
import { MentorShowcase } from "@/modules/landing/components/mentor-showcase";
import { SessionPreview } from "@/modules/landing/components/session-preview";
import { Benefits } from "@/modules/landing/components/benefits";
import { FinalCta } from "@/modules/landing/components/final-cta";
import { LandingFooter } from "@/modules/landing/components/landing-footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lingua — Learn a language from a real human" },
      {
        name: "description",
        content:
          "Book 1-on-1 video lessons with real human mentors. Build daily streaks and level up in Spanish, Japanese, French and more.",
      },
      { property: "og:title", content: "Lingua — Learn a language from a real human" },
      {
        property: "og:description",
        content: "Book 1-on-1 video lessons with real mentors. Build daily streaks.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <a
        href="#home"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background"
      >
        Skip to content
      </a>
      <LandingNavbar />
      <main>
        <Hero />
        <ProductJourney />
        <MentorShowcase />
        <SessionPreview />
        <Benefits />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
