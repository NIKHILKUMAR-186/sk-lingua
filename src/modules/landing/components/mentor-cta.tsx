import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const PERKS = ["Set your own hours", "Keep 90% of earnings", "Global student base"];

export function MentorCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:pb-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-foreground text-background">
          {/* Ambient glows */}
          <div className="pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-electric/30 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-fine-grid opacity-[0.04]" />

          <div className="relative grid gap-10 p-8 sm:p-14 lg:grid-cols-[1.3fr_0.7fr] lg:items-center lg:p-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80">
                For mentors
              </span>
              <h2 className="mt-6 text-4xl leading-[1.05] tracking-tight sm:text-5xl">
                Teach the language you love. On your schedule.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
                Set your own price, build a following, and get paid to share your language with
                students all over the world.
              </p>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
                {PERKS.map((perk) => (
                  <div key={perk} className="flex items-center gap-2 text-sm text-white/85">
                    <CheckCircle2 className="h-4 w-4 text-electric" /> {perk}
                  </div>
                ))}
              </div>
              <Button
                asChild
                size="lg"
                className="mt-9 h-12 bg-background px-7 text-base text-foreground hover:bg-white"
              >
                <Link to="/auth" search={{ mode: "signup", role: "mentor" } as never} className="group">
                  Become a mentor
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>

            {/* Earnings card */}
            <div className="relative">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">This month</span>
                  <span className="rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-semibold text-success">+18%</span>
                </div>
                <div className="mt-3 text-4xl font-display tracking-tight">$1,240</div>
                <div className="mt-1 text-xs text-white/50">from 22 sessions</div>
                <div className="mt-5 flex h-16 items-end gap-1.5">
                  {[35, 50, 42, 68, 55, 82, 74, 95, 88, 100].map((h, i) => (
                    <span
                      key={i}
                      className="flex-1 rounded-md bg-gradient-to-t from-primary to-electric"
                      style={{ height: `${h}%`, opacity: 0.45 + (i / 10) * 0.55 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
