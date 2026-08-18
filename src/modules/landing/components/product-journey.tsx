import { useState } from "react";
import { Reveal } from "./reveal";
import { Search, UserCheck, CalendarCheck, Video, ArrowRight , Star } from "lucide-react";

const STEPS = [
  {
    id: "discover",
    number: "01",
    title: "Discover",
    subtitle: "Find your mentor",
    icon: Search,
    description: "Browse verified native mentors by language, specialty, and availability.",
    visual: (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-electric/20 text-sm font-bold text-primary">
            MG
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">María García</div>
            <div className="text-xs text-muted-foreground">Spanish · 5 years exp.</div>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-warning">
            ★ 4.9
          </div>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-xs">Spanish</span>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs">Beginner</span>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs">Available</span>
        </div>
      </div>
    ),
  },
  {
    id: "choose",
    number: "02",
    title: "Choose",
    subtitle: "Review profile",
    icon: UserCheck,
    description: "Read reviews, check credentials, and find the right fit.",
    visual: (
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-electric text-lg font-bold text-white">
            MG
          </div>
          <div>
            <div className="text-base font-semibold">María García</div>
            <div className="text-xs text-muted-foreground">Spanish · Conversation specialist</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-warning">
              <Star className="h-3 w-3 fill-warning" /> 4.98 · 1,240 sessions
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs text-success">
            Verified
          </span>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs">5 years exp.</span>
        </div>
      </div>
    ),
  },
  {
    id: "book",
    number: "03",
    title: "Book",
    subtitle: "Pick a time",
    icon: CalendarCheck,
    description: "Select a time that fits your schedule. Get instant confirmation.",
    visual: (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4">
          <div>
            <div className="text-sm font-semibold">Today, 3:00 PM</div>
            <div className="text-xs text-muted-foreground">30 min session</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">$25</div>
            <div className="text-xs text-muted-foreground">per session</div>
          </div>
        </div>
        <button className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">
          Confirm Booking
        </button>
      </div>
    ),
  },
  {
    id: "learn",
    number: "04",
    title: "Learn",
    subtitle: "Start session",
    icon: Video,
    description: "Join a browser-based video call with shared notes and instant feedback.",
    visual: (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-electric text-lg font-bold text-white">
            MG
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
            You
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-success" />
          <span className="text-xs font-medium text-success">Live session in progress</span>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-center text-xs text-muted-foreground">
          Shared notes: "Estoy emocionado" = I'm excited
        </div>
      </div>
    ),
  },
];

export function ProductJourney() {
  const [activeStep, setActiveStep] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  return (
    <section id="how" className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 font-heading text-section sm:text-section-lg">
            Your journey to fluency
          </h2>
        </Reveal>

        <div className="mt-14">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {STEPS.map((step, i) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(i)}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className={`group flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                  activeStep === i
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="font-mono text-xs">{step.number}</span>
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            ))}
          </div>

          <div className="mt-10">
            <Reveal key={STEPS[activeStep].id} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {(() => {
                    const Icon = STEPS[activeStep].icon;
                    return <Icon className="h-6 w-6" />;
                  })()}
                </div>
                <h3 className="mt-5 font-heading text-2xl tracking-tight">
                  {STEPS[activeStep].subtitle}
                </h3>
                <p className="mt-3 text-muted-foreground">
                  {STEPS[activeStep].description}
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
                  <span>Explore {STEPS[activeStep].title.toLowerCase()}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              <div
                className="transition-all duration-500 ease-out"
                style={{
                  opacity: isHovering ? 0.95 : 1,
                  transform: isHovering ? "translateY(-4px)" : "translateY(0)",
                }}
              >
                <div className="overflow-hidden rounded-[1.75rem] border border-white/30 glass shadow-lift p-6">
                  {STEPS[activeStep].visual}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
