import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", to: "/#how" },
      { label: "Become a Mentors", to: "/mentor-signup" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact", to: "/" },
    ],
  },
];

export function LandingFooter() {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);

  return (
    <footer
      style={{
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e8e8e8",
      }}
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2.5 no-underline">
              <div
                className="flex h-9 w-9 items-center justify-center"
                style={{
                  borderRadius: "50%",
                  backgroundColor: "#202020",
                }}
              >
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: "#ffffff", fontFamily: "var(--landing-font-sometype-mono)" }}
                >
                  L
                </span>
              </div>
              <span
                className="text-xl"
                style={{
                  color: "#090c1d",
                  fontFamily: "var(--landing-font-plus-jakarta-sans)",
                  fontWeight: 700,
                }}
              >
                Lingua
              </span>
            </Link>
            <p
              className="mt-4 max-w-xs text-sm"
              style={{
                color: "#646464",
                fontFamily: "var(--landing-font-inter)",
                lineHeight: 1.5,
              }}
            >
              Learn any language from a real human. Verified mentors, live sessions, and practice that turns into fluency.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div
                className="text-sm font-semibold"
                style={{
                  color: "#090c1d",
                  fontFamily: "var(--landing-font-plus-jakarta-sans)",
                }}
              >
                {col.title}
              </div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to as never}
                      hash={(link.to.startsWith("/#") ? link.to.slice(1) : undefined) as never}
                      className="text-sm no-underline transition-colors"
                      style={{
                        color: "#646464",
                        fontFamily: "var(--landing-font-inter)",
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <div
              className="text-sm font-semibold"
              style={{
                color: "#090c1d",
                fontFamily: "var(--landing-font-plus-jakarta-sans)",
              }}
            >
              Mentors
            </div>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  to="/mentor-signup"
                  className="text-sm no-underline transition-colors"
                  style={{
                    color: "#646464",
                    fontFamily: "var(--landing-font-inter)",
                  }}
                >
                  Become a mentor
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-14 flex flex-col items-center justify-between gap-4 pt-8 sm:flex-row"
          style={{ borderTop: "1px solid #e8e8e8" }}
        >
          <div
            className="text-sm"
            style={{
              color: "#838383",
              fontFamily: "var(--landing-font-inter)",
            }}
          >
            © {year ?? ""} Lingua. Learn from real humans.
          </div>
          <div className="flex gap-6">
            <Link
              to="/"
              className="text-sm no-underline transition-colors"
              style={{
                color: "#838383",
                fontFamily: "var(--landing-font-inter)",
              }}
            >
              Privacy
            </Link>
            <Link
              to="/"
              className="text-sm no-underline transition-colors"
              style={{
                color: "#838383",
                fontFamily: "var(--landing-font-inter)",
              }}
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
