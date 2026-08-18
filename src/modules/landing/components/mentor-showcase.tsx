import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Reveal } from "./reveal";
import { Star, ShieldCheck, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

const MENTORS = [
  {
    id: "1",
    name: "María García",
    language: "Spanish",
    specialty: "Conversation",
    rating: 4.98,
    sessions: 1240,
    experience: "5 years",
    availability: "Available today",
    gradient: "from-primary to-electric",
  },
  {
    id: "2",
    name: "Kenji Tanaka",
    language: "Japanese",
    specialty: "Business",
    rating: 4.92,
    sessions: 890,
    experience: "8 years",
    availability: "Available tomorrow",
    gradient: "from-electric to-primary",
  },
  {
    id: "3",
    name: "Lucia Rossi",
    language: "Italian",
    specialty: "Beginner",
    rating: 4.95,
    sessions: 650,
    experience: "3 years",
    availability: "Available now",
    gradient: "from-primary to-electric",
  },
];

export function MentorShowcase() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section id="mentors" className="border-t border-border/60 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Real mentors
          </p>
          <h2 className="mt-3 font-heading text-section sm:text-section-lg">
            Learn with people who&rsquo;ve lived it.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every mentor is verified, reviewed, and chosen for how they teach — not just what they know.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MENTORS.map((mentor, i) => (
            <Reveal key={mentor.id} delay={i * 100}>
              <div
                onMouseEnter={() => setHoveredId(mentor.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group flex h-full flex-col rounded-[1.5rem] border border-white/25 glass shadow-sm transition-all hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-electric/20 text-sm font-bold text-primary">
                      {mentor.name.split(" ").map(n => n[0]).join("")}
                    </span>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{mentor.name}</span>
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" />
                    </div>
                    <div className="text-xs text-muted-foreground">{mentor.language} · {mentor.experience}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs font-medium text-warning">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {mentor.rating}
                  </div>
                  <span className="text-xs text-muted-foreground">{mentor.sessions.toLocaleString()} sessions</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs">{mentor.specialty}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${
                    mentor.availability.includes("now") || mentor.availability.includes("today")
                      ? "border border-success/30 bg-success/10 text-success"
                      : "border border-border"
                  }`}>
                    {mentor.availability}
                  </span>
                </div>

                <div className="mt-auto pt-4">
                  <Button
                    asChild
                    size="sm"
                    className="w-full rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    variant={hoveredId === mentor.id ? "default" : "outline"}
                  >
                    <Link to="/auth" search={{ mode: "signup" } as never}>
                      <Video className="h-4 w-4" /> Book session
                    </Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
