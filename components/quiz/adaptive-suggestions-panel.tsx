"use client";

type AdaptiveSuggestionsPanelProps = {
  visible: boolean;
  suggestions: string[];
  onClose: () => void;
  onApply: (suggestion: string) => void;
};

export function AdaptiveSuggestionsPanel({
  visible,
  suggestions,
  onClose,
  onApply,
}: AdaptiveSuggestionsPanelProps) {
  if (!visible) return null;

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-500/40 dark:bg-indigo-950/35">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium text-indigo-900 dark:text-indigo-100">Adaptive Suggestions</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1.5 py-0.5 text-xs text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-900/50 dark:hover:text-white"
        >
          Close
        </button>
      </div>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.slice(0, 6).map((suggestion, index) => (
            <button
              key={`${index}-${suggestion}`}
              type="button"
              onClick={() => onApply(suggestion)}
              className="rounded-full border border-indigo-300 bg-white px-3 py-1 text-left text-xs font-medium text-indigo-800 hover:bg-indigo-100 dark:border-indigo-400/40 dark:bg-slate-900 dark:text-indigo-100 dark:hover:bg-indigo-900/40"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-indigo-700 dark:text-indigo-200">
          Generate a few quizzes first to unlock personalized prompt suggestions.
        </div>
      )}
    </div>
  );
}

