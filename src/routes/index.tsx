import { createFileRoute } from "@tanstack/react-router";
import { LandingNavbar } from "@/modules/landing/components/landing-navbar";
import { Hero } from "@/modules/landing/components/hero";
import { Stats } from "@/modules/landing/components/stats";
import { Features } from "@/modules/landing/components/features";
import { HowItWorks } from "@/modules/landing/components/how-it-works";
import { Languages } from "@/modules/landing/components/languages";
import { FeaturedMentors } from "@/modules/landing/components/featured-mentors";
import { Testimonials } from "@/modules/landing/components/testimonials";
import { Pricing } from "@/modules/landing/components/pricing";
import { Faq } from "@/modules/landing/components/faq";
import { MentorCta } from "@/modules/landing/components/mentor-cta";
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
        href="#method"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background"
      >
        Skip to content
      </a>
      <LandingNavbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Languages />
        <FeaturedMentors />
        <Testimonials />
        <Pricing />
        <Faq />
        <MentorCta />
      </main>
      <LandingFooter />
    </div>
  );
}
