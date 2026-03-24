"use client";

import LiteModeBadge from "@/components/ui/lite-mode-badge";
import { BrainCircuit } from "lucide-react";

type QuizPageHeaderProps = {
  isPremiumAdaptiveEnabled: boolean;
  onToggleAdaptive: () => void;
};

export function QuizPageHeader({ isPremiumAdaptiveEnabled, onToggleAdaptive }: QuizPageHeaderProps) {
  return (
    <div className="relative text-center pt-10 sm:pt-0">
      <div className="absolute right-0 top-0 flex items-center gap-2">
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

