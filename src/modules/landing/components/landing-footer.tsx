import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Twitter, Instagram, Linkedin, Youtube } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Method", to: "/", hash: "method" },
      { label: "How it works", to: "/", hash: "how" },
      { label: "Mentors", to: "/", hash: "mentors" },
      { label: "Pricing", to: "/", hash: "pricing" },
      { label: "FAQ", to: "/", hash: "faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/auth", hash: undefined },
      { label: "Careers", to: "/auth", hash: undefined },
      { label: "Blog", to: "/auth", hash: undefined },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/auth", hash: undefined },
      { label: "Terms", to: "/auth", hash: undefined },
      { label: "Contact", to: "/auth", hash: undefined },
    ],
  },
] as const;

const SOCIALS = [
  { icon: Twitter, label: "Twitter / X" },
  { icon: Instagram, label: "Instagram" },
  { icon: Linkedin, label: "LinkedIn" },
  { icon: Youtube, label: "YouTube" },
];

export function LandingFooter() {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);

  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
                <img src="/logo.png" alt="" className="h-5 w-5" />
              </span>
              <span className="text-xl font-display tracking-tight">Lingua</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Learn any language from a real human. Verified mentors, live sessions, and streaks
              that turn practice into fluency.
            </p>
            <div className="mt-6 flex gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-sm font-semibold">{col.title}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to as "/"}
                      hash={link.hash as never}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border/70 pt-8 text-sm text-muted-foreground sm:flex-row">
          <div>© {year ?? ""} Lingua. Learn from real humans.</div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
