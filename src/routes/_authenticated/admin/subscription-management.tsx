import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAllStudentSubscriptions,
  useAdjustStudentSlots,
  useStudentAdjustmentHistory,
  useStudentUsageLogs,
  useAdminDashboardStats,
  useExtendSubscriptionExpiry,
  useReplaceSubscriptionPlan,
} from "@/modules/admin/subscription-management/hooks/use-admin-subscription";
import {
  Crown,
  RefreshCw,
  Calendar,
  Zap,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Activity,
  Plus,
  Minus,
  Gift,
  Ban,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Settings,
} from "lucide-react";
import { useState } from "react";
import type { StudentSubscriptionInfo } from "@/types/subscription-management";

export const Route = createFileRoute("/_authenticated/admin/subscription-management")({
  component: AdminSubscriptionManagement,
});

type TabType = "overview" | "students" | "adjustments" | "logs";

function AdminSubscriptionManagement() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedStudent, setSelectedStudent] = useState<StudentSubscriptionInfo | null>(null);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  
  // Adjustment form state
  const [adjustAction, setAdjustAction] = useState<string>("");
  const [slotsChange, setSlotsChange] = useState<number>(0);
  const [bonusChange, setBonusChange] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [daysToExtend, setDaysToExtend] = useState<number>(0);
  const [newPlanId, setNewPlanId] = useState<string>("");

  // Queries
  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();
  const { data: students = [], isLoading: studentsLoading } = useAllStudentSubscriptions();
  const { data: adjustmentHistory = [] } = useStudentAdjustmentHistory(selectedStudent?.student_id || null);
  const { data: usageLogs = [] } = useStudentUsageLogs(selectedStudent?.student_id || null);
  const { data: allAdjustments = [] } = useQuery({
    queryKey: ["admin", "all-recent-adjustments"],
    queryFn: async () => {
      const { getAllRecentAdjustments } = await import("@/modules/admin/subscription-management/services/admin-subscription.service");
      return getAllRecentAdjustments(100);
    },
    staleTime: 1000 * 30,
  });

  // Mutations
  const adjustMutation = useAdjustStudentSlots();
  const extendMutation = useExtendSubscriptionExpiry();
  const replaceMutation = useReplaceSubscriptionPlan();

  const handleAdjustSlots = async () => {
    if (!selectedStudent || !adjustAction || !auth?.user?.id) return;

    try {
      if (adjustAction === "extend_expiry") {
        await extendMutation.mutateAsync({
          subscriptionId: selectedStudent.subscription_id,
          daysToAdd: daysToExtend,
          adminId: auth.user.id,
          reason: adjustReason,
        });
      } else if (adjustAction === "replace") {
        await replaceMutation.mutateAsync({
          subscriptionId: selectedStudent.subscription_id,
          newPlanId,
          adminId: auth.user.id,
          reason: adjustReason,
        });
      } else {
        await adjustMutation.mutateAsync({
          student_id: selectedStudent.student_id,
          subscription_id: selectedStudent.subscription_id,
          admin_id: auth.user.id,
          action: adjustAction as any,
          slots_change: slotsChange,
          bonus_change: bonusChange,
          reason: adjustReason,
        });
      }
      
      // Reset form
      setAdjustAction("");
      setSlotsChange(0);
      setBonusChange(0);
      setAdjustReason("");
      setDaysToExtend(0);
      setNewPlanId("");
      setIsAdjustDialogOpen(false);
      
      // Invalidate queries
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (error) {
      console.error("Adjustment failed:", error);
    }
  };

  const openAdjustDialog = (student: StudentSubscriptionInfo) => {
    setSelectedStudent(student);
    setIsAdjustDialogOpen(true);
  };

  const openHistoryDialog = (student: StudentSubscriptionInfo) => {
    setSelectedStudent(student);
    setIsHistoryDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      expired: "destructive",
      cancelled: "secondary",
      suspended: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      increase_slots: "Increase Slots",
      decrease_slots: "Decrease Slots",
      add_bonus: "Add Bonus",
      remove_bonus: "Remove Bonus",
      extend_expiry: "Extend Expiry",
      expire: "Expire",
      suspend: "Suspend",
      reactivate: "Reactivate",
      replace: "Replace Plan",
    };
    return labels[action] || action;
  };

  const getActionIcon = (action: string) => {
    if (action.includes("increase") || action.includes("add")) return <Plus className="h-4 w-4 text-green-600" />;
    if (action.includes("decrease") || action.includes("remove")) return <Minus className="h-4 w-4 text-red-600" />;
    if (action.includes("expire") || action.includes("suspend")) return <Ban className="h-4 w-4 text-red-600" />;
    if (action.includes("reactivate")) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (action.includes("extend")) return <Clock className="h-4 w-4 text-blue-600" />;
    if (action.includes("replace")) return <RefreshCw className="h-4 w-4 text-purple-600" />;
    return <Activity className="h-4 w-4" />;
  };

  if (statsLoading || studentsLoading) {
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
      <div className="mx-auto max-w-7xl space-y-6 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display">Subscription Management</h1>
          <p className="mt-1 text-muted-foreground">
            Manage student subscriptions, slots, and track all adjustments
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            onClick={() => setActiveTab("overview")}
          >
            <Activity className="mr-2 h-4 w-4" />
            Overview
          </Button>
          <Button
            variant={activeTab === "students" ? "default" : "ghost"}
            onClick={() => setActiveTab("students")}
          >
            <Users className="mr-2 h-4 w-4" />
            Students
          </Button>
          <Button
            variant={activeTab === "adjustments" ? "default" : "ghost"}
            onClick={() => setActiveTab("adjustments")}
          >
            <Settings className="mr-2 h-4 w-4" />
            All Adjustments
          </Button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                      <p className="mt-2 text-3xl font-bold">{stats?.totalActiveSubscriptions || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sessions Remaining</p>
                      <p className="mt-2 text-3xl font-bold text-green-600">
                        {stats?.totalSessionsRemaining || 0}
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-green-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Near Expiry (7 days)</p>
                      <p className="mt-2 text-3xl font-bold text-yellow-600">
                        {stats?.studentsNearExpiry || 0}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-yellow-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Zero Slots</p>
                      <p className="mt-2 text-3xl font-bold text-red-600">
                        {stats?.studentsWithZeroSlots || 0}
                      </p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Adjustments */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Slot Adjustments</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recentAdjustments && stats.recentAdjustments.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentAdjustments.slice(0, 10).map((adjustment: any) => (
                      <div
                        key={adjustment.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          {getActionIcon(adjustment.action)}
                        <div>
                            <p className="font-medium">{getActionLabel(adjustment.action)}</p>
                            <p className="text-sm text-muted-foreground">
                              {adjustment.old_remaining_slots} → {adjustment.new_remaining_slots} slots
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {new Date(adjustment.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{adjustment.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">No recent adjustments</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <Card>
            <CardHeader>
              <CardTitle>All Student Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {students.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Slots</TableHead>
                        <TableHead>Bonus</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.student_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{student.student_name}</p>
                              <p className="text-xs text-muted-foreground">{student.student_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-primary" />
                              {student.plan_name}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(student.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="font-medium">{student.remaining_slots}</span>
                              <span className="text-muted-foreground"> / {student.total_slots}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {student.bonus_slots > 0 ? (
                              <Badge variant="secondary">+{student.bonus_slots}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${student.available_slots === 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {student.available_slots}
                            </span>
                          </TableCell>
                          <TableCell>
                            {student.expires_at ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                {new Date(student.expires_at).toLocaleDateString()}
                                {student.days_until_expiry !== null && student.days_until_expiry <= 7 && (
                                  <Badge variant="destructive" className="ml-1 text-xs">
                                    {student.days_until_expiry}d
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openAdjustDialog(student)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openHistoryDialog(student)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No active subscriptions found</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Adjustments Tab */}
        {activeTab === "adjustments" && (
          <Card>
            <CardHeader>
              <CardTitle>All Recent Adjustments</CardTitle>
            </CardHeader>
            <CardContent>
              {allAdjustments.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Slots Change</TableHead>
                        <TableHead>Bonus Change</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allAdjustments.map((adjustment: any) => (
                        <TableRow key={adjustment.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(adjustment.action)}
                              {getActionLabel(adjustment.action)}
                            </div>
                          </TableCell>
                          <TableCell>{adjustment.student_id}</TableCell>
                          <TableCell>
                            <span className={adjustment.new_remaining_slots > adjustment.old_remaining_slots ? 'text-green-600' : 'text-red-600'}>
                              {adjustment.old_remaining_slots} → {adjustment.new_remaining_slots}
                            </span>
                          </TableCell>
                          <TableCell>
                            {adjustment.old_bonus_slots !== adjustment.new_bonus_slots ? (
                              <span className={adjustment.new_bonus_slots > adjustment.old_bonus_slots ? 'text-green-600' : 'text-red-600'}>
                                {adjustment.old_bonus_slots} → {adjustment.new_bonus_slots}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="max-w-xs truncate text-sm">{adjustment.reason}</p>
                          </TableCell>
                          <TableCell>
                            {new Date(adjustment.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No adjustments found</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Adjust Dialog */}
        <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adjust Subscription Slots</DialogTitle>
              <DialogDescription>
                {selectedStudent?.student_name} - {selectedStudent?.plan_name}
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                {/* Current Status */}
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-medium">Current Status</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Remaining Slots:</span>
                      <span className="ml-2 font-medium">{selectedStudent.remaining_slots}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bonus Slots:</span>
                      <span className="ml-2 font-medium">{selectedStudent.bonus_slots}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Available:</span>
                      <span className="ml-2 font-medium">{selectedStudent.available_slots}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className="ml-2">{getStatusBadge(selectedStudent.status)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Selection */}
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={adjustAction} onValueChange={setAdjustAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase_slots">Increase Slots</SelectItem>
                      <SelectItem value="decrease_slots">Decrease Slots</SelectItem>
                      <SelectItem value="add_bonus">Add Bonus Sessions</SelectItem>
                      <SelectItem value="remove_bonus">Remove Bonus Sessions</SelectItem>
                      <SelectItem value="extend_expiry">Extend Expiry</SelectItem>
                      <SelectItem value="expire">Expire Subscription</SelectItem>
                      <SelectItem value="suspend">Suspend Subscription</SelectItem>
                      <SelectItem value="reactivate">Reactivate Subscription</SelectItem>
                      <SelectItem value="replace">Replace Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional Fields */}
                {(adjustAction === "increase_slots" || adjustAction === "decrease_slots") && (
                  <div className="space-y-2">
                    <Label>Number of Slots</Label>
                    <Input
                      type="number"
                      min="1"
                      value={slotsChange}
                      onChange={(e) => setSlotsChange(parseInt(e.target.value) || 0)}
                    />
                  </div>
                )}

                {(adjustAction === "add_bonus" || adjustAction === "remove_bonus") && (
                  <div className="space-y-2">
                    <Label>Number of Bonus Sessions</Label>
                    <Input
                      type="number"
                      min="1"
                      value={bonusChange}
                      onChange={(e) => setBonusChange(parseInt(e.target.value) || 0)}
                    />
                  </div>
                )}

                {adjustAction === "extend_expiry" && (
                  <div className="space-y-2">
                    <Label>Days to Extend</Label>
                    <Input
                      type="number"
                      min="1"
                      value={daysToExtend}
                      onChange={(e) => setDaysToExtend(parseInt(e.target.value) || 0)}
                    />
                  </div>
                )}

                {adjustAction === "replace" && (
                  <div className="space-y-2">
                    <Label>New Plan</Label>
                    <Select value={newPlanId} onValueChange={setNewPlanId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* This would be populated with actual plans */}
                        <SelectItem value="placeholder">Load plans...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Reason */}
                <div className="space-y-2">
                  <Label>Reason (Required)</Label>
                  <Textarea
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Enter reason for this adjustment..."
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAdjustDialogOpen(false)}
                    disabled={adjustMutation.isPending || extendMutation.isPending || replaceMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdjustSlots}
                    disabled={!adjustAction || !adjustReason || adjustMutation.isPending || extendMutation.isPending || replaceMutation.isPending}
                  >
                    {(adjustMutation.isPending || extendMutation.isPending || replaceMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Apply Adjustment
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedStudent?.student_name} - Adjustment & Usage History
              </DialogTitle>
              <DialogDescription>
                Complete history of slot adjustments and usage
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-6">
                {/* Adjustment History */}
                <div>
                  <h3 className="font-medium mb-3">Adjustment History</h3>
                  {adjustmentHistory.length > 0 ? (
                    <div className="space-y-2">
                      {adjustmentHistory.map((adjustment) => (
                        <div
                          key={adjustment.id}
                          className="flex items-start justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-start gap-3">
                            {getActionIcon(adjustment.action)}
                            <div>
                              <p className="font-medium">{getActionLabel(adjustment.action)}</p>
                              <p className="text-sm text-muted-foreground">
                                {adjustment.old_remaining_slots} → {adjustment.new_remaining_slots} slots
                                {adjustment.old_bonus_slots !== adjustment.new_bonus_slots && (
                                  <span> | Bonus: {adjustment.old_bonus_slots} → {adjustment.new_bonus_slots}</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{adjustment.reason}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(adjustment.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-muted-foreground">No adjustments</p>
                  )}
                </div>

                {/* Usage Logs */}
                <div>
                  <h3 className="font-medium mb-3">Usage Logs</h3>
                  {usageLogs.length > 0 ? (
                    <div className="space-y-2">
                      {usageLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-muted-foreground">
                              {log.old_remaining_slots} → {log.new_remaining_slots} remaining
                              {log.slots_consumed !== 0 && (
                                <span className={log.slots_consumed > 0 ? 'text-red-600' : 'text-green-600'}>
                                  {' '}({log.slots_consumed > 0 ? '-' : '+'}{Math.abs(log.slots_consumed)})
                                </span>
                              )}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-muted-foreground">No usage logs</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}