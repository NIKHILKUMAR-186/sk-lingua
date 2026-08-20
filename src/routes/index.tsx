import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/modules/landing/components/LandingNav";
import { LandingHero } from "@/modules/landing/components/LandingHero";
import { LandingHowItWorks } from "@/modules/landing/components/LandingHowItWorks";
import { LandingPricing } from "@/modules/landing/components/LandingPricing";
import { LandingRealMentors } from "@/modules/landing/components/LandingRealMentors";
import { LandingFeatures } from "@/modules/landing/components/LandingFeatures";
import { LandingStats } from "@/modules/landing/components/LandingStats";
import { LandingCTA } from "@/modules/landing/components/LandingCTA";
import { LandingFooter } from "@/modules/landing/components/LandingFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lingua — Learn a language from a real human" },
      {
        name: "description",
        content:
          "Book 1-on-1 video lessons with real human mentors. Build fluency through real conversations, not exercises.",
      },
      { property: "og:title", content: "Lingua — Learn a language from a real human" },
      {
        property: "og:description",
        content: "Book 1-on-1 video lessons with real mentors. Build fluency through real conversations.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="landing-page min-h-screen antialiased">
      <a
        href="#home"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-[#6647f0] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <LandingNav />
      <main>
        <LandingHero />
        <LandingHowItWorks />
        <LandingPricing />
        <LandingRealMentors />
        <LandingFeatures />
        <LandingStats />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
