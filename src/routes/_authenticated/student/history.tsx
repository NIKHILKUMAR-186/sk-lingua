import { createFileRoute } from "@tanstack/react-router";
import { StudentLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Receipt, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toCSV, downloadFile } from "@/lib/export";
import { useMemo, useState } from "react";
import { useUserPaymentHistory } from "@/hooks/use-payments";
import { useStudentSubscriptionHistory } from "@/hooks/use-subscriptions";

export const Route = createFileRoute("/_authenticated/student/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { data: auth } = useAuth();
  const userId = auth?.user?.id;
  const { data: paymentHistory = [], isLoading: paymentsLoading } = useUserPaymentHistory(
    userId ?? null,
  );
  const { data: subscriptionHistory = [], isLoading: subsLoading } = useStudentSubscriptionHistory(
    userId ?? null,
  );

  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const filteredPayments = useMemo(() => {
    return paymentHistory.filter((p: any) => {
      if (query) {
        const q = query.toLowerCase();
        if (!(
          p.transaction_id?.toLowerCase().includes(q) ||
          (p.order_type || "").toLowerCase().includes(q)
        ))
          return false;
      }
      const created = new Date(p.created_at);
      if (fromDate && new Date(fromDate) > created) return false;
      if (toDate && new Date(toDate) < created) return false;
      return true;
    });
  }, [paymentHistory, query, fromDate, toDate]);

  const filteredSubs = useMemo(() => {
    return subscriptionHistory.filter((s: any) => {
      if (query) {
        const q = query.toLowerCase();
        if (!(s.plan?.name || "").toLowerCase().includes(q)) return false;
      }
      const created = new Date(s.purchased_at);
      if (fromDate && new Date(fromDate) > created) return false;
      if (toDate && new Date(toDate) < created) return false;
      return true;
    });
  }, [subscriptionHistory, query, fromDate, toDate]);

  if (!auth?.user) {
    return (
      <StudentLayout>
        <div>Loading...</div>
      </StudentLayout>
    );
  }

  const paymentStatusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
  };

  return (
    <StudentLayout>
      <div className="mx-auto max-w-4xl space-y-6 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display">History</h1>
          <p className="text-muted-foreground">View your transaction and subscription records.</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments">
              <CreditCard className="mr-2 h-4 w-4" />
              Payment History
            </TabsTrigger>
            <TabsTrigger value="subscriptions">
              <Receipt className="mr-2 h-4 w-4" />
              Subscriptions
            </TabsTrigger>
          </TabsList>

          {/* Payment History */}
          <TabsContent value="payments" className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold mb-4">Payment Transactions</h2>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search txn id or type"
                    value={query}
                    onChange={(e: any) => setQuery(e.target.value)}
                  />
                  <Input
                    type="date"
                    value={fromDate ?? ""}
                    onChange={(e: any) => setFromDate(e.target.value || null)}
                  />
                  <Input
                    type="date"
                    value={toDate ?? ""}
                    onChange={(e: any) => setToDate(e.target.value || null)}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const csv = toCSV(
                        filteredPayments.map((p: any) => ({
                          id: p.id,
                          date: p.created_at,
                          amount: p.final_amount,
                          status: p.payment_status,
                          txn: p.transaction_id,
                        })),
                      );
                      downloadFile(`payments-${new Date().toISOString()}.csv`, csv);
                    }}
                  >
                    Export
                  </Button>
                </div>
              </div>
              {paymentsLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading...</div>
              ) : paymentHistory.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No payment history yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredPayments.map((payment) => (
                    <Card key={payment.id}>
                      <CardContent className="flex items-center justify-between pt-6">
                        <div className="flex-1">
                          <div className="font-semibold">
                            {payment.order_type === "demo_session"
                              ? "Demo Session"
                              : payment.order_type === "subscription"
                                ? "Subscription Purchase"
                                : "Subscription Renewal"}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {new Date(payment.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                          {payment.transaction_id && (
                            <div className="text-xs text-muted-foreground font-mono mt-1">
                              Txn ID: {payment.transaction_id}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold">₹{payment.final_amount.toFixed(2)}</div>
                            <Badge
                              className={paymentStatusColors[payment.payment_status] || ""}
                              variant="secondary"
                            >
                              {payment.payment_status}
                            </Badge>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Subscription History */}
          <TabsContent value="subscriptions" className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold mb-4">Subscription Records</h2>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search plan"
                    value={query}
                    onChange={(e: any) => setQuery(e.target.value)}
                  />
                  <Input
                    type="date"
                    value={fromDate ?? ""}
                    onChange={(e: any) => setFromDate(e.target.value || null)}
                  />
                  <Input
                    type="date"
                    value={toDate ?? ""}
                    onChange={(e: any) => setToDate(e.target.value || null)}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const csv = toCSV(
                        filteredSubs.map((s: any) => ({
                          id: s.id,
                          plan: s.plan?.name,
                          purchased_at: s.purchased_at,
                          status: s.status,
                        })),
                      );
                      downloadFile(`subscriptions-${new Date().toISOString()}.csv`, csv);
                    }}
                  >
                    Export
                  </Button>
                </div>
              </div>
              {subsLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading...</div>
              ) : subscriptionHistory.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No subscription history yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredSubs.map((sub) => (
                    <Card key={sub.id}>
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-lg">{sub.plan?.name}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {sub.total_session_slots} sessions
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">₹{sub.plan?.price.toFixed(2)}</div>
                            <Badge variant="outline">{sub.status}</Badge>
                          </div>
                        </div>
                        <div className="grid gap-3 grid-cols-3 text-sm border-t pt-3">
                          <div>
                            <p className="text-muted-foreground">Purchased</p>
                            <p className="font-medium">
                              {new Date(sub.purchased_at).toLocaleDateString()}
                            </p>
                          </div>
                          {sub.activated_at && (
                            <div>
                              <p className="text-muted-foreground">Activated</p>
                              <p className="font-medium">
                                {new Date(sub.activated_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          {sub.expires_at && (
                            <div>
                              <p className="text-muted-foreground">Expires</p>
                              <p className="font-medium">
                                {new Date(sub.expires_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Placeholders for Future Features */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Coming Soon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Demo Session History - Track all your demo sessions</p>
            <p>• Learning Analytics - Detailed progress reports</p>
            <p>• Session Transcripts - Access to past session materials</p>
            <p>• Invoice Management - Download and manage invoices</p>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
