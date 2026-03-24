"use client";

import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, RefreshCw } from "lucide-react";

type PendingExportJob = {
  jobId: string;
  format: "docx" | "pdf" | "pptx";
  topic: string;
  createdAt: number;
};

type ExportControlsProps = {
  downloadingPdf: boolean;
  downloadingDocx: boolean;
  pendingExportJobs: PendingExportJob[];
  retryingPendingExport: boolean;
  onDownloadPdf: () => void;
  onDownloadDocx: () => void;
  onRetryPendingExport: () => void;
};

export function LessonPlanExportControls({
  downloadingPdf,
  downloadingDocx,
  pendingExportJobs,
  retryingPendingExport,
  onDownloadPdf,
  onDownloadDocx,
  onRetryPendingExport,
}: ExportControlsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={onDownloadPdf}
        disabled={downloadingPdf}
        variant="default"
        className="bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 dark:hover:from-rose-500 dark:hover:to-orange-500 text-white shadow-lg"
        data-print-hidden
      >
        {downloadingPdf ? (
          <Loader2 className="animate-spin mr-2 h-4 w-4" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        Download PDF
      </Button>

      <Button
        onClick={onDownloadDocx}
        disabled={downloadingDocx}
        variant="default"
        className="bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 font-semibold shadow-lg dark:bg-slate-900 dark:text-indigo-200 dark:border-indigo-400/40 dark:hover:bg-indigo-500/20 dark:hover:border-indigo-300/70"
        data-print-hidden
      >
        {downloadingDocx ? (
          <Loader2 className="animate-spin mr-2" />
        ) : (
          <Download className="mr-2" />
        )}
        Download DOCX
      </Button>

      {!!pendingExportJobs.length && (
        <Button
          onClick={onRetryPendingExport}
          disabled={retryingPendingExport || !pendingExportJobs.length}
          variant="outline"
          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-400/40 dark:text-indigo-200 dark:hover:bg-indigo-500/20 dark:hover:border-indigo-300/70"
          data-print-hidden
        >
          {retryingPendingExport ? (
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Download when ready
        </Button>
      )}
    </div>
  );
}

