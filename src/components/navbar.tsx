import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getDashboardRoute } from "@/lib/auth";

export function Navbar() {
  const { data } = useAuth();
  const dashHref = getDashboardRoute(data?.role ?? null);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg ">
            {/* <Languages className="h-5 w-5 text-white" /> */}
            <img src="/logo.png" alt="LINGUA" className="h-6 w-6" />
          </div>
          <span className="text-xl font-display">Lingua</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            to="/"
            hash="languages"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Languages
          </Link>
          <Link to="/" hash="how" className="text-sm text-muted-foreground hover:text-foreground">
            How it works
          </Link>
          <Link
            to="/"
            hash="mentors"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Mentors
          </Link>
        </nav>
        <div className="flex items-center gap-2">
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
      </div>
    </header>
  );
}
