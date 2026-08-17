import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { Reveal } from "./reveal";

export function Languages() {
  const doubled = [...LANGUAGES, ...LANGUAGES];

  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-muted/40 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="flex flex-col items-end justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Languages
            </p>
          <h2 className="mt-3 font-heading text-section sm:text-section-lg">
            One mentor at a time, in 40+ languages.
          </h2>
          </div>
          <Link
            to="/auth"
            search={{ mode: "signup" } as never}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            Find your language
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>

      {/* Marquee */}
      <div className="relative mt-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-muted to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-muted to-transparent" />
        <div className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
          {doubled.map((lang, i) => (
            <Link
              key={`${lang.code}-${i}`}
              to="/auth"
              search={{ mode: "signup" } as never}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
            >
              <span className="text-xl transition-transform group-hover:scale-110">
                {lang.emoji}
              </span>
              <span className="text-sm font-semibold">{lang.name}</span>
              <span className="text-xs uppercase text-muted-foreground">{lang.code}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
