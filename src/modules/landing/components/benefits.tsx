import { Reveal } from "./reveal";
import { Video, Flame, ShieldCheck } from "lucide-react";

const BENEFITS = [
  {
    icon: Video,
    title: "Real Humans",
    description: "Learn with verified mentors through live video sessions — no AI chatbots, no pre-recorded lessons.",
    visual: (
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-electric/20 text-sm font-bold text-primary">
          MG
        </div>
        <div>
          <div className="text-sm font-semibold">María García</div>
          <div className="text-xs text-muted-foreground">Spanish · Native</div>
        </div>
        <span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">Live</span>
      </div>
    ),
  },
  {
    icon: Flame,
    title: "Live Practice",
    description: "Practice through real conversations, not exercises. Build muscle memory for actual speaking.",
    visual: (
      <div className="flex items-center justify-center gap-4 rounded-xl border border-border/60 bg-card p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-electric text-lg font-bold text-white">
          MG
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
          You
        </div>
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    title: "Trusted Platform",
    description: "Every mentor passes identity verification and teaching assessment. Your progress is protected.",
    visual: (
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <div className="text-sm font-semibold">Verified mentor</div>
          <div className="text-xs text-muted-foreground">Identity & credentials checked</div>
        </div>
      </div>
    ),
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
          Learning with people
        </h2>
      </Reveal>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((benefit, i) => (
          <Reveal key={benefit.title} delay={i * 100}>
            <div className="group flex h-full flex-col rounded-[1.5rem] border border-white/25 glass shadow-sm transition-all hover:-translate-y-1 hover:shadow-lift">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <benefit.icon className="h-6 w-6" />
              </span>
              <h4 className="mt-6 font-heading text-xl tracking-tight">{benefit.title}</h4>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{benefit.description}</p>
              <div className="mt-6 transition-all duration-300 opacity-80 group-hover:opacity-100">
                {benefit.visual}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
