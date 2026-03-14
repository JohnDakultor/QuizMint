"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import SkeletonLoading from "@/components/ui/skeleton-loading";
import { SourceIcon, SourceIcons } from "@/components/source-icons";
import { ClipboardList, Copy, Globe, Link2, X } from "lucide-react";

export function QuizOutputCard(props: {
  loading: boolean;
  quiz: any | null;
  sources: SourceIcon[];
  lastLoaded: boolean;
  shareOpen: boolean | null;
  shareExpiresAt: string | null;
  shareLoading: boolean;
  onClearQuiz: () => void;
  onCopy: () => void;
  onOpenShareModal: () => void;
  onDownloadPDF: () => void;
  onDownloadWord: () => void;
  onDownloadPPT: () => void;
}) {
  const {
    loading,
    quiz,
    sources,
    lastLoaded,
    shareOpen,
    shareExpiresAt,
    shareLoading,
    onClearQuiz,
    onCopy,
    onOpenShareModal,
    onDownloadPDF,
    onDownloadWord,
    onDownloadPPT,
  } = props;

  return (
    <Card
      id="quiz-output"
      className="shadow-xl border-2 border-gray-200 overflow-hidden w-full lg:flex-1 h-137.5 flex flex-col"
    >
      <div className="bg-linear-to-r from-blue-600 to-purple-600 p-4 relative">
        <h2 className="w-full text-xl font-bold text-white inline-flex items-center justify-center gap-2 text-center">
          <ClipboardList className="h-5 w-5" />
          Generated Quiz
        </h2>

        {lastLoaded && <div className="mt-1 text-xs text-emerald-100">Showing last generated quiz</div>}

        {quiz && (
          <button onClick={onClearQuiz} className="absolute right-4 top-4 text-white/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <CardHeader className="relative pb-3">
        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={onCopy}>
            <Copy className="w-4 h-4 mr-1" /> Copy
          </Button>
          <Button
            id="quiz-share-students"
            size="sm"
            variant="outline"
            onClick={onOpenShareModal}
            disabled={shareLoading || !quiz}
          >
            <Link2 className="w-4 h-4 mr-1" />
            Share To Students
          </Button>
          <Button size="sm" onClick={onDownloadPDF}>
            PDF
          </Button>
          <Button size="sm" onClick={onDownloadWord}>
            Word
          </Button>
          <Button size="sm" onClick={onDownloadPPT}>
            PPT
          </Button>
        </div>
      </CardHeader>

      <CardContent className="premium-scrollbar flex-1 min-h-0 overflow-y-auto space-y-4 pr-2">
        {loading ? (
          <div className="space-y-3 pt-2">
            <SkeletonLoading className="h-24 w-full" />
            <SkeletonLoading className="h-24 w-full" />
            <SkeletonLoading className="h-24 w-full" />
          </div>
        ) : quiz ? (
          quiz.questions.map((q: any, i: number) => (
            <div key={i} className="p-4 rounded-lg border bg-white dark:bg-zinc-900">
              <p className="font-semibold mb-2">
                {i + 1}. {q.question}
              </p>
              <ul className="ml-4 list-disc space-y-1">
                {q.options.map((opt: string, j: number) => (
                  <li key={j}>{opt}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-green-600">
                Answer: <strong>{q.answer}</strong>
              </p>
              {q.explanation && <p className="mt-1 text-sm text-zinc-500">Explanation: {q.explanation}</p>}
            </div>
          ))
        ) : (
          <p className="text-zinc-400 text-center mt-20">Your generated quiz will appear here</p>
        )}
      </CardContent>

      {quiz && (
        <div className="shrink-0 border-t bg-zinc-50/70 p-3">
          <details className="rounded-md border border-zinc-200 bg-zinc-50 p-2">
            <summary className="cursor-pointer list-none text-xs font-medium text-zinc-600 inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              References ({sources.length})
            </summary>
            <div className="mt-2 max-h-24 overflow-y-auto premium-scrollbar pr-1">
              {sources.length > 0 ? (
                <SourceIcons sources={sources} variant="pills" />
              ) : (
                <div className="text-xs text-zinc-500">No website reference detected for this quiz.</div>
              )}
            </div>
          </details>
          <div className="mt-2 text-xs text-zinc-600">
            Student Access:{" "}
            <span className={shareOpen === false ? "text-red-600" : "text-green-700"}>
              {shareOpen === false ? "Closed" : "Open"}
            </span>
            {shareExpiresAt ? ` • Ends at ${new Date(shareExpiresAt).toLocaleString()}` : ""}
          </div>
        </div>
      )}
    </Card>
  );
}
