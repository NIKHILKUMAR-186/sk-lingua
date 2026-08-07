import { createFileRoute, Link } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Star, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/demo-conversion")({
  component: DemoConversionPage,
});

function DemoConversionPage() {
  const { data: auth } = useAuth();

  return (
    <StudentLayout>
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-display">Demo Session Completed!</h1>
          <p className="text-lg text-muted-foreground">
            Congratulations! Your demo session has been completed successfully.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-2">
              <Star className="h-12 w-12 text-warning mx-auto" />
              <h2 className="text-xl font-semibold">How was your demo session?</h2>
              <p className="text-sm text-muted-foreground">
                Your feedback helps us improve the learning experience
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">What's Next?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      1
                    </span>
                    <span>Choose a subscription plan that fits your learning goals</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      2
                    </span>
<span>Book regular sessions with our expert mentors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      3
                    </span>
                    <span>Track your progress and achieve your language goals</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button asChild className="flex-1">
                  <Link to="/student/pricing">
                    View Pricing Plans <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/student/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}