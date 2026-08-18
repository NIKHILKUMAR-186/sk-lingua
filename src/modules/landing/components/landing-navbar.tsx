import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { getDashboardRoute } from "@/lib/auth";

export function LandingNavbar() {
  const { data } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dashHref = getDashboardRoute(data?.role ?? null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <div
        className={cn(
          "flex w-full max-w-5xl items-center justify-between rounded-full border transition-all duration-500",
          scrolled
            ? "glass border-white/40 shadow-lg shadow-black/5"
            : "border-transparent bg-transparent",
        )}
      >
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-full px-4 py-2.5 transition-colors hover:bg-muted/50 md:px-3"
          aria-label="Lingua home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
            <img src="/logo.png" alt="" className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Lingua</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <Link
            to="/"
            hash="how"
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            to="/"
            hash="mentors"
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            Mentors
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {data?.user ? (
            <Button asChild size="sm" className="rounded-full">
              <Link to={dashHref as "/student/dashboard"}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link to="/auth">Log in</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
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
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted/60 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <div
        className={cn(
          "absolute inset-x-4 top-16 overflow-hidden rounded-3xl border border-border/80 bg-background/95 backdrop-blur-xl transition-all duration-300 md:hidden",
          open ? "max-h-[480px] opacity-100 shadow-xl" : "max-h-0 opacity-0",
        )}
      >
        <nav className="space-y-1 p-4" aria-label="Mobile">
          <Link
            to="/"
            hash="how"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted/60"
          >
            How it works
          </Link>
          <Link
            to="/"
            hash="mentors"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted/60"
          >
            Mentors
          </Link>
          <div className="flex gap-2 pt-3">
            {data?.user ? (
              <Button asChild size="sm" className="flex-1 rounded-full">
                <Link to={dashHref as "/student/dashboard"}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="flex-1 rounded-full">
                  <Link to="/auth">Log in</Link>
                </Button>
                <Button asChild size="sm" className="flex-1 rounded-full">
                  <Link to="/auth" search={{ mode: "signup" } as never}>
                    Get started
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
