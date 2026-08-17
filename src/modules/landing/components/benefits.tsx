import { Reveal } from "./reveal";
import { Video, Flame, ShieldCheck } from "lucide-react";

const BENEFITS = [
  {
    icon: Video,
    title: "Live video sessions",
    description: "Browser-based calls with shared notes and instant feedback.",
  },
  {
    icon: Flame,
    title: "Daily streaks",
    description: "Build a habit that keeps you coming back.",
  },
  {
    icon: ShieldCheck,
    title: "Verified mentors",
    description: "Every mentor is vetted for quality and reliability.",
  },
];

export function Benefits() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
      <Reveal className="mb-14 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Why Lingua
        </p>
        <h2 className="mt-3 font-heading text-section sm:text-section-lg">
          Built for real learning
        </h2>
      </Reveal>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((benefit, i) => (
          <Reveal key={benefit.title} delay={i * 100}>
            <div className="group flex h-full flex-col rounded-[1.5rem] border border-border/80 bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lift">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <benefit.icon className="h-6 w-6" />
              </span>
              <h4 className="mt-6 font-heading text-xl tracking-tight">{benefit.title}</h4>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
