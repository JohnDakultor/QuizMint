"use client";

import LiteModeBadge from "@/components/ui/lite-mode-badge";
import { BrainCircuit } from "lucide-react";

type FreeQuizPointsInfo = {
  remainingPoints: number;
  maxPoints: number;
  nextRechargeAt?: string | null;
} | null;

type QuizPageHeaderProps = {
  isPremiumAdaptiveEnabled: boolean;
  onToggleAdaptive: () => void;
  freeQuizPointsInfo?: FreeQuizPointsInfo;
  isFreePlan?: boolean;
};

export function QuizPageHeader({
  isPremiumAdaptiveEnabled,
  onToggleAdaptive,
  freeQuizPointsInfo,
  isFreePlan = false,
}: QuizPageHeaderProps) {
  return (
    <div className="relative text-center pt-10 sm:pt-0">
      <div className="absolute left-0 top-0 flex flex-wrap items-center justify-start gap-2">
        {isFreePlan && freeQuizPointsInfo ? (
          <div className="group relative overflow-hidden rounded-full border border-cyan-300/60 bg-linear-to-r from-slate-950 via-sky-950 to-cyan-900 px-3 py-1.5 text-left shadow-[0_14px_30px_-22px_rgba(8,145,178,0.9)] ring-1 ring-white/10 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.14),transparent_35%)]" />
            <div className="relative flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/85">
                Credits:
              </span>
              <span className="text-sm font-black text-white">
                {freeQuizPointsInfo.remainingPoints}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="absolute right-0 top-0 flex flex-wrap items-center justify-end gap-2">
        {isPremiumAdaptiveEnabled && (
          <button
            id="quiz-adaptive-toggle"
            type="button"
            onClick={onToggleAdaptive}
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100 dark:border-indigo-400/40 dark:bg-indigo-500/20 dark:text-indigo-100 dark:hover:bg-indigo-500/30"
            title="Adaptive suggestions"
          >
            <BrainCircuit className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Adaptive</span>
          </button>
        )}
        <div id="quiz-litemode-badge">
          <LiteModeBadge />
        </div>
      </div>
      <h1 className="mb-2 bg-linear-to-r from-blue-500 via-indigo-400 to-fuchsia-400 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
        Quiz Generator
      </h1>
      <p className="mx-auto max-w-3xl text-lg text-slate-600 dark:text-slate-300">
        Generate structured quizzes from prompt, links, or uploaded content with shareable templates.
      </p>
    </div>
  );
}

