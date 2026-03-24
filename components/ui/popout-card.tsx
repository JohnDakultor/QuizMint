"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type PopoutVariant = "success" | "error" | "info";

type PopoutCardProps = {
  open: boolean;
  title: string;
  message?: string;
  variant?: PopoutVariant;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
};

function getVariantClasses(variant: PopoutVariant) {
  if (variant === "success") {
    return {
      shell:
        "border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 dark:border-emerald-700/40 dark:from-emerald-950/70 dark:to-cyan-950/60",
      icon: "text-emerald-600 dark:text-emerald-300",
      title: "text-emerald-900 dark:text-emerald-100",
      msg: "text-emerald-800 dark:text-emerald-200",
    };
  }
  if (variant === "error") {
    return {
      shell:
        "border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 dark:border-rose-700/40 dark:from-rose-950/70 dark:to-orange-950/60",
      icon: "text-rose-600 dark:text-rose-300",
      title: "text-rose-900 dark:text-rose-100",
      msg: "text-rose-800 dark:text-rose-200",
    };
  }
  return {
    shell:
      "border-indigo-200 bg-gradient-to-r from-indigo-50 to-cyan-50 dark:border-indigo-700/40 dark:from-indigo-950/70 dark:to-cyan-950/60",
    icon: "text-indigo-600 dark:text-indigo-300",
    title: "text-indigo-900 dark:text-indigo-100",
    msg: "text-indigo-800 dark:text-indigo-200",
  };
}

function VariantIcon({ variant }: { variant: PopoutVariant }) {
  if (variant === "success") return <CheckCircle2 className="h-5 w-5" />;
  if (variant === "error") return <AlertTriangle className="h-5 w-5" />;
  return <Info className="h-5 w-5" />;
}

export function PopoutCard({
  open,
  title,
  message,
  variant = "info",
  durationMs = 2600,
  actionLabel,
  onAction,
  onClose,
}: PopoutCardProps) {
  useEffect(() => {
    if (!open || durationMs <= 0) return;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [open, durationMs, onClose]);

  const cls = getVariantClasses(variant);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="fixed right-4 top-4 z-120 w-[min(92vw,420px)]"
        >
          <div className={`rounded-xl border p-4 shadow-xl ${cls.shell}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${cls.icon}`}>
                <VariantIcon variant={variant} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${cls.title}`}>{title}</p>
                {message ? <p className={`mt-1 text-sm ${cls.msg}`}>{message}</p> : null}
                {actionLabel && onAction ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3 h-8 border-zinc-300 bg-white/80 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                    onClick={onAction}
                  >
                    {actionLabel}
                  </Button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-zinc-500 hover:bg-white/70 hover:text-zinc-700 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
