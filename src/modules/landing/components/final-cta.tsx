import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-fine-grid opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[50rem] -translate-x-1/2 -translate-y-1/2 animate-aurora rounded-full bg-gradient-to-br from-primary/10 via-transparent to-electric/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Get started
          </p>
          <h2 className="mt-4 font-heading text-section sm:text-section-lg">
            Ready to start your journey?
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Join 120,000+ learners already building fluency with real human mentors.
            Your first step is one click away.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-8 text-base">
              <Link to="/auth" search={{ mode: "signup" } as never}>
                Start Learning
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
