"use client";

import { Button } from "@/components/ui/button";

export function QuizShareModal(props: {
  open: boolean;
  mode?: "quiz" | "assignment";
  assignmentClassName?: string | null;
  shareLoading: boolean;
  shareTimerMinutes: number;
  setShareTimerMinutes: (value: number) => void;
  timedAssessmentEnabled: boolean;
  setTimedAssessmentEnabled: (value: boolean) => void;
  assessmentTimerMinutes: number;
  setAssessmentTimerMinutes: (value: number) => void;
  shareShuffleQuestions: boolean;
  setShareShuffleQuestions: (value: boolean) => void;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const {
    open,
    mode = "quiz",
    assignmentClassName,
    shareLoading,
    shareTimerMinutes,
    setShareTimerMinutes,
    timedAssessmentEnabled,
    setTimedAssessmentEnabled,
    assessmentTimerMinutes,
    setAssessmentTimerMinutes,
    shareShuffleQuestions,
    setShareShuffleQuestions,
    canSubmit,
    onClose,
    onSubmit,
  } = props;

  if (!open) return null;

  const isAssignmentMode = mode === "assignment";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_80px_-32px_rgba(2,6,23,0.95)]">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {isAssignmentMode ? "Share Assignment To Students" : "Share Quiz To Students"}
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-slate-300">
          {isAssignmentMode
            ? `Create a dedicated classroom assignment link${assignmentClassName ? ` for ${assignmentClassName}` : ""}.`
            : "Set when the shared link expires and optionally add a real countdown once a student starts."}
        </p>
        {!isAssignmentMode ? (
          <>
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Link Expiry (minutes)
              </label>
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
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Students can open the shared link only until this access window ends.
              </p>
            </div>
            <div className="mt-3 rounded-md border border-indigo-200 bg-indigo-50/70 px-3 py-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
              <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-100">
                <input
                  type="checkbox"
                  checked={timedAssessmentEnabled}
                  onChange={(e) => setTimedAssessmentEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-900 dark:text-cyan-400 dark:focus:ring-cyan-500"
                />
                <span className="font-medium">Enable timed assessment countdown</span>
              </label>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                When enabled, each student gets a real countdown once they press start.
              </p>
              {timedAssessmentEnabled ? (
                <div className="mt-3 space-y-2">
                  <label className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    Assessment Countdown (minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={assessmentTimerMinutes}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) return;
                      setAssessmentTimerMinutes(
                        Math.min(1440, Math.max(5, Math.floor(next)))
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-900/50"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Time starts only when a student begins the quiz, not when the link is created.
                  </p>
                </div>
              ) : null}
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
          </>
        ) : (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
            This link will use the assignment schedule you set when you assigned the quiz. Student submissions will be tracked against the class assignment automatically.
          </div>
        )}
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
            {shareLoading ? "Creating..." : isAssignmentMode ? "Create Assignment Link" : "Create Share Link"}
          </Button>
        </div>
      </div>
    </div>
  );
}

