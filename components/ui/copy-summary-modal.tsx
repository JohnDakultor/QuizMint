"use client";

import { CheckCircle2, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CopySummaryModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}) {
  const {
    open,
    onOpenChange,
    title = "Summary copied",
    description = "The summary is ready in your clipboard for email, notes, or reports.",
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-800">
          <div className="inline-flex items-center gap-2 font-medium">
            <Copy className="h-4 w-4" />
            Clipboard ready
          </div>
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
