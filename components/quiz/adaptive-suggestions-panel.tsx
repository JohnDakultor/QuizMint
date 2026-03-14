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
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium text-indigo-900">Adaptive Suggestions</div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-indigo-700 hover:text-indigo-900"
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
              className="rounded-full border border-indigo-300 bg-white px-3 py-1 text-left text-xs text-indigo-800 hover:bg-indigo-100"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-indigo-700">
          Generate a few quizzes first to unlock personalized prompt suggestions.
        </div>
      )}
    </div>
  );
}

