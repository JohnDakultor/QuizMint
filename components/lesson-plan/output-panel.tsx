"use client";

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingProgress from "@/components/ui/loading-progress";
import { SourceIcons, type SourceIcon } from "@/components/source-icons";
import { Lightbulb } from "lucide-react";
import { LessonPlanExportControls } from "./export-controls";

type UsageInfo = {
  used?: number;
  limit?: number;
  nextReset?: string;
};

type PendingExportJob = {
  jobId: string;
  format: "docx" | "pdf" | "pptx";
  topic: string;
  createdAt: number;
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
  renderUsageIndicator,
  children,
}: LessonPlanOutputPanelProps) {
  return (
    <div id="lessonplan-print-root" ref={lessonPlanRef} className="bg-white">
      <Card className="shadow-2xl border-2 border-gray-300 overflow-hidden">
        <div className="bg-linear-to-r from-blue-600 to-purple-600 p-4">
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
              onClick={onLoadPptxSlidesForEdit}
              disabled={loadingSlides || !isPremium}
              variant="ghost"
              className="text-purple-700 hover:text-purple-800 hover:bg-transparent p-0 h-auto font-semibold underline underline-offset-4 self-start"
              data-print-hidden
            >
              {loadingSlides
                ? "Preparing PPTX slides..."
                : !isPremium
                ? "Premium Only: download pptx lesson material"
                : "Edit PPTX Before Download"}
            </Button>
          </div>
          {loadingSlides && lessonPlan && (
            <LoadingProgress label={slidesLoadingLabel} percent={slidesProgress} />
          )}
          {downloadingPptx && <LoadingProgress label="Generating PPTX file..." percent={pptxProgress} />}

          <div data-pdf-keep>{isFree && renderUsageIndicator(usageInfo)}</div>

          {lessonPlan.objectives && lessonPlan.objectives.length > 0 && (
            <div
              className="bg-linear-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200"
              data-pdf-keep
            >
              <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                Learning Objectives
              </h3>
              <ul className="space-y-3 ml-2">
                {lessonPlan.objectives.map((obj: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <span className="text-gray-700 font-medium">{obj}</span>
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

