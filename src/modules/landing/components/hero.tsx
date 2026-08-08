import { Link } from "@tanstack/react-router";
import { useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Flame, Video, Mic, ShieldCheck } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";

/** A purpose-built, hand-crafted product preview — not a stock image. */
function ProductPreview() {
  const [active, setActive] = useState("Weekly");
  const times = ["9:00", "10:30", "13:00", "16:00", "18:30"];
  const days = ["MON", "TUE", "WED", "THU", "FRI"];

  return (
    <div className="relative">
      {/* Ambient glow */}
      <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-electric/15 blur-3xl" />
      <div className="absolute -bottom-16 -left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/5 via-transparent to-electric/5" />

      {/* Floating stat — top left */}
      <div className="absolute -left-6 -top-6 z-20 hidden animate-float rounded-2xl border border-border/70 bg-card/95 p-3.5 shadow-lift backdrop-blur sm:block">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <div>
            <div className="text-sm font-semibold leading-none">Verified mentor</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Identity & credentials checked
            </div>
          </div>
        </div>
      </div>

      {/* Floating stat — bottom right */}
      <div className="absolute -bottom-6 -right-4 z-20 hidden animate-float-slow rounded-2xl border border-border/70 bg-card/95 p-3.5 shadow-lift backdrop-blur sm:block">
        <div className="flex items-center gap-2.5">
          <div className="flex -space-x-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-primary/70 to-electric/70 text-[9px] font-bold text-white"
              >
                {["S", "J", "M"][i]}
              </span>
            ))}
          </div>
          <div>
            <div className="text-sm font-semibold leading-none">1,240 sessions</div>
            <div className="mt-1 text-[11px] text-muted-foreground">taught this month</div>
          </div>
        </div>
      </div>

      {/* Main preview card */}
      <div className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-lift">
        {/* Card header */}
        <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
          <div className="relative">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-electric text-sm font-bold text-white">
              M
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">María González</span>
              <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                NATIVE
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mic className="h-3 w-3" /> Spanish · Madrid
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-warning/10 px-2 py-1 text-xs font-semibold text-warning-foreground">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" /> 4.98
          </div>
        </div>

        {/* Booking body */}
        <div className="px-5 py-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Next available
              </div>
              <div className="mt-0.5 text-sm font-semibold">Today, 30 min</div>
            </div>
            <div className="text-sm font-semibold">
              $24<span className="text-xs font-normal text-muted-foreground">/session</span>
            </div>
          </div>

          {/* Day tabs */}
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

          {/* Time slots */}
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
              <Video className="h-4 w-4" /> Book live session
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const frame = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x, y });
  }

  return (
    <section
      className="relative overflow-hidden"
      onMouseMove={handleMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
    >
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-fine-grid mask-fade-b" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[40rem] w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/10 via-transparent to-electric/10 blur-3xl" />

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-24">
        {/* Left — headline */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Real humans, not AI chatbots
          </div>

          <h1 className="mt-6 text-5xl leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-[4.4rem]">
            Speak with confidence.
            <br />
            <span className="text-primary">Learn from a real human.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Book 1-on-1 video sessions with verified native mentors. Practice real conversation,
            build a daily streak, and become fluent — on your schedule.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="group h-12 px-7 text-base">
              <Link to="/auth" search={{ mode: "signup" } as never}>
                Start learning free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
              <Link to="/mentor-signup">Teach languages</Link>
            </Button>
          </div>

          {/* Language chips */}
          <div className="mt-10 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Popular
            </span>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.slice(0, 6).map((lang) => (
                <span
                  key={lang.code}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <span className="text-sm leading-none">{lang.emoji}</span>
                  {lang.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right — product preview with mouse tilt */}
        <div
          ref={frame}
          className="relative"
          style={{
            transform: `perspective(1100px) rotateY(${tilt.x * 6}deg) rotateX(${tilt.y * -6}deg)`,
            transition: "transform 0.25s ease-out",
          }}
        >
          <ProductPreview />
        </div>
      </div>

      {/* Social proof strip */}
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col items-center justify-center gap-5 border-t border-border/60 pt-8 sm:flex-row sm:gap-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {["A", "B", "C", "D"].map((x, i) => (
                <span
                  key={x}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary/60 to-electric/60 text-[9px] font-bold text-white"
                  style={{ zIndex: 4 - i }}
                >
                  {x}
                </span>
              ))}
            </div>
            <span className="font-medium text-foreground">120k+ learners</span>
          </div>
          <div className="hidden h-4 w-px bg-border sm:block" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-warning text-warning" />
            <span className="font-medium text-foreground">4.9 / 5</span> average mentor rating
          </div>
          <div className="hidden h-4 w-px bg-border sm:block" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-flame" />
            <span className="font-medium text-foreground">10,000+</span> active streaks
          </div>
        </div>
      </div>
    </section>
  );
}
