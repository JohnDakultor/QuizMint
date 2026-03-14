"use client";

import { Button } from "@/components/ui/button";

export function QuizShareModal(props: {
  open: boolean;
  shareLoading: boolean;
  shareTimerMinutes: number;
  setShareTimerMinutes: (value: number) => void;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const {
    open,
    shareLoading,
    shareTimerMinutes,
    setShareTimerMinutes,
    canSubmit,
    onClose,
    onSubmit,
  } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold">Share Quiz To Students</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Set how long this quiz link stays available.
        </p>
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">Timer (minutes)</label>
          <input
            type="number"
            min={5}
            max={1440}
            value={shareTimerMinutes}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next)) return;
              setShareTimerMinutes(Math.min(1440, Math.max(5, Math.floor(next))));
            }}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={shareLoading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={shareLoading || !canSubmit}>
            {shareLoading ? "Creating..." : "Create Share Link"}
          </Button>
        </div>
      </div>
    </div>
  );
}

