import { Star, Quote } from "lucide-react";
import { Reveal } from "./reveal";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  gradient: string;
  featured?: boolean;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I went from stumbling through greetings to holding a full 20-minute conversation with my colleague in Spanish. The streak feature is what got me to show up every single day.",
    name: "Amara O.",
    role: "Product Manager · Learning Spanish",
    initials: "AO",
    gradient: "from-primary to-electric",
    featured: true,
  },
  {
    quote: "My mentor understood exactly what I needed. Three months in, I passed my JLPT N4 mock with confidence.",
    name: "Kenji T.",
    role: "Software Engineer · Learning Japanese",
    initials: "KT",
    gradient: "from-electric to-primary",
  },
  {
    quote: "As a mentor, the booking and payment flow is seamless. I've earned more here in a month than in a year of tutoring apps.",
    name: "Lucía M.",
    role: "Native Spanish Mentor",
    initials: "LM",
    gradient: "from-primary to-electric",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-warning text-warning" />
      ))}
    </div>
  );
}

export function Testimonials() {
  const [featured, ...rest] = TESTIMONIALS;

  return (
    <section className="border-t border-border/60 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Real outcomes</p>
          <h2 className="mt-3 text-4xl leading-tight tracking-tight sm:text-5xl">
            Loved by learners and mentors alike.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {/* Featured testimonial */}
          <Reveal className="lg:col-span-1 lg:row-span-2">
            <figure className="relative flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] bg-brand-gradient p-8 text-white shadow-lift">
              <Quote className="absolute -bottom-6 -right-6 h-32 w-32 text-white/10" />
              <div>
                <Stars />
                <blockquote className="mt-6 text-xl leading-relaxed">“{featured.quote}”</blockquote>
              </div>
              <figcaption className="mt-8 flex items-center gap-3.5">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${featured.gradient} text-sm font-bold text-white ring-2 ring-white/30`}>
                  {featured.initials}
                </span>
                <div>
                  <div className="font-semibold">{featured.name}</div>
                  <div className="text-sm text-white/75">{featured.role}</div>
                </div>
              </figcaption>
            </figure>
          </Reveal>

          {/* Stacked testimonials */}
          <Reveal delay={100} className="lg:col-span-2">
            <div className="grid h-full gap-5 sm:grid-cols-2">
              {rest.map((t) => (
                <figure key={t.name} className="flex flex-col justify-between rounded-[1.5rem] border border-border/80 bg-card p-7 shadow-sm transition-shadow hover:shadow-lift">
                  <div>
                    <Stars />
                    <blockquote className="mt-4 text-[15px] leading-relaxed text-foreground">“{t.quote}”</blockquote>
                  </div>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.gradient} text-xs font-bold text-white`}>
                      {t.initials}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>

            {/* Community strip */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-border/80 bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {["E", "R", "S", "N"].map((x, i) => (
                    <span
                      key={x}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-primary/60 to-electric/60 text-[10px] font-bold text-white"
                      style={{ zIndex: 4 - i }}
                    >
                      {x}
                    </span>
                  ))}
                </div>
                <div>
                  <div className="text-sm font-semibold">Join 120k+ learners</div>
                  <div className="text-xs text-muted-foreground">Across 40+ languages</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success-foreground">
                <Star className="h-4 w-4 fill-warning text-warning" />
                4.9 average rating
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
