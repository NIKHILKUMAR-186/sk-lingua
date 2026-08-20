import { Reveal } from "./reveal";

const FEATURES = [
  {
    label: "REAL PEOPLE",
    title: "Human mentors",
    description: "Learn from native speakers who care about your progress.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6647f0" }}>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "LIVE PRACTICE",
    title: "Conversation first",
    description: "Speak from day one. No textbooks, no rote memorization.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6647f0" }}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "VISIBLE PROGRESS",
    title: "Track growth",
    description: "See your fluency build with every session.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6647f0" }}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

export function LandingFeatures() {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "#f8f9fa" }}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <Reveal className="text-center mb-16">
          <p className="landing-text-mono mb-4">WHY LINGUA</p>
          <h2 className="landing-text-heading lg:landing-text-heading-lg mx-auto max-w-2xl">
            Built for how you actually learn
          </h2>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.label} delay={i * 100}>
              <div className="landing-card-hover flex h-full flex-col">
                <div className="mb-4">{feature.icon}</div>
                <div
                  className="text-xs font-semibold mb-2"
                  style={{
                    fontFamily: "var(--landing-font-sometype-mono)",
                    color: "#6647f0",
                    letterSpacing: "0.08em",
                  }}
                >
                  {feature.label}
                </div>
                <div
                  className="text-xl font-bold mb-2"
                  style={{
                    fontFamily: "var(--landing-font-plus-jakarta-sans)",
                    color: "#090c1d",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {feature.title}
                </div>
                <p
                  className="text-sm"
                  style={{
                    fontFamily: "var(--landing-font-inter)",
                    color: "#646464",
                    lineHeight: 1.5,
                  }}
                >
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
