import { Reveal } from "./reveal";

export function SessionPreview() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
      <Reveal className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Live session
        </p>
        <h2 className="mt-3 font-heading text-section sm:text-section-lg">
          Real conversation, real progress.
        </h2>
      </Reveal>

      <Reveal className="mt-14">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/30 glass shadow-lift">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-electric text-xs font-bold text-white">
                MG
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

          <div className="space-y-4 p-6">
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                ¿Cómo se dice "I'm excited" en español?
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-border bg-muted/60 px-4 py-2.5 text-sm">
                <span className="font-semibold text-primary">María:</span> "Estoy emocionado" — ¡Perfecto!
                <div className="mt-2 rounded-lg border border-success/30 bg-success/8 p-2 text-xs text-success-foreground">
                  Great pronunciation! Nail the double "r" next time.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/70 px-5 py-3">
            <div className="flex gap-2">
              <button className="rounded-full border border-border px-3 py-1.5 text-xs font-medium">
                📝 Notes
              </button>
              <button className="rounded-full border border-border px-3 py-1.5 text-xs font-medium">
                🎤 Mic
              </button>
              <button className="rounded-full border border-border px-3 py-1.5 text-xs font-medium">
                📹 Video
              </button>
            </div>
            <div className="text-xs text-muted-foreground">18:32 remaining</div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
