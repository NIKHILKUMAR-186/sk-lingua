import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { getDashboardRoute } from "@/lib/auth";

const NAV_LINKS = [
  { label: "Method", hash: "method" },
  { label: "How it works", hash: "how" },
  { label: "Mentors", hash: "mentors" },
  { label: "Pricing", hash: "pricing" },
  { label: "FAQ", hash: "faq" },
] as const;

export function LandingNavbar() {
  const { data } = useAuth();
  const [open, setOpen] = useState(false);
  const dashHref = getDashboardRoute(data?.role ?? null);

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement bar */}
      <div className="relative overflow-hidden bg-foreground text-background">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium sm:text-[13px]">
          <span className="hidden h-1.5 w-1.5 rounded-full bg-electric sm:inline-block" />
          <span>New — verified native mentors now in 12 languages.</span>
          <Link
            to="/auth"
            search={{ mode: "signup" } as never}
            className="group inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
          >
            Try it free
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Nav */}
      <div className="border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Lingua home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
              <img src="/logo.png" alt="" className="h-5 w-5" />
            </span>
            <span className="text-xl font-display tracking-tight">Lingua</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.hash}
                to="/"
                hash={link.hash}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {data?.user ? (
              <Button asChild size="sm">
                <Link to={dashHref as "/student/dashboard"}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth" search={{ mode: "signup" } as never}>
                    Get started
                  </Link>
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            "overflow-hidden border-t border-border/70 transition-[max-height,opacity] duration-300 md:hidden",
            open ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <nav className="space-y-1 px-4 py-4" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.hash}
                to="/"
                hash={link.hash}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted/70"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3">
              {data?.user ? (
                <Button asChild size="sm" className="flex-1">
                  <Link to={dashHref as "/student/dashboard"}>Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to="/auth">Log in</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link to="/auth" search={{ mode: "signup" } as never}>
                      Get started
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
