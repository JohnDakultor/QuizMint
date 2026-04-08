"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import SkeletonLoading from "@/components/ui/skeleton-loading";
import { SourceIcon, SourceIcons } from "@/components/source-icons";
import {
  ClipboardList,
  Copy,
  Gamepad2,
  Globe,
  GraduationCap,
  Link2,
  X,
} from "lucide-react";
import { inferQuizQuestionType } from "@/lib/quiz-question-types";

function cleanAnswer(value: unknown) {
  return String(value || "")
    .replace(/\n?__QMETA_V1__[A-Za-z0-9+/=]+$/g, "")
    .trim();
}

export function QuizOutputCard(props: {
  loading: boolean;
  quiz: any | null;
  sources: SourceIcon[];
  lastLoaded: boolean;
  shareOpen: boolean | null;
  shareExpiresAt: string | null;
  shareAssessmentDurationMinutes: number | null;
  shareShuffleActive: boolean;
  shareLoading: boolean;
  assignLoading: boolean;
  onClearQuiz: () => void;
  onCopy: () => void;
  onOpenShareModal: () => void;
  onOpenAssignModal: () => void;
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
    shareAssessmentDurationMinutes,
    shareShuffleActive,
    shareLoading,
    assignLoading,
    onClearQuiz,
    onCopy,
    onOpenShareModal,
    onOpenAssignModal,
    onDownloadPDF,
    onDownloadWord,
    onDownloadPPT,
  } = props;

  return (
    <Card
      id="quiz-output"
      className="h-137.5 w-full overflow-hidden border border-indigo-200/80 bg-linear-to-b from-white to-indigo-50/40 shadow-[0_24px_60px_-24px_rgba(30,64,175,0.45)] lg:flex-1 flex flex-col dark:border-indigo-400/25 dark:from-slate-950/80 dark:to-indigo-950/45 dark:shadow-[0_24px_60px_-24px_rgba(30,64,175,0.75)]"
    >
      <div className="bg-linear-to-r from-blue-600 to-purple-600 p-4 relative">
        <h2 className="w-full text-xl font-bold text-white inline-flex items-center justify-center gap-2 text-center">
          <ClipboardList className="h-5 w-5" />
          Generated Quiz
        </h2>

        {lastLoaded && (
          <div className="mt-1 text-xs text-emerald-100">Showing last generated quiz</div>
        )}

        {quiz && (
          <button
            onClick={onClearQuiz}
            className="absolute right-4 top-4 text-white/80 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <CardHeader className="relative pb-3">
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            id="quiz-copy-output"
            size="sm"
            variant="outline"
            onClick={onCopy}
            className="border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-slate-500/70 dark:bg-slate-900/55 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Copy className="w-4 h-4 mr-1" /> Copy
          </Button>
          <Button
            id="quiz-share-students"
            size="sm"
            variant="outline"
            onClick={onOpenShareModal}
            disabled={shareLoading || !quiz}
            className="border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-slate-500/70 dark:bg-slate-900/55 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Link2 className="w-4 h-4 mr-1" />
            Share To Students
          </Button>
          <Button
            id="quiz-assign-class"
            size="sm"
            variant="outline"
            onClick={onOpenAssignModal}
            disabled={assignLoading || !quiz}
            className="border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-slate-500/70 dark:bg-slate-900/55 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <GraduationCap className="w-4 h-4 mr-1" />
            Assign To Class
          </Button>
          <Button
            id="quiz-download-pdf"
            size="sm"
            onClick={onDownloadPDF}
            className="bg-rose-600 text-white hover:bg-rose-700"
          >
            PDF
          </Button>
          <Button
            id="quiz-download-word"
            size="sm"
            onClick={onDownloadWord}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Word
          </Button>
          <Button
            id="quiz-download-ppt"
            size="sm"
            onClick={onDownloadPPT}
            className="bg-amber-500 text-slate-950 hover:bg-amber-400"
          >
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
            <div
              key={i}
              className="rounded-lg border border-zinc-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/55"
            >
              {(() => {
                const questionType = inferQuizQuestionType(
                  String(q?.question || ""),
                  Array.isArray(q?.options) ? q.options : []
                );
                const typeLabel =
                  questionType === "true_false"
                    ? "True/False"
                    : questionType === "fill_blank"
                    ? "Fill Blank"
                    : questionType === "short_answer"
                    ? "Short Answer"
                    : questionType === "essay_rubric"
                    ? "Essay Rubric"
                    : questionType === "matching"
                    ? "Matching"
                    : questionType === "worksheet"
                    ? "Worksheet"
                    : questionType === "gamified"
                    ? "Gamified"
                    : "MCQ";
                return (
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600 dark:border-slate-600 dark:text-slate-300">
                      {questionType === "gamified" && <Gamepad2 className="h-3 w-3" />}
                      {typeLabel}
                    </span>
                  </div>
                );
              })()}
              <p className="font-semibold mb-2">
                {i + 1}. {q.question}
              </p>
              <ul className="ml-4 list-disc space-y-1">
                {(Array.isArray(q.options) ? q.options : []).map((opt: string, j: number) => (
                  <li key={j}>{opt}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-green-600">
                Answer: <strong>{cleanAnswer(q.answer)}</strong>
              </p>
              {q.explanation && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-slate-300">
                  Explanation: {q.explanation}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="mt-20 text-center text-zinc-400 dark:text-slate-400">
            Your generated quiz will appear here
          </p>
        )}
      </CardContent>

      {quiz && (
        <div className="shrink-0 border-t border-zinc-200 bg-zinc-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/70">
          <details
            id="quiz-references"
            className="rounded-md border border-cyan-300/60 bg-white p-2 shadow-[0_0_0_1px_rgba(34,211,238,0.15)] dark:border-cyan-400/35 dark:bg-slate-950/70"
          >
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200">
              <Globe className="h-3.5 w-3.5" />
              References ({sources.length})
            </summary>
            <div className="mt-2 overflow-x-auto overflow-y-hidden premium-scrollbar">
              {sources.length > 0 ? (
                <SourceIcons sources={sources} variant="pills" />
              ) : (
                <div className="text-xs text-zinc-600 dark:text-slate-300">
                  No website reference detected for this quiz.
                </div>
              )}
            </div>
          </details>
          <div className="mt-2 text-xs text-zinc-600 dark:text-slate-300">
            Student Access:{" "}
            <span className={shareOpen === false ? "text-rose-400" : "text-emerald-400"}>
              {shareOpen === false ? "Closed" : "Open"}
            </span>
            {shareExpiresAt ? ` • Ends at ${new Date(shareExpiresAt).toLocaleString()}` : ""}
            {shareAssessmentDurationMinutes
              ? ` • Countdown ${shareAssessmentDurationMinutes} min`
              : ""}
            {shareShuffleActive ? (
              <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                Shuffle: ON
              </span>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
}
