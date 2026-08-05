import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Lock } from "lucide-react";

interface PaymentSummaryProps {
  baseAmount: number;
  taxAmount: number;
  finalAmount: number;
  description?: string;
  items?: Array<{
    label: string;
    value: string;
  }>;
}

export function PaymentSummary({
  baseAmount,
  taxAmount,
  finalAmount,
  description,
  items,
}: PaymentSummaryProps) {
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {description && (
          <div className="rounded-lg bg-primary/5 p-3 text-sm">
            {description}
          </div>
        )}

        {items && items.length > 0 && (
          <div className="space-y-2 text-sm">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
            <Separator className="my-2" />
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">₹{baseAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax (18% GST)</span>
            <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
          </div>

          <Separator className="my-3" />

          <div className="flex justify-between">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold text-primary">
              ₹{finalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-4">
          <div className="flex items-center gap-2 text-xs text-green-600">
            <ShieldCheck className="h-4 w-4" />
            <span>100% money-back guarantee if not satisfied</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Secure payment • SSL encrypted</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
