import { useEffect, useRef, useState } from "react";
import { Reveal } from "./reveal";

const SCENES = [
  {
    id: "discover",
    title: "Discover",
    subtitle: "Find your perfect mentor",
    ui: (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">Search mentors</div>
          <div className="text-xs text-muted-foreground">12 results</div>
        </div>
        <div className="space-y-2">
          {[
            { name: "María G.", lang: "Spanish", rating: "4.9", active: true },
            { name: "Kenji T.", lang: "Japanese", rating: "4.8", active: false },
            { name: "Lucia M.", lang: "Italian", rating: "4.9", active: false },
          ].map((mentor) => (
            <div
              key={mentor.name}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                mentor.active
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/60 bg-card"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-electric/20 text-xs font-bold text-primary">
                {mentor.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{mentor.name}</div>
                <div className="text-xs text-muted-foreground">{mentor.lang}</div>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-warning">
                ★ {mentor.rating}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "connect",
    title: "Connect",
    subtitle: "Book a session instantly",
    ui: (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-electric text-sm font-bold text-white">
            M
          </div>
          <div>
            <div className="text-sm font-semibold">María García</div>
            <div className="text-xs text-muted-foreground">Spanish · Native</div>
          </div>
          <div className="ml-auto rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            Available
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {["Mon", "Tue", "Wed", "Thu"].map((day, i) => (
            <div
              key={day}
              className={`rounded-lg border p-2 text-center text-xs ${
                i === 1 ? "border-primary bg-primary/5" : "border-border/60"
              }`}
            >
              <div className="font-medium">{day}</div>
              <div className="mt-1 text-muted-foreground">{14 + i}:00</div>
            </div>
          ))}
        </div>
        <button className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
          Book Session
        </button>
      </div>
    ),
  },
  {
    id: "learn",
    title: "Learn",
    subtitle: "Live 1-on-1 video session",
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
  {
    id: "progress",
    title: "Progress",
    subtitle: "Track your fluency growth",
    ui: (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-foreground">64%</div>
            <div className="text-xs text-muted-foreground">Confidence Level</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">12</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { label: "Speaking", pct: 72 },
            { label: "Listening", pct: 68 },
            { label: "Grammar", pct: 61 },
          ].map((skill) => (
            <div key={skill.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{skill.label}</span>
                <span className="text-muted-foreground">{skill.pct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-electric transition-all duration-700"
                  style={{ width: `${skill.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function ProductCinema() {
  const [activeScene, setActiveScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setIsPlaying(false);
      return;
    }

    intervalRef.current = setInterval(() => {
      setActiveScene((prev) => (prev + 1) % SCENES.length);
    }, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const scene = SCENES[activeScene];

  return (
    <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
      <Reveal className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Product in Action
        </p>
        <h2 className="mt-3 font-heading text-section sm:text-section-lg">
          See how it works
        </h2>
      </Reveal>

      <div className="mt-12">
        <div className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card shadow-lift">
          {/* Scene header */}
          <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
            <div>
              <div className="text-lg font-semibold">{scene.title}</div>
              <div className="text-sm text-muted-foreground">{scene.subtitle}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
            </div>
          </div>

          {/* Scene content */}
          <div className="relative p-6 sm:p-8">
            <div
              key={scene.id}
              className="transition-all duration-500 ease-out"
              style={{
                opacity: isPlaying ? 1 : 0.7,
                transform: isPlaying ? "translateY(0)" : "translateY(4px)",
              }}
            >
              {scene.ui}
            </div>
          </div>

          {/* Scene indicators */}
          <div className="flex items-center justify-center gap-2 border-t border-border/70 px-6 py-4">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveScene(i)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  activeScene === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="font-mono text-[10px]">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
