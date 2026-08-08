import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock, Users, BarChart3, MessageSquare, Shield, Star } from "lucide-react";

interface DemoInfoPageProps {
  onGetStarted: () => void;
  loading?: boolean;
  price?: number;
}

export function DemoInfoPage({ onGetStarted, loading, price = 9 }: DemoInfoPageProps) {
const benefits = [
    {
      icon: Shield,
      title: "100% Satisfaction Guarantee",
      description: "If you're not satisfied with your demo session, we offer a full money-back guarantee.",
    },
    {
      icon: Star,
      title: "Expert Assessment",
      description: "Get a personalized language assessment from our experienced team to chart your learning path.",
    },
    {
      icon: Users,
      title: "Expert Team",
      description: "Get guidance from experienced language professionals who are passionate about teaching.",
    },
    {
      icon: Clock,
      title: "30 Minutes",
      description: "Perfect introduction to your learning style and language goals.",
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
      a: "Just bring yourself! Our team will guide you through the session. Have a notebook handy if you want to take notes.",
    },
    {
      q: "What language level do I need?",
      a: "Any level is welcome! Our experts adapt the session to match your current level, from absolute beginner to advanced.",
    },
    {
      q: "Can I reschedule?",
      a: "Yes! You can contact our support team to reschedule your demo.",
    },
    {
      q: "Will there be a recording?",
      a: "You'll have access to a recording after the session so you can review what you learned.",
    },
    {
      q: "What if I'm nervous?",
      a: "That's completely normal! Our team is experienced with nervous learners and creates a comfortable, supportive environment.",
    },
    {
      q: "Is there a guarantee?",
      a: "Absolutely! If you're not satisfied with your demo session, we offer a full money-back guarantee.",
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero */}
      {/* <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/80 via-primary/4 to-transparent p-8 text-center md:p-12"> */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/80 via-primary/4 to-mentor/10 p-8 text-center md:p-12">
        <h1 className="text-4xl font-display md:text-5xl">Your First Step to Fluency</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Book a demo session and discover your personalized learning path.
        </p>
        <div className="mt-8  inline-block rounded-2xl   px-6 py-2 text-primary-foreground">
        <Button onClick={onGetStarted} size="lg" className="mt-2" disabled={loading}>
          <span className="text-lg font-semibold">Just ₹{price}</span>
          <span className="ml-2 text-sm">for your first 30 minutes</span>
        </Button>
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
            "Expert assessment of your current level",
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
              <CardContent className="text-sm text-muted-foreground">{faq.a}</CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-8 text-center md:p-12">
<h2 className="text-2xl font-semibold">Ready to Get Started?</h2>
        <p className="mt-2 text-muted-foreground">
          Pick a time that works for you and we'll take it from there.
        </p>
        <Button onClick={onGetStarted} size="lg" className="mt-6" disabled={loading}>
          {loading ? "Loading..." : "Book Your Demo Now"}
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          ✓ Money-back guarantee if not satisfied
        </p>
      </div>
    </div>
  );
}
