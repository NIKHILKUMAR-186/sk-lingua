import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";
import {
  ArrowRight,
  Video,
  CalendarClock,
  Flame,
  MessageSquare,
  Sparkles,
  Trophy,
  Check,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────── Feature 1: Horizontal split ─────────────────────────── */
function SplitFeature() {
  return (
    <section id="method" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            The Method
          </p>
          <h2 className="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">
            Lessons that feel like a conversation, not a classroom.
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Every session is live, 1-on-1, and built around what you actually want to say. Your
            mentor adapts in real time — no scripts, no slides, just natural conversation that
            sticks.
          </p>
          <div className="mt-8 space-y-4">
            {[
              {
                icon: Video,
                title: "Live video, real presence",
                desc: "Face-to-face calls with mentors across 40+ languages.",
              },
              {
                icon: MessageSquare,
                title: "Feedback as you speak",
                desc: "Instant corrections on pronunciation and grammar.",
              },
              {
                icon: CalendarClock,
                title: "Your schedule, your pace",
                desc: "Book from 15-minute check-ins to deep 60-minute dives.",
              },
            ].map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                  <f.icon className="h-4.5 w-4.5 text-primary" />
                </span>
                <div>
                  <div className="font-semibold">{f.title}</div>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Visual panel */}
        <Reveal delay={120}>
          <div className="relative">
            <div className="absolute -top-8 -right-8 h-56 w-56 rounded-full bg-electric/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border/80 bg-card p-6 shadow-lift">
              <div className="flex items-center gap-2 pb-4">
                <span className="h-2.5 w-2.5 rounded-full bg-flame/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                <span className="ml-2 text-xs text-muted-foreground">Live conversation</span>
              </div>

              {/* Pseudo chat window */}
              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    Hola, how do I say “I'm a little nervous about the interview”?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-muted/60 px-4 py-2.5 text-sm">
                    <span className="font-semibold text-primary">María ·</span> ¡Perfecto! Say —
                    <span className="font-medium"> “Estoy un poco nervioso por la entrevista”</span>
                    . Try stressing the “ner-vio-so”.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    Estoy un poco{" "}
                    <span className="underline decoration-warning underline-offset-2">
                      nervioso
                    </span>{" "}
                    por la entrevista.
                  </div>
                </div>
              </div>

              {/* Correction chip */}
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-success/30 bg-success/8 p-3.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="h-4 w-4" />
                </span>
                <div className="text-sm">
                  <div className="font-semibold text-success-foreground">Great pronunciation!</div>
                  <p className="mt-0.5 text-muted-foreground">
                    Nail the double “r” next time and you'll sound native.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────── Feature 2: Interactive vertical strength meter ─────────────────────────── */
const LEVELS = [
  { label: "Foundations", pct: 100, desc: "Greetings, sounds & basics" },
  { label: "Survival", pct: 100, desc: "Travel, food, transport" },
  { label: "Conversation", pct: 100, desc: "Small talk & daily life" },
  { label: "Confidence", pct: 64, desc: "Opinions & storytelling" },
  { label: "Fluency", pct: 12, desc: "Debate & nuance" },
];

function StrengthFeature() {
  const [active, setActive] = useState(2);

  return (
    <section className="border-y border-border/60 bg-muted/40">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-28">
        {/* Interactive strength meter */}
        <Reveal className="order-2 lg:order-1">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-electric">
              Progress
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              Your language, measured in growing confidence.
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Skip the abstract levels. See exactly where you are and what to unlock next — each
              interaction updates your fluency profile in real time.
            </p>

            <div className="mt-8 space-y-3">
              {LEVELS.map((level, i) => (
                <button
                  key={level.label}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className="group w-full rounded-2xl border bg-card p-4 text-left transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{
                    borderColor: active === i ? "var(--primary)" : undefined,
                    boxShadow: active === i ? "var(--shadow-soft)" : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {level.pct >= 100 ? (
                        <Trophy
                          className={cn(
                            "h-5 w-5",
                            active === i ? "text-warning" : "text-warning/70",
                          )}
                        />
                      ) : (
                        <span
                          className={cn(
                            "text-sm font-bold",
                            active === i ? "text-electric" : "text-muted-foreground",
                          )}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      )}
                      <div>
                        <div className="font-semibold">{level.label}</div>
                        {active === i && (
                          <div className="text-xs text-muted-foreground">{level.desc}</div>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                      {level.pct}%
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-electric transition-[width] duration-700"
                      style={{ width: `${active === i ? level.pct : Math.min(level.pct, 20)}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Text side */}
        <Reveal delay={120} className="order-1 lg:order-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-electric">
            The Streak Engine
          </p>
          <h2 className="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">
            Consistency, turned into a habit you'll protect.
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Research is clear: frequency beats intensity. Lingua turns daily practice into a streak
            you'll hate to break — with gentle nudges, streaks, and milestones that keep you showing
            up.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              { icon: Flame, text: "Daily streaks that reward real sessions, not just logins." },
              { icon: Sparkles, text: "Adaptive goals that scale with your growing schedule." },
              { icon: Trophy, text: "Badges and milestones for every language milestone." },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-muted-foreground">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-flame" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="mt-8 group">
            <Link to="/auth" search={{ mode: "signup" } as never}>
              See how it works
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────── 3-column bento: editorial + visual  ─────────────────────────── */
function MethodBento() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="mb-14 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Why Lingua</p>
        <h2 className="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">
          Everything you need. Nothing you don't.
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Large editorial card */}
        <Reveal className="md:col-span-2 lg:row-span-2">
          <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] border border-border/80 bg-card p-8 shadow-sm transition-shadow hover:shadow-lift">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/8 blur-3xl" />
            <div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Video className="h-5 w-5" />
              </span>
              <h3 className="mt-6 text-2xl tracking-tight">Live video, engineered for learning.</h3>
              <p className="mt-3 max-w-md text-muted-foreground">
                Browser-based calls with low latency, shared notes, and a pronunciation grader — all
                in one focused workspace. No installs, no juggling apps.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { label: "HD video", icon: Video },
                { label: "Shared notes", icon: MessageSquare },
                { label: "Pronunciation AI", icon: Mic2 },
              ].map((b) => (
                <div
                  key={b.label}
                  className="rounded-xl border border-border bg-muted/40 p-3 text-center"
                >
                  <b.icon className="mx-auto h-4 w-4 text-primary" />
                  <div className="mt-2 text-xs font-medium">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Compact card */}
        <Reveal delay={80}>
          <div className="flex h-full flex-col rounded-[1.75rem] border border-border/80 bg-brand-gradient p-7 text-white shadow-lift">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Flame className="h-5 w-5" />
            </span>
            <h4 className="mt-5 text-xl tracking-tight">Streaks that matter</h4>
            <p className="mt-2 text-sm text-white/85">
              Real-session streaks, adaptive goals, and milestones that keep you motivated.
            </p>
            <div className="mt-auto pt-6 text-3xl font-display text-white/90">
              42<span className="text-lg text-white/70"> day streak</span>
            </div>
          </div>
        </Reveal>

        {/* Compact card */}
        <Reveal delay={140}>
          <div className="flex h-full flex-col rounded-[1.75rem] border border-border/80 bg-card p-7 shadow-sm transition-shadow hover:shadow-lift">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-electric/10 text-electric">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h4 className="mt-5 text-xl tracking-tight">Mentor trust</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Identity & credential vetting, transparent reviews, and money-back assurance.
            </p>
            <div className="mt-auto flex items-center gap-1 pt-6 text-sm font-semibold">
              <Star className="h-4 w-4 fill-warning text-warning" /> 4.9 · 12k reviews
            </div>
          </div>
        </Reveal>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Reveal delay={80}>
          <div className="flex items-center gap-5 rounded-[1.5rem] border border-border/80 bg-card p-6 shadow-sm">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <div className="font-semibold">Book in under 30 seconds</div>
              <p className="text-sm text-muted-foreground">
                Real-time availability, instant confirmation.
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={140}>
          <div className="flex items-center gap-5 rounded-[1.5rem] border border-border/80 bg-card p-6 shadow-sm">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ArrowRight className="h-5 w-5" />
            </span>
            <div>
              <div className="font-semibold">Start today, no setup</div>
              <p className="text-sm text-muted-foreground">
                Create an account and join a session in minutes.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Features() {
  return (
    <>
      <SplitFeature />
      <StrengthFeature />
      <MethodBento />
    </>
  );
}

// Inline icon alias to avoid importing directly above
function Mic2(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
function ShieldCheck(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
