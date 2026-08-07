import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Crown, RefreshCw, Calendar, Zap, AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface SubscriptionSlotCardProps {
  planName: string;
  totalSlots: number;
  usedSlots: number;
  currentSlots: number;
  expiresAt: string | null;
  status: string;
  onRenew?: () => void;
}

export function SubscriptionSlotCard({
  planName,
  totalSlots,
  usedSlots,
  currentSlots,
  expiresAt,
  status,
  onRenew,
}: SubscriptionSlotCardProps) {
  const usagePercentage = totalSlots > 0 ? (usedSlots / totalSlots) * 100 : 0;
  const remainingPercentage = 100 - usagePercentage;

  const getStatusColor = () => {
    if (status !== "active") return "text-gray-500";
    if (currentSlots === 0) return "text-red-500";
    if (currentSlots <= 3) return "text-yellow-500";
    return "text-green-500";
  };

  const getCapacityIndicator = () => {
    if (status !== "active") {
      return { label: "Inactive", color: "bg-gray-500", textColor: "text-gray-500" };
    }
    if (currentSlots === 0) {
      return { label: "Fully Booked", color: "bg-red-500", textColor: "text-red-500" };
    }
    if (currentSlots <= 3) {
      return {
        label: `${currentSlots} Slot${currentSlots > 1 ? "s" : ""} Left`,
        color: "bg-yellow-500",
        textColor: "text-yellow-500",
      };
    }
    return {
      label: `${currentSlots} Slots Available`,
      color: "bg-green-500",
      textColor: "text-green-500",
    };
  };

  const capacity = getCapacityIndicator();

  return (
    <Card className="overflow-hidden border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">{planName}</CardTitle>
          </div>
          <Badge variant={status === "active" ? "default" : "secondary"}>{status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Capacity Indicator */}
        <div className={`flex items-center gap-2 rounded-lg border p-3 ${capacity.textColor}`}>
          <div className={`h-3 w-3 rounded-full ${capacity.color} animate-pulse`} />
          <span className="font-semibold">{capacity.label}</span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Slot Usage</span>
            <span className="font-medium">
              {usedSlots} / {totalSlots}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{remainingPercentage.toFixed(0)}% remaining</span>
            <span>{currentSlots} left</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{totalSlots}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Used</div>
            <div className="text-2xl font-bold text-orange-600">{usedSlots}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className={`text-2xl font-bold ${getStatusColor()}`}>{currentSlots}</div>
          </div>
        </div>

        {/* Expiry Date */}
        {expiresAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Expires: {new Date(expiresAt).toLocaleDateString()}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {status === "active" && currentSlots > 0 ? (
            <Button asChild className="flex-1">
              <Link to="/student/sessions">
                <Zap className="mr-2 h-4 w-4" />
                Book Session
              </Link>
            </Button>
          ) : status === "active" && currentSlots === 0 ? (
            <Button onClick={onRenew} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Renew Plan
            </Button>
          ) : (
            <Button asChild className="flex-1">
              <Link to="/student/pricing">
                <Crown className="mr-2 h-4 w-4" />
                View Plans
              </Link>
            </Button>
          )}
        </div>

        {/* Warning for low slots */}
        {currentSlots > 0 && currentSlots <= 3 && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm">
            <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-yellow-800">
              You're running low on slots. Consider renewing your plan to continue learning.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
