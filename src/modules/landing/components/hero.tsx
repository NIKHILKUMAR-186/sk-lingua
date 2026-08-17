import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Flame } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { Reveal } from "./reveal";
import { RotatingText } from "../hooks/use-rotating-text";
import { useMagneticButton } from "../hooks/use-magnetic-button";

const HERO_WORDS = ["better.", "smarter.", "faster."];

function ProductPreview() {
  const [active, setActive] = useState("Weekly");
  const times = ["9:00", "10:30", "13:00", "16:00", "18:30"];
  const days = ["MON", "TUE", "WED", "THU", "FRI"];

  return (
    <div className="relative">
      <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-electric/15 blur-3xl" />
      <div className="absolute -bottom-16 -left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/5 via-transparent to-electric/5" />

      <div className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-lift">
        <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
          <div className="relative">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-electric text-sm font-bold text-white">
              M
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">Nikhil Kumar</span>
              <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                NATIVE
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              English professor, 5 years experience
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-warning/10 px-2 py-1 text-xs font-semibold text-warning-foreground">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" /> 4.98
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Next available
              </div>
              <div className="mt-0.5 text-sm font-semibold">Today, 30 min</div>
            </div>
            <div className="text-sm font-semibold">
              ₹49<span className="text-xs font-normal text-muted-foreground">/month</span>
            </div>
          </div>

          <div className="mt-4 flex gap-1.5">
            {days.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => setActive(d)}
                className={`flex flex-1 flex-col items-center rounded-xl border px-1 py-2 text-[11px] font-medium transition-colors ${
                  active === d
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                <span className="opacity-70">{d}</span>
                <span className="mt-0.5 text-[10px] opacity-80">{["12", "13"][i % 2]}:00</span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {times.map((t, i) => (
              <span
                key={t}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  i === 2
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {t}
              </span>
            ))}
            <span className="rounded-lg border border-dashed px-2.5 py-1 text-xs text-muted-foreground">
              +7
            </span>
          </div>

          <Button asChild size="sm" className="mt-4 w-full">
            <Link to="/auth" search={{ mode: "signup" } as never}>
              Book live session
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const magneticRef = useMagneticButton(0.12);

  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-fine-grid opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[40rem] w-[60rem] -translate-x-1/2 animate-aurora rounded-full bg-gradient-to-br from-primary/10 via-transparent to-electric/10 blur-3xl" />

      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-14 px-4 pb-20 pt-28 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:pt-24">
        <div className="relative">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              Real humans, not AI chatbots
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 font-heading text-hero text-foreground sm:text-hero-md lg:text-hero-lg">
              Learn from
              <br />
              the right
              <br />
              <span className="text-primary">people.</span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div ref={magneticRef}>
                <Button
                  asChild
                  size="lg"
                  className="group h-12 rounded-full px-7 text-base transition-transform"
                >
                  <Link to="/auth" search={{ mode: "signup" } as never}>
                    Start Learning
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:rotate-45" />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-10 flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="font-medium text-foreground">4.9 / 5</span>
              </div>
              <div className="hidden h-4 w-px bg-border sm:block" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Flame className="h-4 w-4 text-flame" />
                <span className="font-medium text-foreground">10k+</span> active streaks
              </div>
            </div>
          </Reveal>
        </div>

        <div className="relative lg:-mt-8">
          <Reveal delay={200}>
            <ProductPreview />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
