import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, Globe2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/become-a-mentor")({
  head: () => ({
    meta: [
      { title: "Become a mentor — Lingua" },
      {
        name: "description",
        content:
          "Apply to become a Lingua mentor and join our vetted marketplace of language learners.",
      },
      { property: "og:title", content: "Become a mentor — Lingua" },
      {
        property: "og:description",
        content:
          "Apply to become a Lingua mentor and join our vetted marketplace of language learners.",
      },
    ],
  }),
  component: BecomeAMentorPage,
});

function BecomeAMentorPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <section className="space-y-8">
            <div className="max-w-2xl space-y-4">
              <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                Mentor application
              </p>
              <h1 className="text-5xl font-display tracking-tight text-foreground sm:text-6xl">
                Teach your language. Grow your income. Join Lingua.
              </h1>
              <p className="text-lg leading-8 text-muted-foreground">
                We are launching a curated marketplace for language mentors. Apply now and our team
                will review your experience, verify your teaching skills, and onboard you to start
                earning.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="h-14 px-8">
                  <Link to="/mentor/apply">Apply as a mentor</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 px-8">
                  <a href="mailto:hello@lingua.app">Contact our team</a>
                </Button>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <Card className="border-border bg-card/80 shadow-sm">
                <CardHeader className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">Flexible earnings</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Set your own rates, keep up to 90% of every session, and scale at your own pace.
                </CardContent>
              </Card>
              <Card className="border-border bg-card/80 shadow-sm">
                <CardHeader className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">Curated marketplace</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Join a vetted community of learners with a verified mentor onboarding process.
                </CardContent>
              </Card>
              <Card className="border-border bg-card/80 shadow-sm">
                <CardHeader className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                    <Globe2 className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">Global reach</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Connect with learners from around the world and support language practice across
                  time zones.
                </CardContent>
              </Card>
            </div>
          </section>

          <aside className="space-y-6 rounded-[2rem] border border-border bg-foreground/90 p-8 shadow-2xl shadow-slate-950/10 backdrop-blur-xl">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.32em] text-primary">How it works</p>
              <div className="space-y-6 text-sm text-muted-foreground">
                <div className="rounded-3xl bg-background/90 p-5">
                  <p className="font-semibold text-foreground">1. Apply</p>
                  <p className="mt-2">
                    Tell us about your teaching background and why you want to join Lingua.
                  </p>
                </div>
                <div className="rounded-3xl bg-background/90 p-5">
                  <p className="font-semibold text-foreground">2. Get reviewed</p>
                  <p className="mt-2">
                    Our admin team reviews every mentor application and verifies qualifications
                    before approval.
                  </p>
                </div>
                <div className="rounded-3xl bg-background/90 p-5">
                  <p className="font-semibold text-foreground">3. Start teaching</p>
                  <p className="mt-2">
                    Once approved, you’ll receive access to the mentor dashboard, session tools, and
                    payment setup.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-950/80 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Already signed up?</p>
              <p className="mt-3">
                If you already have a Lingua account, log in and head to your onboarding page to
                complete your mentor application.
              </p>
              <Button asChild size="sm" className="mt-4 w-full">
                <Link to="/auth" search={{ mode: "login" } as never}>
                  Log in
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
