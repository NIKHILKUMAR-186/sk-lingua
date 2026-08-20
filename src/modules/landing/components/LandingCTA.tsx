import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";

export function LandingCTA() {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "#f8f9fa" }}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="landing-text-mono mb-4">GET STARTED</p>
          <h2
            className="landing-text-heading lg:landing-text-heading-lg mx-auto"
          >
            Your next conversation starts here.
          </h2>
          <p
            className="landing-text-body mt-4 mx-auto max-w-lg"
          >
            Join thousands of learners who improved their fluency with real mentors.
          </p>
          <div className="mt-10">
            <Link
              to="/auth"
              search={{ mode: "signup" } as never}
              className="landing-btn-filled no-underline"
            >
              Start Learning
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
