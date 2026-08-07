import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getPendingSlotRestorationRequests,
  approveSlotRestoration,
  rejectSlotRestoration,
  type SlotRestorationRequest,
} from "@/lib/slot-management";
import { Loader2, CheckCircle2, XCircle, Eye, RefreshCw } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/slot-management")({
  component: AdminSlotManagement,
});

function AdminSlotManagement() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<SlotRestorationRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["pending-slot-restoration-requests"],
    queryFn: async () => {
      return await getPendingSlotRestorationRequests();
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });

  const approveMutation = useMutation({
    mutationFn: async (data: { requestId: string; reviewedBy: string; reviewNotes?: string }) => {
      return await approveSlotRestoration(data.requestId, data.reviewedBy, data.reviewNotes);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-slot-restoration-requests"] });
      toast.success("Slot restoration approved");
      setIsReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewNotes("");
      setActionType(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve request");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (data: { requestId: string; reviewedBy: string; reviewNotes?: string }) => {
      return await rejectSlotRestoration(data.requestId, data.reviewedBy, data.reviewNotes);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-slot-restoration-requests"] });
      toast.success("Slot restoration rejected");
      setIsReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewNotes("");
      setActionType(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject request");
    },
  });

  function openReviewDialog(request: SlotRestorationRequest, action: "approve" | "reject") {
    setSelectedRequest(request);
    setActionType(action);
    setIsReviewDialogOpen(true);
  }

  function handleReview() {
    if (!selectedRequest || !actionType || !auth?.user?.id) return;

    if (actionType === "approve") {
      approveMutation.mutate({
        requestId: selectedRequest.id,
        reviewedBy: auth.user.id,
        reviewNotes: reviewNotes || undefined,
      });
    } else {
      rejectMutation.mutate({
        requestId: selectedRequest.id,
        reviewedBy: auth.user.id,
        reviewNotes: reviewNotes || undefined,
      });
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display">Slot Management</h1>
          <p className="mt-1 text-muted-foreground">Review and manage slot restoration requests</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Pending Requests</div>
              <div className="mt-2 text-3xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Total Slots Restored</div>
              <div className="mt-2 text-3xl font-bold text-green-600">0</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Total Slots Revoked</div>
              <div className="mt-2 text-3xl font-bold text-red-600">0</div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Slot Restoration Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 mb-4 opacity-50 text-green-600" />
                <p>No pending slot restoration requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <RefreshCw className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">Slot Restoration Request</p>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                        <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                          <p>User ID: {request.user_id}</p>
                          <p>Subscription ID: {request.subscription_id}</p>
                          {request.booking_id && <p>Booking ID: {request.booking_id}</p>}
                          <p>Reason: {request.reason}</p>
                          <p className="text-xs">
                            Requested: {new Date(request.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Slot Restoration Request Details</DialogTitle>
                            <DialogDescription>Request ID: {request.id}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Status</Label>
                              <div className="mt-1">
                                <Badge variant="secondary">Pending</Badge>
                              </div>
                            </div>
                            <div>
                              <Label>User ID</Label>
                              <p className="mt-1 text-sm">{request.user_id}</p>
                            </div>
                            <div>
                              <Label>Subscription ID</Label>
                              <p className="mt-1 text-sm">{request.subscription_id}</p>
                            </div>
                            {request.booking_id && (
                              <div>
                                <Label>Booking ID</Label>
                                <p className="mt-1 text-sm">{request.booking_id}</p>
                              </div>
                            )}
                            <div>
                              <Label>Reason</Label>
                              <p className="mt-1 text-sm">{request.reason}</p>
                            </div>
                            <div>
                              <Label>Requested At</Label>
                              <p className="mt-1 text-sm">
                                {new Date(request.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        onClick={() => openReviewDialog(request, "approve")}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openReviewDialog(request, "reject")}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" ? "Approve" : "Reject"} Slot Restoration
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? "This will restore 1 slot to the user's subscription."
                  : "This will reject the slot restoration request."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Review Notes (Optional)</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes for this decision..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsReviewDialogOpen(false);
                    setSelectedRequest(null);
                    setReviewNotes("");
                    setActionType(null);
                  }}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReview}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className={
                    actionType === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {(approveMutation.isPending || rejectMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {actionType === "approve" ? "Approve" : "Reject"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
