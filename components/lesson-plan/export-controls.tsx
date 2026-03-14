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
    <div className="flex gap-3">
      <Button
        onClick={onDownloadPdf}
        disabled={downloadingPdf}
        variant="default"
        className="bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg"
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
        className="bg-white text-blue-600 hover:bg-blue-50 border-0 font-semibold shadow-lg"
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
          className="border-blue-200 text-blue-700 hover:bg-blue-50"
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

