import { Link } from "@tanstack/react-router";
import { useSubscriptionPlans } from "@/hooks/use-subscriptions";
import { Reveal } from "./reveal";
import { Check } from "lucide-react";

export function LandingPricing() {
  const { data: plans = [], isLoading } = useSubscriptionPlans();

  const subscriptionPlans = plans.filter((p) => p.name !== "Demo Session");

  return (
    <section id="plans" className="relative overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <Reveal className="text-center mb-16">
          <p className="landing-text-mono mb-4">SUBSCRIPTION PLANS</p>
          <h2 className="landing-text-heading lg:landing-text-heading-lg mx-auto max-w-2xl">
            Simple, transparent pricing
          </h2>
          <p className="landing-text-body mt-4 mx-auto max-w-lg">
            Choose the plan that fits your learning pace. All plans include full access to our platform.
          </p>
        </Reveal>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="landing-card animate-pulse">
                <div className="h-8 w-24 rounded bg-bone mb-4" />
                <div className="h-10 w-20 rounded bg-bone mb-2" />
                <div className="h-4 w-32 rounded bg-bone mb-6" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-bone" />
                  <div className="h-3 w-full rounded bg-bone" />
                  <div className="h-3 w-2/3 rounded bg-bone" />
                </div>
              </div>
            ))}
          </div>
        ) : subscriptionPlans.length === 0 ? (
          <div className="text-center">
            <p className="landing-text-body">No plans are currently available. Please check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {subscriptionPlans.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 100}>
                <div
                  className={`landing-card-hover flex h-full flex-col ${plan.recommended ? "ring-2 ring-[#6647f0]" : ""}`}
                >
                  {plan.recommended && (
                    <div className="mb-4">
                      <span
                        className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: "#6647f0",
                          color: "#ffffff",
                          fontFamily: "var(--landing-font-plus-jakarta-sans)",
                        }}
                      >
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div
                    className="text-lg font-semibold"
                    style={{
                      fontFamily: "var(--landing-font-plus-jakarta-sans)",
                      color: "#090c1d",
                    }}
                  >
                    {plan.name}
                  </div>
                  {plan.description && (
                    <div
                      className="mt-1 text-sm"
                      style={{
                        fontFamily: "var(--landing-font-inter)",
                        color: "#646464",
                      }}
                    >
                      {plan.description}
                    </div>
                  )}
                  <div className="mt-4">
                    <span
                      className="text-4xl font-bold"
                      style={{
                        fontFamily: "var(--landing-font-plus-jakarta-sans)",
                        color: "#090c1d",
                        letterSpacing: "-0.04em",
                      }}
                    >
                      ₹{plan.price}
                    </span>
                    <div
                      className="text-sm mt-1"
                      style={{
                        fontFamily: "var(--landing-font-inter)",
                        color: "#838383",
                      }}
                    >
                      {plan.validity_days ? `Valid for ${plan.validity_days} days` : "One-time purchase"}
                    </div>
                  </div>
                  <div
                    className="mt-4 rounded-xl p-4"
                    style={{
                      backgroundColor: "#f8f9fa",
                      border: "1px solid #e8e8e8",
                    }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{
                        fontFamily: "var(--landing-font-plus-jakarta-sans)",
                        color: "#6647f0",
                      }}
                    >
                      {plan.num_sessions}
                    </div>
                    <div
                      className="text-sm"
                      style={{
                        fontFamily: "var(--landing-font-inter)",
                        color: "#646464",
                      }}
                    >
                      sessions included
                    </div>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {(plan.features as string[]).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#00c07a" }} />
                        <span
                          className="text-sm"
                          style={{
                            fontFamily: "var(--landing-font-inter)",
                            color: "#646464",
                          }}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-6">
                    <Link
                      to="/auth"
                      search={{ mode: "signup" } as never}
                      className={`landing-btn-filled w-full justify-center no-underline ${plan.recommended ? "" : "!bg-transparent !text-[#090c1d] !border !border-[#e8e8e8]"}`}
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
