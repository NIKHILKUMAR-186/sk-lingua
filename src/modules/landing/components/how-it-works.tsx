import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";
import { Search, CalendarCheck, Video, Flame, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "Find your mentor",
    desc: "Search verified native mentors by language, specialty, price, and availability. Read transparent reviews from real students.",
  },
  {
    icon: CalendarCheck,
    title: "Book in seconds",
    desc: "Pick a time that fits your schedule. Get instant confirmation, reminders, and a dedicated session workspace.",
  },
  {
    icon: Video,
    title: "Join the live session",
    desc: "Hop on a browser-based video call with shared notes and a pronunciation grader built right in.",
  },
  {
    icon: Flame,
    title: "Keep your streak alive",
    desc: "Practice daily, earn points and badges, and watch your confidence grow with every session.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative overflow-hidden border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* Sticky intro */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                How it works
              </p>
              <h2 className="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">
                From first search to fluent, in four steps.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
                A deliberately simple path from discovery to a habit you'll protect. No clutter, no
                friction — just momentum.
              </p>
              <Button asChild className="mt-8 group">
                <Link to="/auth" search={{ mode: "signup" } as never}>
                  Start your first lesson
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </Reveal>
          </div>

          {/* Timeline */}
          <ol className="relative space-y-2">
            <span
              className="absolute bottom-8 left-[27px] top-4 w-px bg-gradient-to-b from-primary/40 via-border to-transparent"
              aria-hidden="true"
            />
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 90}>
                <div className="group relative flex gap-6 rounded-2xl p-3 transition-colors hover:bg-muted/40 sm:gap-8 sm:p-4">
                  <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-all group-hover:border-primary/40 group-hover:shadow-soft">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="pt-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs tracking-widest text-muted-foreground">
                        STEP {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-xl tracking-tight">{step.title}</h3>
                    <p className="mt-2 max-w-lg text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
