import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";
import { Check, Sparkles, GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "student",
    icon: GraduationCap,
    label: "For learners",
    name: "Student",
    tagline: "Learn from real human mentors, one session at a time.",
    price: "Pay per session",
    priceNote: "Book only what you need. No subscriptions, no lock-in.",
    features: [
      "1-on-1 live video sessions",
      "Verified native mentors",
      "Pronunciation & grammar feedback",
      "Daily streaks & adaptive goals",
      "Session workspace & shared notes",
      "Cancel or reschedule anytime",
    ],
    cta: "Start learning free",
    search: { mode: "signup" } as never,
    featured: false,
  },
  {
    id: "mentor",
    icon: Users,
    label: "For mentors",
    name: "Mentor",
    tagline: "Turn your language into a career you control.",
    price: "Keep 90%",
    priceNote: "Set your own rate. Get paid for every session.",
    features: [
      "Set your own hourly rate",
      "Keep 90% of every booking",
      "Smart calendar & availability",
      "Built-in video & lesson tools",
      "Student analytics & reviews",
      "Instant payouts",
    ],
    cta: "Become a mentor",
    search: { mode: "signup", role: "mentor" } as never,
    featured: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden border-t border-border/60 bg-background">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Pricing</p>
          <h2 className="mt-3 text-4xl leading-tight tracking-tight sm:text-5xl">
            Simple, transparent, and fair for everyone.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No hidden fees. No surprise charges. Just a marketplace that respects both sides.
          </p>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 lg:grid-cols-2">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 100}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-[1.75rem] border p-8 transition-all hover:-translate-y-1",
                  plan.featured
                    ? "border-primary/40 bg-card shadow-lift"
                    : "border-border/80 bg-card shadow-sm hover:shadow-lift",
                )}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white shadow-glow">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <plan.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{plan.label}</div>
                    <div className="text-xl font-semibold">{plan.name}</div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-3xl font-display tracking-tight">{plan.price}</div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{plan.priceNote}</p>
                </div>

                <ul className="mt-7 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", plan.featured ? "text-primary" : "text-success")} />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

<Button asChild size="lg" className="mt-8 w-full" variant={plan.featured ? "default" : "outline"}>
                  <Link to="/auth" search={plan.search}>{plan.cta}</Link>
                </Button>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Questions about pricing?{" "}
            <span className="font-semibold text-foreground">Email us at hello@lingua.app</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
