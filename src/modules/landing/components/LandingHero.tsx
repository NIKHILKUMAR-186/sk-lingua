import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p
              className="landing-text-mono mb-6"
              style={{ animationDelay: "0ms" }}
            >
              LANGUAGE LEARNING PLATFORM
            </p>

            <h1
              className="landing-text-heading lg:landing-text-heading-lg max-w-2xl"
              style={{ animationDelay: "100ms" }}
            >
              Don&rsquo;t just learn a language.{" "}
              <span style={{ color: "#6647f0" }}>Use it.</span>
            </h1>

            <p
              className="landing-text-body mt-6 max-w-lg"
              style={{ animationDelay: "200ms" }}
            >
              Real mentors. Real conversations. Real progress.
            </p>

            <div className="mt-8 space-y-3" style={{ animationDelay: "250ms" }}>
              <div className="landing-checkmark-item">
                <Check className="landing-checkmark-icon" />
                <div>
                  <span className="landing-checkmark-text">Verified mentors</span>
                  <span className="landing-checkmark-desc"> — native speakers who care about your progress</span>
                </div>
              </div>
              <div className="landing-checkmark-item">
                <Check className="landing-checkmark-icon" />
                <div>
                  <span className="landing-checkmark-text">Live video sessions</span>
                  <span className="landing-checkmark-desc"> — practice from day one with real people</span>
                </div>
              </div>
              <div className="landing-checkmark-item">
                <Check className="landing-checkmark-icon" />
                <div>
                  <span className="landing-checkmark-text">Track your growth</span>
                  <span className="landing-checkmark-desc"> — see fluency build with every conversation</span>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row" style={{ animationDelay: "300ms" }}>
              <Link
                to="/auth"
                search={{ mode: "signup" } as never}
                className="landing-btn-filled no-underline"
              >
                Start Learning
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="landing-btn-ghost no-underline">
                Sign in
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2" style={{ animationDelay: "350ms" }}>
              <span className="landing-tag">1-on-1 mentoring</span>
              <span className="landing-tag">Live sessions</span>
              <span className="landing-tag">Progress tracking</span>
            </div>
          </div>

          <div className="relative" style={{ animationDelay: "400ms" }}>
            <div className="landing-product-card">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="flex h-11 w-11 items-center justify-center"
                    style={{
                      borderRadius: "50%",
                      backgroundColor: "#6647f0",
                      color: "#ffffff",
                      fontFamily: "var(--landing-font-plus-jakarta-sans)",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  >
                    MG
                  </div>
                  <div>
                    <div
                      className="text-sm"
                      style={{
                        color: "#090c1d",
                        fontFamily: "var(--landing-font-plus-jakarta-sans)",
                        fontWeight: 700,
                      }}
                    >
                       Sarah Johnson
                    </div>
                    <div
                      className="text-xs"
                      style={{
                        color: "#646464",
                        fontFamily: "var(--landing-font-inter)",
                      }}
                    >
                      English · Conversation specialist
                    </div>
                  </div>
                  <div
                    className="ml-auto flex items-center gap-1.5"
                    style={{
                      borderRadius: "9999px",
                      padding: "3px 10px",
                      backgroundColor: "#f8f9fa",
                      border: "1px solid #e8e8e8",
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: "#00c07a" }}
                    />
                    <span
                      className="text-xs"
                      style={{
                        color: "#090c1d",
                        fontFamily: "var(--landing-font-plus-jakarta-sans)",
                        fontWeight: 600,
                      }}
                    >
                      Available
                    </span>
                  </div>
                </div>

                <div
                  className="space-y-3"
                  style={{
                    borderTop: "1px solid #e8e8e8",
                    paddingTop: "16px",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className="text-xs"
                        style={{
                          color: "#838383",
                          fontFamily: "var(--landing-font-sometype-mono)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Today
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {["10:00", "13:00", "16:00"].map((time) => (
                      <div
                        key={time}
                        className="flex-1 rounded-lg px-3 py-2.5 text-center text-sm"
                        style={{
                          border: "1px solid #e8e8e8",
                          backgroundColor: "#ffffff",
                          color: "#090c1d",
                          fontFamily: "var(--landing-font-plus-jakarta-sans)",
                          fontWeight: 600,
                          cursor: "default",
                        }}
                      >
                        {time}
                      </div>
                    ))}
                  </div>

                  <div
                    className="flex items-center justify-between rounded-xl p-4"
                    style={{
                      border: "1px solid #e8e8e8",
                      backgroundColor: "#f8f9fa",
                    }}
                  >
                    <div>
                      <div
                        className="text-sm"
                        style={{
                          color: "#090c1d",
                          fontFamily: "var(--landing-font-plus-jakarta-sans)",
                          fontWeight: 700,
                        }}
                      >
                        Today · 30 min
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{
                          color: "#646464",
                          fontFamily: "var(--landing-font-inter)",
                        }}
                      >
                         English Conversation
                      </div>
                    </div>
                    <div
                      className="rounded-full px-4 py-2 text-xs"
                      style={{
                        backgroundColor: "#202020",
                        color: "#ffffff",
                        fontFamily: "var(--landing-font-plus-jakarta-sans)",
                        fontWeight: 700,
                      }}
                    >
                      Book session
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="absolute -bottom-4 -right-4 hidden lg:block"
              style={{
                animation: "float 7s ease-in-out infinite",
              }}
            >
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e8e8e8",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 4px 16px -8px rgba(0,0,0,0.08)",
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "#00c07a" }}
                />
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: "#090c1d",
                    fontFamily: "var(--landing-font-plus-jakarta-sans)",
                  }}
                >
                  Session confirmed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
