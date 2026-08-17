import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

export interface ConfirmAction {
  label: string;
  description: string;
  destructive?: boolean;
  icon?: React.ElementType;
}

export function StatusConfirmDialog({
  action,
  onConfirm,
  children,
}: {
  action: ConfirmAction;
  onConfirm: (notes?: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    onConfirm(notes.trim() || undefined);
    setOpen(false);
    setNotes("");
  };

  const Icon = action.icon;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle className="flex items-center gap-2">
          {Icon ? <Icon className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          {action.label}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {action.description}
          <Textarea
            placeholder="Add a note for the audit log (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-3"
            rows={3}
          />
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              action.destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {action.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
