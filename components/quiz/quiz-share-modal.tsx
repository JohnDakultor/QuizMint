"use client";

import { Button } from "@/components/ui/button";

export function QuizShareModal(props: {
  open: boolean;
  shareLoading: boolean;
  shareTimerMinutes: number;
  setShareTimerMinutes: (value: number) => void;
  shareShuffleQuestions: boolean;
  setShareShuffleQuestions: (value: boolean) => void;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const {
    open,
    shareLoading,
    shareTimerMinutes,
    setShareTimerMinutes,
    shareShuffleQuestions,
    setShareShuffleQuestions,
    canSubmit,
    onClose,
    onSubmit,
  } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_80px_-32px_rgba(2,6,23,0.95)]">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Share Quiz To Students</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-slate-300">
          Set how long this quiz link stays available.
        </p>
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-slate-800 dark:text-slate-100">Timer (minutes)</label>
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
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-900/50"
          />
        </div>
        <label className="mt-3 flex items-center gap-2 rounded-md border border-slate-200 bg-zinc-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          <input
            type="checkbox"
            checked={shareShuffleQuestions}
            onChange={(e) => setShareShuffleQuestions(e.target.checked)}
            className="h-4 w-4 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-900 dark:text-cyan-400 dark:focus:ring-cyan-500"
          />
          <span className="font-medium">Shuffle questions/options per student</span>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={shareLoading}
            className="dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={shareLoading || !canSubmit}
            className="bg-white text-slate-900 hover:bg-slate-100 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {shareLoading ? "Creating..." : "Create Share Link"}
          </Button>
        </div>
      </div>
    </div>
  );
}

