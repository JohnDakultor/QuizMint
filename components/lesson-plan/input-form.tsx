"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LoadingProgress from "@/components/ui/loading-progress";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  FileUp,
  Lightbulb,
  Loader2,
  PauseCircle,
  Share2,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import type { FormEvent, RefObject } from "react";

type LessonTemplateDefaults = {
  topic: string;
  subject: string;
  grade: string;
  days: string | number;
  minutesPerDay: string | number;
  objectives: string;
  constraints: string;
};

type LessonMaterialUsage = {
  used: number;
  limit: number;
  remaining: number;
  resetAtMs: number | null;
};

type LessonPlanInputFormProps = {
  lessonTemplateKey: string;
  lessonTemplateDefaults: LessonTemplateDefaults;
  lessonFormRef: RefObject<HTMLFormElement | null>;
  loading: boolean;
  loadingSlides: boolean;
  lessonPlanExists: boolean;
  downloadingPptx: boolean;
  lessonProgress: number;
  slidesProgress: number;
  slidesLoadingLabel: string | null;
  pptxProgress: number;
  isFree: boolean;
  lessonMaterialUploadUsage: LessonMaterialUsage | null;
  countdownNowMs: number;
  infoMessage: string | null;
  error: string | null;
  isPausedMessage: boolean;
  uploadLessonPlanInputRef: RefObject<HTMLInputElement | null>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPause: () => void;
  onCopyTemplateLink: () => void;
  onShareTemplateLink: () => void;
  onOpenUploadPicker: () => void;
  onHandleFileUpload: (file: File) => void;
};

export function LessonPlanInputForm({
  lessonTemplateKey,
  lessonTemplateDefaults,
  lessonFormRef,
  loading,
  loadingSlides,
  lessonPlanExists,
  downloadingPptx,
  lessonProgress,
  slidesProgress,
  slidesLoadingLabel,
  pptxProgress,
  isFree,
  lessonMaterialUploadUsage,
  countdownNowMs,
  infoMessage,
  error,
  isPausedMessage,
  uploadLessonPlanInputRef,
  onSubmit,
  onPause,
  onCopyTemplateLink,
  onShareTemplateLink,
  onOpenUploadPicker,
  onHandleFileUpload,
}: LessonPlanInputFormProps) {
  return (
    <Card className="shadow-xl border-2 border-gray-200 overflow-hidden">
      <div className="bg-linear-to-r from-blue-600 to-purple-600 p-4">
        <h2 className="text-xl font-bold text-white text-center">Generate Your Lesson Plan</h2>
      </div>
      <CardContent className="p-6">
        <form key={lessonTemplateKey} ref={lessonFormRef} onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Lesson Topic *
              </label>
              <Input
                id="lessonplan-topic"
                name="topic"
                placeholder="e.g., Photosynthesis, World War II, Quadratic Equations"
                defaultValue={lessonTemplateDefaults.topic}
                required
                className="h-12 border-2 focus:border-blue-500"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-purple-600" />
                Subject *
              </label>
              <Input
                id="lessonplan-subject"
                name="subject"
                placeholder="e.g., Science, History, Mathematics"
                defaultValue={lessonTemplateDefaults.subject}
                required
                className="h-12 border-2 focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                Grade Level *
              </label>
              <Input
                id="lessonplan-grade"
                name="grade"
                placeholder="e.g., Grade 7, Senior High School"
                defaultValue={lessonTemplateDefaults.grade}
                required
                className="h-12 border-2 focus:border-green-500"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Number of Days *
              </label>
              <Input
                id="lessonplan-days"
                name="days"
                type="number"
                min="1"
                max="7"
                placeholder="Days"
                defaultValue={lessonTemplateDefaults.days}
                required
                className="h-12 border-2 focus:border-amber-500"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-600" />
                Minutes per Day *
              </label>
              <Input
                id="lessonplan-minutes"
                name="minutesPerDay"
                type="number"
                min="10"
                max="120"
                defaultValue={lessonTemplateDefaults.minutesPerDay}
                required
                className="h-12 border-2 focus:border-red-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-indigo-600" />
              Learning Objectives (optional)
            </label>
            <Textarea
              id="lessonplan-objectives"
              name="objectives"
              placeholder="Enter specific learning objectives, one per line..."
              defaultValue={lessonTemplateDefaults.objectives}
              className="min-h-30 border-2 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-gray-600" />
              Special Constraints (optional)
            </label>
            <Textarea
              id="lessonplan-constraints"
              name="constraints"
              placeholder="Any specific requirements or constraints..."
              defaultValue={lessonTemplateDefaults.constraints}
              className="min-h-25 border-2 focus:border-gray-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              id="lessonplan-copy-template-link"
              type="button"
              variant="outline"
              onClick={onCopyTemplateLink}
              className="text-xs"
            >
              <FileText className="mr-1 h-3.5 w-3.5" />
              Copy Template Link
            </Button>
            <Button
              id="lessonplan-share-template-link"
              type="button"
              variant="outline"
              onClick={onShareTemplateLink}
              className="text-xs"
            >
              <Share2 className="mr-1 h-3.5 w-3.5" />
              Share Template
            </Button>
            <Button
              id="lessonplan-upload-file"
              type="button"
              variant="outline"
              onClick={onOpenUploadPicker}
              disabled={loadingSlides || (isFree && (lessonMaterialUploadUsage?.remaining ?? 3) <= 0)}
              className="text-xs"
            >
              <FileUp className="mr-1 h-3.5 w-3.5" />
              Upload Lesson Plan File
            </Button>
            <input
              ref={uploadLessonPlanInputRef}
              type="file"
              accept=".txt,.docx,.pdf,.ppt,.pptx,.xlsx,.csv,.md"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onHandleFileUpload(file);
              }}
            />
          </div>

          {isFree && lessonMaterialUploadUsage && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              File-to-PPTX uploads: {lessonMaterialUploadUsage.used}/{lessonMaterialUploadUsage.limit} used
              {" • "}
              {lessonMaterialUploadUsage.remaining} remaining
              {lessonMaterialUploadUsage.resetAtMs && lessonMaterialUploadUsage.remaining <= 0 && (
                <>
                  {" • "}
                  resets in{" "}
                  {(() => {
                    const remainingMs = Math.max(lessonMaterialUploadUsage.resetAtMs - countdownNowMs, 0);
                    const hh = Math.floor(remainingMs / (1000 * 60 * 60));
                    const mm = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                    const ss = Math.floor((remainingMs % (1000 * 60)) / 1000);
                    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(
                      ss
                    ).padStart(2, "0")}`;
                  })()}
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-stretch">
            <Button
              id="lessonplan-generate"
              type="submit"
              className="w-full sm:w-auto h-14 text-lg font-bold bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-3" />
                  <span className="text-white">Generating 4A's Lesson Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="mr-3" />
                  <span className="text-white">Generate 4A's Lesson Plan</span>
                </>
              )}
            </Button>
            {loading && (
              <Button
                type="button"
                variant="outline"
                onClick={onPause}
                className="w-full sm:w-auto h-14 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <PauseCircle className="mr-2 h-5 w-5" />
                Pause
              </Button>
            )}
          </div>
          {loading && <LoadingProgress label="Generating lesson plan..." percent={lessonProgress} />}
          {loadingSlides && !lessonPlanExists && (
            <LoadingProgress
              label={slidesLoadingLabel || "Preparing lesson material slides..."}
              percent={slidesProgress}
            />
          )}
          {downloadingPptx && !lessonPlanExists && (
            <LoadingProgress label="Generating PPTX file..." percent={pptxProgress} />
          )}
        </form>

        {infoMessage && (
          <div className="mt-6 p-4 rounded-xl border-2 bg-linear-to-r from-blue-50 to-cyan-50 border-blue-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 mt-0.5 text-blue-700" />
              <div>
                <p className="font-bold text-lg text-blue-900">Info</p>
                <p className="whitespace-pre-line mt-1 text-blue-800">{infoMessage}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className={`mt-6 p-4 rounded-xl border-2 ${
              isPausedMessage
                ? "bg-linear-to-r from-amber-50 to-yellow-50 border-amber-200"
                : "bg-linear-to-r from-red-50 to-rose-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className={`h-6 w-6 mt-0.5 ${isPausedMessage ? "text-amber-700" : "text-red-600"}`}
              />
              <div>
                <p className={`font-bold text-lg ${isPausedMessage ? "text-amber-900" : "text-red-800"}`}>
                  {isPausedMessage ? "Paused" : "Error"}
                </p>
                <p
                  className={`whitespace-pre-line mt-1 ${
                    isPausedMessage ? "text-amber-800" : "text-red-700"
                  }`}
                >
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
