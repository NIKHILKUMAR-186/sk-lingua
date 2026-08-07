import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Briefcase,
  Globe2,
  ShieldCheck,
  GraduationCap,
  Clock,
  FileText,
  CheckCircle2,
  ArrowRight,
  Users,
  Star,
  Wallet,
} from "lucide-react";

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

const PROCESS_STEPS = [
  {
    icon: FileText,
    title: "Submit Application",
    description:
      "Fill out our detailed application form with your experience, qualifications, and availability.",
  },
  {
    icon: ShieldCheck,
    title: "Resume Verification",
    description: "Our team verifies your resume and teaching credentials.",
  },
  {
    icon: Users,
    title: "Admin Review",
    description: "An admin reviews your application and qualifications in detail.",
  },
  {
    icon: Clock,
    title: "Interview",
    description: "A short interview to assess your teaching style and communication skills.",
  },
  {
    icon: CheckCircle2,
    title: "Approval",
    description: "If approved, your mentor account is activated with a temporary password.",
  },
  {
    icon: GraduationCap,
    title: "Mentor Account Activation",
    description: "Log in with your approved email and start teaching.",
  },
];

const ELIGIBILITY = [
  "Native or near-native proficiency in at least one language",
  "Minimum 2 years of teaching or tutoring experience",
  "Strong communication and interpersonal skills",
  "Reliable internet connection and a quiet teaching environment",
  "Passion for helping others learn",
];

const FAQS = [
  {
    q: "How long does the application process take?",
    a: "Typically 5-7 business days from submission to decision, depending on interview availability.",
  },
  {
    q: "Do I need a teaching certification?",
    a: "Not required, but certifications like TEFL, TESOL, or CELTA strengthen your application.",
  },
  {
    q: "Can I apply if I'm already a student on Lingua?",
    a: "Yes! You can apply to become a mentor while also learning as a student.",
  },
  {
    q: "What happens after I'm approved?",
    a: "You'll receive a temporary password via email. On first login, you'll be required to change it and complete your mentor profile.",
  },
  { q: "Is there a fee to apply?", a: "No, applying to become a mentor is completely free." },
];

function BecomeAMentorPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-hero-gradient from-slate-950 via-slate-900 to-slate-800 py-20 px-4 sm:px-6 lg:px-8 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-6">
              <p className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                Mentor application
              </p>
              <h1 className="text-5xl font-display tracking-tight sm:text-6xl">
                Teach your language. Grow your income. Join Lingua.
              </h1>
              <p className="text-lg leading-8 text-slate-300">
                We are launching a curated marketplace for language mentors. Apply now and our team
                will review your experience, verify your teaching skills, and onboard you to start
                earning.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="h-14 px-8">
                  <Link to="/mentor/apply">Apply as a mentor</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 border-white/20 text-white hover:bg-white/10"
                >
                  <a href="mailto:hello@lingua.app">Contact our team</a>
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <Card className="border-white/10 bg-white/5 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" /> Flexible earnings
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-300">
                  Set your own rates, keep up to 90% of every session, and scale at your own pace.
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Curated marketplace
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-300">
                  Join a vetted community of learners with a verified mentor onboarding process.
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe2 className="h-5 w-5" /> Global reach
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-300">
                  Connect with learners from around the world and support language practice across
                  time zones.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Why Become a Mentor */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-display">Why Become a Mentor?</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Join a growing community of language educators and earn from your expertise.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <Star className="h-6 w-6" />
                </div>
                <CardTitle>Earn on your terms</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Set your own hourly rate and keep up to 90% of every session.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle>Teach globally</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Reach students from around the world and grow your teaching practice.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <CardTitle>Professional growth</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Build your teaching portfolio and gain valuable experience.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Eligibility Requirements */}
      <section className="bg-muted/30 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-display">Eligibility Requirements</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              To be considered for the mentor program, you should meet the following criteria.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {ELIGIBILITY.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border bg-background p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                <p className="text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Process Timeline */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-display">Application Process</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Here's what to expect after you submit your application.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PROCESS_STEPS.map((step, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      Step {i + 1}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {step.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-muted/30 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-display">Frequently Asked Questions</h2>
          </div>
          <div className="mt-10 space-y-4">
            {FAQS.map((faq, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-base">{faq.q}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{faq.a}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-4xl font-display">Ready to start teaching?</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Apply now and our team will review your application. If approved, you'll receive a
            temporary password to activate your mentor account.
          </p>
          <Button asChild size="lg" className="h-14 px-8">
            <Link to="/mentor/apply">
              Apply as a mentor <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
