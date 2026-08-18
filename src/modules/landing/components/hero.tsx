import { Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, ShieldCheck, Video, Loader2, CheckCircle2 } from "lucide-react";
import { Reveal } from "./reveal";
import { useMagneticButton } from "../hooks/use-magnetic-button";
import { BookingSummary } from "@/components/booking-summary";
import { BookingSuccessCard } from "@/components/session-confirm-card";

const HERO_STATES = [
  {
    id: "discover",
    label: "Finding mentors",
    ui: (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Searching 40+ languages...</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "available",
    label: "Mentor available",
    ui: (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-electric text-sm font-bold text-white">
              MG
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">María García</span>
              <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                NATIVE
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Spanish · 5 years experience</div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-warning/10 px-2 py-1 text-xs font-semibold text-warning-foreground">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" /> 4.98
          </div>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-xs">Conversation</span>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs">Business</span>
          <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs text-success">
            Available now
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "booking",
    label: "Booking session",
    ui: (
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <BookingSummary
          summary={{
            mentorName: "María García",
            sessionType: "Spanish Conversation",
            date: new Date().toISOString(),
            slotLabel: "18:30",
            durationMins: 30,
          }}
          message=""
          onMessageChange={() => {}}
          onConfirm={() => {}}
          isPending={false}
        />
      </div>
    ),
  },
  {
    id: "confirmed",
    label: "Session confirmed",
    ui: (
      <div className="rounded-xl border border-success/30 bg-success/8 p-5">
        <BookingSuccessCard
          mentorName="María García"
          dateLabel="Today"
          slotLabel="18:30"
          sessionsRemaining={8}
          onViewSessions={() => {}}
        />
      </div>
    ),
  },
  {
    id: "learning",
    label: "Learning in progress",
    ui: (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-electric text-xs font-bold text-white">
              M
            </div>
            <div>
              <div className="text-sm font-semibold">María García</div>
              <div className="text-xs text-muted-foreground">Spanish Lesson</div>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Live
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
              ¿Cómo se dice "I'm excited" en español?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-border bg-muted/60 px-4 py-2.5 text-sm">
              <span className="font-semibold text-primary">María:</span> "Estoy emocionado" — ¡Perfecto!
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 rounded-full border border-border py-2 text-xs font-medium">
            📝 Notes
          </button>
          <button className="flex-1 rounded-full border border-border py-2 text-xs font-medium">
            🎤 Mic
          </button>
          <button className="flex-1 rounded-full border border-border py-2 text-xs font-medium">
            📹 Video
          </button>
        </div>
      </div>
    ),
  },
];

export function Hero() {
  const [activeState, setActiveState] = useState(0);
  const magneticRef = useMagneticButton(0.15);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const interval = setInterval(() => {
      setActiveState((prev) => (prev + 1) % HERO_STATES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const state = HERO_STATES[activeState];

  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-fine-grid opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[40rem] w-[60rem] -translate-x-1/2 animate-aurora rounded-full bg-gradient-to-br from-primary/10 via-transparent to-electric/10 blur-3xl" />

      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-4 pb-20 pt-28 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:pt-24">
        <div className="relative">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              {state.label}
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 font-heading text-hero text-foreground sm:text-hero-md lg:text-hero-lg">
              Learn with
              <br />
              real
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
                <ShieldCheck className="h-4 w-4 text-success" />
                <span className="font-medium text-foreground">Verified mentors</span>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="relative lg:-mt-8">
          <Reveal delay={200}>
            <div className="relative">
              <div
                key={state.id}
                className="overflow-hidden rounded-[1.75rem] border border-white/30 glass shadow-lift transition-all duration-700 ease-out"
              >
                <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
                  <div className="relative">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-electric text-sm font-bold text-white">
                      M
                    </span>
                    {state.id !== "discover" && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">María García</span>
                      {state.id === "available" && (
                        <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          NATIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {state.id === "discover" ? (
                        "Searching..."
                      ) : (
                        <>
                          <Video className="h-3 w-3" /> Spanish · Conversation
                        </>
                      )}
                    </div>
                  </div>
                  {state.id === "available" && (
                    <div className="flex items-center gap-1 rounded-lg bg-warning/10 px-2 py-1 text-xs font-semibold text-warning-foreground">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" /> 4.98
                    </div>
                  )}
                </div>

                <div className="p-5 transition-all duration-500 ease-out">
                  {state.ui}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
