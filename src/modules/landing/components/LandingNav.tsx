import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "How it works", href: "/#how" },
  { label: "Mentors", href: "/#mentors" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        backgroundColor: scrolled ? "#ffffff" : "transparent",
        borderBottom: scrolled ? "1px solid #e8e8e8" : "1px solid transparent",
        transition: "background-color 0.3s ease, border-color 0.3s ease",
      }}
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div
            className="flex h-9 w-9 items-center justify-center"
            style={{
              borderRadius: "50%",
              backgroundColor: "#202020",
            }}
          >
            <span
              className="font-mono text-xs font-bold"
              style={{ color: "#ffffff", fontFamily: "var(--landing-font-sometype-mono)" }}
            >
              L
            </span>
          </div>
          <span
            className="text-lg tracking-tight"
            style={{
              color: "#090c1d",
              fontWeight: 700,
              fontFamily: "var(--landing-font-plus-jakarta-sans)",
            }}
          >
            Lingua
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href as any}
              className="landing-btn-nav"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/mentor-signup"
            className="landing-btn-nav"
          >
            For Mentors
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="landing-btn-ghost">
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" } as never}
            className="landing-btn-filled no-underline"
          >
            Start Learning
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center md:hidden"
          style={{
            border: "1px solid #e8e8e8",
            borderRadius: "9px",
            backgroundColor: "#ffffff",
            color: "#090c1d",
          }}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div
          className="md:hidden"
          style={{
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e8e8e8",
          }}
        >
          <nav className="mx-auto max-w-[1200px] px-4 py-4 space-y-1" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.href as any}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm no-underline"
                style={{
                  color: "#090c1d",
                  fontFamily: "var(--landing-font-plus-jakarta-sans)",
                  fontWeight: 600,
                  borderRadius: "9px",
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/mentor-signup"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm no-underline"
              style={{
                color: "#090c1d",
                fontFamily: "var(--landing-font-plus-jakarta-sans)",
                fontWeight: 600,
                borderRadius: "9px",
              }}
            >
              For Mentors
            </Link>
            <div className="flex gap-2 pt-3">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full py-2.5 text-center text-sm no-underline"
                style={{
                  border: "1px solid #e8e8e8",
                  color: "#090c1d",
                  fontFamily: "var(--landing-font-plus-jakarta-sans)",
                  fontWeight: 700,
                }}
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" } as never}
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full py-2.5 text-center text-sm no-underline"
                style={{
                  backgroundColor: "#202020",
                  color: "#ffffff",
                  fontFamily: "var(--landing-font-plus-jakarta-sans)",
                  fontWeight: 700,
                }}
              >
                Start Learning
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
