import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "./reveal";
import { Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How is Lingua different from AI language tutors?",
    a: "Lingua connects you with real, verified human mentors. Language is inherently social — you learn tone, culture, and natural flow through live conversation nobody can replicate. AI supplements the practice, but the core experience is human.",
  },
  {
    q: "Do I need to subscribe to use Lingua?",
    a: "No. You simply pay per session at the mentor's rate. There are no monthly fees, no commitments, and you can cancel or reschedule anytime. This keeps learning accessible and stress-free.",
  },
  {
    q: "How are mentors verified?",
    a: "Every mentor completes an identity check and a live teaching assessment before being approved. We review their credentials, language proficiency, and teaching style. Students can also leave transparent reviews after every session.",
  },
  {
    q: "What do I need to join a session?",
    a: "Just a device with a browser and a microphone. Sessions run on a low-latency video call with shared notes and a pronunciation grader built in — no installs or juggling apps.",
  },
  {
    q: "Can I be both a student and a mentor?",
    a: "Absolutely. Many of our mentors also learn on Lingua. A single account lets you switch between learning and teaching, with separate dashboards for each.",
  },
  {
    q: "What if I'm not satisfied with a session?",
    a: "We stand behind every booking. If a session doesn't meet expectations, reach out and we'll make it right — including a refund or a free rebooking with a different mentor.",
  },
];

function FaqItem({ item, index }: { item: (typeof FAQS)[number]; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="border-b border-border/70">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-6 py-5 text-left"
        >
          <span
            className={cn(
              "text-lg font-heading tracking-tight transition-colors",
              open ? "text-primary" : "text-foreground",
            )}
          >
            {item.q}
          </span>
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border transition-all duration-300",
              open
                ? "rotate-45 border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground",
            )}
          >
            <Plus className="h-4 w-4" />
          </span>
        </button>
      </h3>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl pb-6 leading-relaxed text-muted-foreground">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">FAQ</p>
          <h2 className="mt-3 font-heading text-section sm:text-section-lg">
            Questions, answered.
          </h2>
          <p className="mt-4 max-w-sm text-lg text-muted-foreground">
            Everything you need to know before your first session. Can&rsquo;t find it?
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" } as never}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            Contact us
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>

        <Reveal delay={100}>
          <div className="border-t border-border/70">
            {FAQS.map((item, i) => (
              <FaqItem key={item.q} item={item} index={i} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
