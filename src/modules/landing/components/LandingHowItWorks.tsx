import { Search, UserCheck, CalendarCheck, Video } from "lucide-react";
import { Reveal } from "./reveal";

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
        <div className="flex items-center gap-3 rounded-xl border border-bone bg-white p-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, #6647f0 0%, #0091ff 100%)",
              color: "#ffffff",
              fontFamily: "var(--landing-font-plus-jakarta-sans)",
            }}
          >
            MG
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold" style={{ color: "#090c1d", fontFamily: "var(--landing-font-plus-jakarta-sans)" }}>
              Sarah Johnson
            </div>
            <div className="text-xs" style={{ color: "#646464", fontFamily: "var(--landing-font-inter)" }}>
              English · 5 years experience
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "#6647f0", fontFamily: "var(--landing-font-plus-jakarta-sans)" }}>
            ★ 4.9
          </div>
        </div>
        <div className="flex gap-2">
          <span className="landing-tag">English</span>
          <span className="landing-tag">Beginner</span>
          <span className="landing-tag">Available</span>
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
        <div className="flex items-center gap-4 rounded-xl border border-bone bg-white p-5">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold"
            style={{
              background: "linear-gradient(135deg, #6647f0 0%, #0091ff 100%)",
              color: "#ffffff",
              fontFamily: "var(--landing-font-plus-jakarta-sans)",
            }}
          >
            MG
          </div>
          <div>
            <div className="text-base font-semibold" style={{ color: "#090c1d", fontFamily: "var(--landing-font-plus-jakarta-sans)" }}>
              Sarah Johnson
            </div>
            <div className="text-xs" style={{ color: "#646464", fontFamily: "var(--landing-font-inter)" }}>
              English · Conversation specialist
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs" style={{ color: "#6647f0", fontFamily: "var(--landing-font-plus-jakarta-sans)" }}>
              ★ 4.98 · 1,240 sessions
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <span
            className="rounded-full px-3 py-1.5 text-xs font-medium"
            style={{
              border: "1px solid #6ee7b7",
              backgroundColor: "#f0fdf4",
              color: "#065f46",
              fontFamily: "var(--landing-font-plus-jakarta-sans)",
            }}
          >
            Verified
          </span>
          <span className="landing-tag">5 years experience</span>
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
        <div className="flex items-center justify-between rounded-xl border border-bone bg-white p-4">
          <div>
            <div className="text-sm font-semibold" style={{ color: "#090c1d", fontFamily: "var(--landing-font-plus-jakarta-sans)" }}>
              Today, 3:00 PM
            </div>
            <div className="text-xs" style={{ color: "#646464", fontFamily: "var(--landing-font-inter)" }}>
              30 min session
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold" style={{ color: "#090c1d", fontFamily: "var(--landing-font-plus-jakarta-sans)" }}>
              $25
            </div>
            <div className="text-xs" style={{ color: "#646464", fontFamily: "var(--landing-font-inter)" }}>
              per session
            </div>
          </div>
        </div>
        <div
          className="w-full rounded-full py-3 text-center text-sm font-semibold"
          style={{
            backgroundColor: "#202020",
            color: "#ffffff",
            fontFamily: "var(--landing-font-plus-jakarta-sans)",
          }}
        >
          Confirm Booking
        </div>
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
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold"
            style={{
              background: "linear-gradient(135deg, #6647f0 0%, #0091ff 100%)",
              color: "#ffffff",
              fontFamily: "var(--landing-font-plus-jakarta-sans)",
            }}
          >
            MG
          </div>
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold"
            style={{
              backgroundColor: "#f8f9fa",
              color: "#646464",
              border: "1px solid #e8e8e8",
              fontFamily: "var(--landing-font-plus-jakarta-sans)",
            }}
          >
            You
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#00c07a" }} />
          <span className="text-xs font-medium" style={{ color: "#065f46", fontFamily: "var(--landing-font-plus-jakarta-sans)" }}>
            Live session in progress
          </span>
        </div>
        <div
          className="rounded-xl border border-bone p-3 text-center text-xs"
          style={{
            backgroundColor: "#f8f9fa",
            color: "#646464",
            fontFamily: "var(--landing-font-inter)",
          }}
        >
          Shared notes: &ldquo;I&rsquo;m excited&rdquo; = I&rsquo;m excited
        </div>
      </div>
    ),
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how" className="relative overflow-hidden" style={{ backgroundColor: "#f8f9fa" }}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <Reveal className="text-center">
          <p className="landing-text-mono mb-4">HOW IT WORKS</p>
          <h2 className="landing-text-heading lg:landing-text-heading-lg mx-auto max-w-2xl">
            Your journey to fluency
          </h2>
          <p className="landing-text-body mt-4 mx-auto max-w-lg">
            From finding the right mentor to having your first conversation in four simple steps.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.id} delay={i * 100}>
              <div className="landing-card-hover flex h-full flex-col">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
                  style={{
                    background: "linear-gradient(135deg, rgba(102,71,240,0.1) 0%, rgba(0,145,255,0.1) 100%)",
                    color: "#6647f0",
                  }}
                >
                  <step.icon className="h-6 w-6" />
                </div>
                <div
                  className="text-xs font-semibold mb-1"
                  style={{
                    fontFamily: "var(--landing-font-sometype-mono)",
                    color: "#838383",
                    letterSpacing: "0.08em",
                  }}
                >
                  {step.number}
                </div>
                <h3
                  className="text-xl font-bold mb-1"
                  style={{
                    fontFamily: "var(--landing-font-plus-jakarta-sans)",
                    color: "#090c1d",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {step.subtitle}
                </h3>
                <p
                  className="text-sm mb-4"
                  style={{
                    fontFamily: "var(--landing-font-inter)",
                    color: "#646464",
                    lineHeight: 1.5,
                  }}
                >
                  {step.description}
                </p>
                <div className="mt-auto">
                  {step.visual}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
