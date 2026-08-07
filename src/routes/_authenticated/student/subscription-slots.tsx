import { createFileRoute, Link } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubscriptionSlotCard } from "@/components/subscription-slot-card";
import { getStudentSubscription } from "@/lib/subscriptions";
import { getSlotRestorationRequests } from "@/lib/slot-management";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/student/subscription-slots")({
  component: StudentSubscriptionSlots,
});

function StudentSubscriptionSlots() {
  const { data: auth } = useAuth();
  const userId = auth?.user?.id;
  const [isRequestingRestoration, setIsRequestingRestoration] = useState(false);
  const [restorationReason, setRestorationReason] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["student-subscription", userId],
    queryFn: async () => {
      if (!userId) return null;
      return await getStudentSubscription(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });

  const { data: restorationRequests = [] } = useQuery({
    queryKey: ["slot-restoration-requests", userId],
    queryFn: async () => {
      if (!userId) return [];
      return await getSlotRestorationRequests(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });

  const handleRequestRestoration = async () => {
    if (!restorationReason.trim() || !userId || !subscription?.id) {
      return;
    }

    // This would be implemented with a mutation
    // For now, just show an alert
    alert("Slot restoration request submitted. Admin will review it shortly.");
    setRestorationReason("");
    setIsRequestingRestoration(false);
  };

  if (subLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  if (!subscription) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-4xl space-y-6 py-6">
          <div>
            <h1 className="text-3xl font-display">Subscription & Slots</h1>
            <p className="mt-1 text-muted-foreground">Manage your subscription and session slots</p>
          </div>

          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <RefreshCw className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">No Active Subscription</h3>
              <p className="mt-2 text-muted-foreground">
                You don't have an active subscription. Choose a plan to get started.
              </p>
              <Button asChild className="mt-6">
                <Link to="/student/pricing">View Plans</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mx-auto max-w-4xl space-y-6 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display">Subscription & Slots</h1>
          <p className="mt-1 text-muted-foreground">Manage your subscription and session slots</p>
        </div>

        {/* Subscription Slot Card */}
        <SubscriptionSlotCard
          planName={subscription.plan?.name || "Monthly Plan"}
          totalSlots={subscription.total_session_slots}
          usedSlots={subscription.used_session_slots}
          currentSlots={subscription.current_session_slots}
          expiresAt={subscription.expires_at}
          status={subscription.status}
          onRenew={() => {
            // Navigate to renewal page
            window.location.href = "/student/pricing";
          }}
        />

        {/* Slot Restoration Section */}
        {subscription.current_session_slots === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Request Slot Restoration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If you believe a slot was deducted incorrectly (e.g., technical issues, mentor
                no-show), you can request a restoration.
              </p>

              {!isRequestingRestoration ? (
                <Button onClick={() => setIsRequestingRestoration(true)} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Request Slot Restoration
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Reason for Restoration</label>
                    <textarea
                      value={restorationReason}
                      onChange={(e) => setRestorationReason(e.target.value)}
                      placeholder="Please explain why you need a slot restoration..."
                      className="mt-2 w-full rounded-lg border p-3"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleRequestRestoration} disabled={!restorationReason.trim()}>
                      Submit Request
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsRequestingRestoration(false);
                        setRestorationReason("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Previous Requests */}
              {restorationRequests.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-semibold">Previous Requests</h4>
                  {restorationRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{request.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          request.status === "approved"
                            ? "default"
                            : request.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Session History */}
        <Card>
          <CardHeader>
            <CardTitle>Session History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{subscription.used_session_slots}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{subscription.current_session_slots}</div>
                  <div className="text-xs text-muted-foreground">Remaining</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{subscription.total_session_slots}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {subscription.total_session_slots > 0
                      ? Math.round(
                          (subscription.used_session_slots / subscription.total_session_slots) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{
                      width: `${(subscription.used_session_slots / subscription.total_session_slots) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Book a Session</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Use your remaining slots to book a session with a mentor.
              </p>
              <Button
                asChild
                className="w-full"
                disabled={subscription.current_session_slots === 0}
              >
                <Link to="/student/sessions">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Book Session
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Renew Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Renew your plan to get more session slots.
              </p>
              <Button asChild className="w-full" variant="outline">
                <Link to="/student/pricing">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  View Plans
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentLayout>
  );
}
