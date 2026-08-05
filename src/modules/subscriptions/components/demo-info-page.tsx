import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Users, BarChart3, MessageSquare } from "lucide-react";

interface DemoInfoPageProps {
  onGetStarted: () => void;
  loading?: boolean;
}

export function DemoInfoPage({ onGetStarted, loading }: DemoInfoPageProps) {
  const benefits = [
    {
      icon: Users,
      title: "Expert Mentors",
      description: "Meet experienced language professionals who are passionate about teaching.",
    },
    {
      icon: Clock,
      title: "30 Minutes",
      description: "Perfect introduction to your learning style and teaching approach.",
    },
    {
      icon: BarChart3,
      title: "Personalized",
      description: "Get a customized learning roadmap based on your goals and level.",
    },
    {
      icon: MessageSquare,
      title: "Interactive",
      description: "Real-time conversation practice with immediate feedback.",
    },
  ];

  const faqs = [
    {
      q: "What should I prepare?",
      a: "Just bring yourself! Our mentors will guide you through the session. Have a notebook handy if you want to take notes.",
    },
    {
      q: "What language level do I need?",
      a: "Any level is welcome! Mentors adapt their teaching to match your current level, from absolute beginner to advanced.",
    },
    {
      q: "Can I reschedule?",
      a: "Yes! You can reschedule your demo up to 24 hours before. Just contact support.",
    },
    {
      q: "Will there be a recording?",
      a: "You'll have access to a recording after the session so you can review what you learned.",
    },
    {
      q: "What if I'm nervous?",
      a: "That's completely normal! Our mentors are experienced with nervous learners and create a comfortable, supportive environment.",
    },
    {
      q: "Is there a guarantee?",
      a: "Absolutely! If you're not satisfied with your demo session, we offer a full money-back guarantee.",
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-8 text-center md:p-12">
        <h1 className="text-4xl font-display md:text-5xl">
          Your First Step to Fluency
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Book a demo session and discover your personalized learning path.
        </p>
        <div className="mt-8 inline-block rounded-2xl bg-primary px-6 py-2 text-primary-foreground">
          <span className="text-lg font-semibold">Just ₹9</span>
          <span className="ml-2 text-sm">for your first 30 minutes</span>
        </div>
      </div>

      {/* Highlights */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">What You'll Experience</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {benefits.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <Card key={i}>
                <CardContent className="flex gap-4 pt-6">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{benefit.title}</div>
                    <div className="text-sm text-muted-foreground">{benefit.description}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Benefits List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Demo Session Includes</h2>
        <div className="space-y-2">
          {[
            "1 personalized 30-minute session",
            "Mentor assessment of your current level",
            "Customized learning roadmap",
            "Introduction to the LINGUA platform",
            "Access to session recording",
            "Book discounted follow-up sessions",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{faq.q}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {faq.a}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-8 text-center md:p-12">
        <h2 className="text-2xl font-semibold">Ready to Get Started?</h2>
        <p className="mt-2 text-muted-foreground">
          Pick a time that works for you and meet your mentor.
        </p>
        <Button
          onClick={onGetStarted}
          size="lg"
          className="mt-6"
          disabled={loading}
        >
          {loading ? "Loading..." : "Book Your Demo Now"}
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          ✓ Money-back guarantee if not satisfied
        </p>
      </div>
    </div>
  );
}
