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
            type="button"
            onClick={onToggleAdaptive}
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-100"
            title="Adaptive suggestions"
          >
            <BrainCircuit className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Adaptive</span>
          </button>
        )}
        <LiteModeBadge />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
        Quiz Generator
      </h1>
      <p className="text-gray-600 text-lg max-w-3xl mx-auto">
        Generate structured quizzes from prompt, links, or uploaded content with shareable templates.
      </p>
    </div>
  );
}

