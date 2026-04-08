"use client";

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingProgress from "@/components/ui/loading-progress";
import { LESSON_PLAN_PPTX_EXPORT_PROGRESS } from "@/lib/loading-stage-labels";
import { SourceIcons, type SourceIcon } from "@/components/source-icons";
import { CalendarPlus, Lightbulb, Trash2 } from "lucide-react";
import { LessonPlanExportControls } from "./export-controls";

type UsageInfo = {
  remainingPoints?: number;
  maxPoints?: number;
  requiredPoints?: number;
  nextRechargeAt?: string | null;
};

type PendingExportJob = {
  jobId: string;
  format: "docx" | "pdf" | "pptx";
  topic: string;
  createdAt: number;
  status?: "queued" | "processing" | "completed" | "failed";
  stageLabel?: string | null;
  progress?: number | null;
  canRetry?: boolean;
};

type LessonSourceTrace = {
  mode: "documents" | "semantic_cache" | "none";
  fromCache: boolean;
  sourceCount: number;
} | null;

type LessonPlanOutputPanelProps = {
  lessonPlan: any;
  lessonPlanRef: React.RefObject<HTMLDivElement | null>;
  lessonSources: SourceIcon[];
  lessonSourceTrace: LessonSourceTrace;
  downloadingPdf: boolean;
  downloadingDocx: boolean;
  downloadingPptx: boolean;
  loadingSlides: boolean;
  slidesLoadingLabel: string;
  slidesProgress: number;
  pptxProgress: number;
  isPremium: boolean;
  isFree: boolean;
  usageInfo: UsageInfo | null;
  pendingExportJobs: PendingExportJob[];
  retryingPendingExport: boolean;
  onDownloadPdf: () => void;
  onDownloadDocx: () => void;
  onRetryPendingExport: () => void;
  onLoadPptxSlidesForEdit: () => void;
  onAssignToClass: () => void;
  onDeleteLessonPlan: () => void;
  canAssignToClass: boolean;
  canDeleteLessonPlan: boolean;
  deletingLessonPlan: boolean;
  renderUsageIndicator: (usage: UsageInfo | null) => ReactNode;
  children: ReactNode;
};

export function LessonPlanOutputPanel({
  lessonPlan,
  lessonPlanRef,
  lessonSources,
  lessonSourceTrace,
  downloadingPdf,
  downloadingDocx,
  downloadingPptx,
  loadingSlides,
  slidesLoadingLabel,
  slidesProgress,
  pptxProgress,
  isPremium,
  isFree,
  usageInfo,
  pendingExportJobs,
  retryingPendingExport,
  onDownloadPdf,
  onDownloadDocx,
  onRetryPendingExport,
  onLoadPptxSlidesForEdit,
  onAssignToClass,
  onDeleteLessonPlan,
  canAssignToClass,
  canDeleteLessonPlan,
  deletingLessonPlan,
  renderUsageIndicator,
  children,
}: LessonPlanOutputPanelProps) {
  const latestPendingExport = pendingExportJobs[0] ?? null;
  return (
    <div id="lessonplan-print-root" ref={lessonPlanRef} className="bg-white dark:bg-slate-950">
      <Card className="shadow-[0_22px_60px_-26px_rgba(30,64,175,0.58)] border border-indigo-200/80 overflow-hidden rounded-2xl bg-gradient-to-b from-white to-zinc-50 dark:border-slate-700 dark:from-slate-900 dark:to-slate-950">
        <div className="bg-gradient-to-r from-slate-950 via-indigo-900 to-cyan-800 p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{lessonPlan.title}</h2>
              <div className="flex items-center gap-4 mt-2 text-blue-100">
                <span>
                  <strong>Grade:</strong> {lessonPlan.grade}
                </span>
                <span>-</span>
                <span>
                  <strong>Duration:</strong> {lessonPlan.duration}
                </span>
              </div>
              {!!lessonSources.length && (
                <div className="mt-3">
                  <SourceIcons
                    sources={lessonSources}
                    variant="compact"
                    maxCount={6}
                    size={30}
                    className="max-w-full"
                  />
                  {lessonSourceTrace && (
                    <p className="text-xs text-blue-100 mt-1">
                      Sources:{" "}
                      {lessonSourceTrace.mode === "documents"
                        ? "Web/Docs retrieval"
                        : lessonSourceTrace.mode === "semantic_cache"
                        ? "Semantic cache"
                        : "None"}
                      {" • "}
                      {lessonSourceTrace.sourceCount} reference
                      {lessonSourceTrace.sourceCount === 1 ? "" : "s"}
                      {lessonSourceTrace.fromCache ? " • cache hit" : ""}
                    </p>
                  )}
                </div>
              )}
            </div>

            <LessonPlanExportControls
              downloadingPdf={downloadingPdf}
              downloadingDocx={downloadingDocx}
              pendingExportJobs={pendingExportJobs}
              latestPendingExport={latestPendingExport}
              retryingPendingExport={retryingPendingExport}
              onDownloadPdf={onDownloadPdf}
              onDownloadDocx={onDownloadDocx}
              onRetryPendingExport={onRetryPendingExport}
            />
          </div>
        </div>

        <CardContent className="p-6 space-y-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              id="lessonplan-assign-class"
              onClick={onAssignToClass}
              disabled={!canAssignToClass}
              variant="outline"
              className="self-start sm:self-auto"
              data-print-hidden
            >
              <CalendarPlus className="h-4 w-4" />
              Assign To Class
            </Button>
            <Button
              type="button"
              onClick={onDeleteLessonPlan}
              disabled={!canDeleteLessonPlan || deletingLessonPlan}
              variant="destructive"
              className="self-start sm:self-auto"
              data-print-hidden
            >
              <Trash2 className="h-4 w-4" />
              {deletingLessonPlan ? "Deleting..." : "Delete Lesson Plan"}
            </Button>
            <Button
              onClick={onLoadPptxSlidesForEdit}
              disabled={loadingSlides || !isPremium}
              variant="ghost"
              className="h-10 self-start px-3 sm:self-auto font-semibold underline underline-offset-4 text-indigo-700 hover:text-indigo-800 hover:bg-transparent dark:text-white dark:hover:text-slate-200"
              data-print-hidden
            >
              {loadingSlides
                ? "Preparing PPTX slides..."
                : !isPremium
                ? "Premium Only: download pptx lesson material"
                : "Edit PPTX Before Download"}
            </Button>
          </div>
          {downloadingPptx && (
            <LoadingProgress
              stage={LESSON_PLAN_PPTX_EXPORT_PROGRESS.stage}
              label={LESSON_PLAN_PPTX_EXPORT_PROGRESS.label}
              percent={pptxProgress}
            />
          )}

          {latestPendingExport?.stageLabel && (
            <p
              className="text-sm text-slate-600 dark:text-slate-300"
              data-print-hidden
            >
              {latestPendingExport.stageLabel}
              {latestPendingExport.canRetry
                ? " You can retry this export now."
                : latestPendingExport.progress
                ? ` ${Math.round(latestPendingExport.progress)}%`
                : ""}
            </p>
          )}

          <div data-pdf-keep>{isFree && renderUsageIndicator(usageInfo)}</div>

          {lessonPlan.objectives && lessonPlan.objectives.length > 0 && (
            <div
              className="bg-gradient-to-r from-indigo-50 to-cyan-50 p-6 rounded-2xl border border-indigo-200 shadow-[0_12px_24px_-18px_rgba(30,64,175,0.5)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800"
              data-pdf-keep
            >
              <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2 dark:text-sky-200">
                <Lightbulb className="h-5 w-5 text-blue-600 dark:text-cyan-300" />
                Learning Objectives
              </h3>
              <ul className="space-y-3 ml-2">
                {lessonPlan.objectives.map((obj: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 dark:bg-cyan-300"></div>
                    <span className="text-gray-700 font-medium dark:text-slate-200">{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {children}
        </CardContent>
      </Card>
    </div>
  );
}

