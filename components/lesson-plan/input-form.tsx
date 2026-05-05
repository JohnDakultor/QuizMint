"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LoadingProgress from "@/components/ui/loading-progress";
import { LESSON_PLAN_FRAMEWORKS, type LessonPlanFrameworkId } from "@/lib/lesson-plan-frameworks";
import {
  LESSON_PLAN_GENERATION_PROGRESS,
  LESSON_PLAN_PPTX_EXPORT_PROGRESS,
} from "@/lib/loading-stage-labels";
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
  framework: LessonPlanFrameworkId;
  topic: string;
  subject: string;
  grade: string;
  days: string | number;
  minutesPerDay: string | number;
  frameworkFocus: string;
  objectives: string;
  constraints: string;
};

type LessonMaterialUsage = {
  remainingPoints: number;
  maxPoints: number;
  requiredPoints: number;
  resetAtMs: number | null;
};

type LessonPlanCreditsUsage = {
  remainingPoints?: number;
  maxPoints?: number;
  requiredPoints?: number;
  nextRechargeAt?: string | null;
} | null;

type LessonPlanInputFormProps = {
  lessonTemplateKey: string;
  lessonTemplateDefaults: LessonTemplateDefaults;
  selectedFramework: LessonPlanFrameworkId;
  lessonFormRef: RefObject<HTMLFormElement | null>;
  loading: boolean;
  loadingSlides: boolean;
  lessonPlanExists: boolean;
  downloadingPptx: boolean;
  lessonProgress: number;
  slidesLoadingStage: string | null;
  slidesProgress: number;
  slidesLoadingLabel: string | null;
  pptxProgress: number;
  isFree: boolean;
  usageInfo: LessonPlanCreditsUsage;
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
  onFrameworkChange: (framework: LessonPlanFrameworkId) => void;
};

export function LessonPlanInputForm({
  lessonTemplateKey,
  lessonTemplateDefaults,
  selectedFramework,
  lessonFormRef,
  loading,
  loadingSlides,
  lessonPlanExists,
  downloadingPptx,
  lessonProgress,
  slidesLoadingStage,
  slidesProgress,
  slidesLoadingLabel,
  pptxProgress,
  isFree,
  usageInfo,
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
  onFrameworkChange,
}: LessonPlanInputFormProps) {
  const frameworkConfig = LESSON_PLAN_FRAMEWORKS[selectedFramework];

  return (
    <Card className="shadow-[0_20px_55px_-24px_rgba(30,64,175,0.55)] border border-indigo-200/80 overflow-hidden rounded-2xl bg-gradient-to-b from-white to-zinc-50 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
      <div className="bg-gradient-to-r from-slate-950 via-indigo-900 to-cyan-800 p-4">
        <h2 className="text-xl font-bold text-white text-center">Generate Your Lesson Plan</h2>
      </div>
      <CardContent className="p-6">
        <form key={lessonTemplateKey} ref={lessonFormRef} onSubmit={onSubmit} className="space-y-6">
          {isFree && usageInfo && (
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 text-sm text-blue-900 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800 dark:text-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">Lesson Plan Credits</span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-slate-950 dark:text-slate-100">
                  {Number(usageInfo.remainingPoints || 0)}/{Number(usageInfo.maxPoints || 100)} credits
                </span>
              </div>
              <p className="mt-2 text-xs text-blue-700 dark:text-slate-300">
                {Number(usageInfo.requiredPoints || 30)} credits per lesson plan
                {" • "}
                {Number(lessonMaterialUploadUsage?.requiredPoints || 40)} credits per file-to-PPTX upload
                {usageInfo.nextRechargeAt
                  ? ` • recharges at ${new Date(usageInfo.nextRechargeAt).toLocaleString()}`
                  : ""}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Lesson Topic *
              </label>
              <Input
                id="lessonplan-topic"
                name="topic"
                placeholder="e.g., Photosynthesis, World War II, Quadratic Equations"
                defaultValue={lessonTemplateDefaults.topic}
                required
                className="h-12 border-zinc-300 bg-white/90 focus-visible:ring-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-purple-600" />
                Subject *
              </label>
              <Input
                id="lessonplan-subject"
                name="subject"
                placeholder="e.g., Science, History, Mathematics"
                defaultValue={lessonTemplateDefaults.subject}
                required
                className="h-12 border-zinc-300 bg-white/90 focus-visible:ring-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Instructional Framework *
            </label>
            <select
              id="lessonplan-framework"
              name="framework"
              value={selectedFramework}
              onChange={(event) => onFrameworkChange(event.target.value as LessonPlanFrameworkId)}
              className="h-12 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {Object.values(LESSON_PLAN_FRAMEWORKS).map((framework) => (
                <option key={framework.id} value={framework.id}>
                  {framework.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {frameworkConfig.description}
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-600" />
              {frameworkConfig.focusInputLabel} (optional)
            </label>
            <Textarea
              id="lessonplan-framework-focus"
              name="frameworkFocus"
              placeholder={frameworkConfig.focusInputPlaceholder}
              defaultValue={lessonTemplateDefaults.frameworkFocus}
              className="min-h-24 border-zinc-300 bg-white/90 focus-visible:ring-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                Grade Level *
              </label>
              <Input
                id="lessonplan-grade"
                name="grade"
                placeholder="e.g., Grade 7, Senior High School"
                defaultValue={lessonTemplateDefaults.grade}
                required
                className="h-12 border-zinc-300 bg-white/90 focus-visible:ring-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
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
                className="h-12 border-zinc-300 bg-white/90 focus-visible:ring-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
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
                className="h-12 border-zinc-300 bg-white/90 focus-visible:ring-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-indigo-600" />
              Learning Objectives (optional)
            </label>
            <Textarea
              id="lessonplan-objectives"
              name="objectives"
              placeholder={frameworkConfig.objectiveHint}
              defaultValue={lessonTemplateDefaults.objectives}
              className="min-h-30 border-zinc-300 bg-white/90 focus-visible:ring-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-gray-600" />
              Special Constraints (optional)
            </label>
            <Textarea
              id="lessonplan-constraints"
              name="constraints"
              placeholder={frameworkConfig.constraintHint}
              defaultValue={lessonTemplateDefaults.constraints}
              className="min-h-25 border-zinc-300 bg-white/90 focus-visible:ring-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              id="lessonplan-copy-template-link"
              type="button"
              variant="outline"
              onClick={onCopyTemplateLink}
              className="text-xs border-indigo-200 bg-white hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-indigo-500/20 dark:hover:border-indigo-400/50"
            >
              <FileText className="mr-1 h-3.5 w-3.5" />
              Copy Template Link
            </Button>
            <Button
              id="lessonplan-share-template-link"
              type="button"
              variant="outline"
              onClick={onShareTemplateLink}
              className="text-xs border-indigo-200 bg-white hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-indigo-500/20 dark:hover:border-indigo-400/50"
            >
              <Share2 className="mr-1 h-3.5 w-3.5" />
              Share Template
            </Button>
            <Button
              id="lessonplan-upload-file"
              type="button"
              variant="outline"
              onClick={onOpenUploadPicker}
              disabled={
                loadingSlides ||
                (isFree &&
                  (lessonMaterialUploadUsage?.remainingPoints ?? 100) <
                    (lessonMaterialUploadUsage?.requiredPoints ?? 40))
              }
              className="text-xs border-indigo-200 bg-white hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-indigo-500/20 dark:hover:border-indigo-400/50"
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
            <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-cyan-50 px-3 py-2 text-xs text-indigo-800 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800 dark:text-slate-200">
              File-to-PPTX uses your Lesson Plan Credits balance
              {" • "}
              {lessonMaterialUploadUsage.requiredPoints} credits per upload
              {lessonMaterialUploadUsage.resetAtMs &&
              lessonMaterialUploadUsage.remainingPoints < lessonMaterialUploadUsage.requiredPoints && (
                <>
                  {" • "}
                  recharges in{" "}
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
              className="h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white shadow-[0_10px_24px_-12px_rgba(37,99,235,0.9)] transition hover:bg-blue-700 sm:w-auto"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-3" />
                  <span className="text-white">Generating Lesson Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="mr-3" />
                  <span className="text-white">Generate Lesson Plan</span>
                </>
              )}
            </Button>
            {loading && (
              <Button
                type="button"
                variant="outline"
                onClick={onPause}
                className="w-full sm:w-auto h-14 border-amber-300 text-amber-700 hover:bg-amber-50 bg-white dark:border-amber-400/50 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-500/20 dark:hover:border-amber-300"
              >
                <PauseCircle className="mr-2 h-5 w-5" />
                Pause
              </Button>
            )}
          </div>
          {loading && (
            <LoadingProgress
              stage={LESSON_PLAN_GENERATION_PROGRESS.stage}
              label={LESSON_PLAN_GENERATION_PROGRESS.label}
              percent={lessonProgress}
            />
          )}
          {loadingSlides && (
            <LoadingProgress
              stage={slidesLoadingStage || "Preparing"}
              label={slidesLoadingLabel || "Preparing lesson material slides..."}
              percent={slidesProgress}
            />
          )}
          {downloadingPptx && !lessonPlanExists && (
            <LoadingProgress
              stage={LESSON_PLAN_PPTX_EXPORT_PROGRESS.stage}
              label={LESSON_PLAN_PPTX_EXPORT_PROGRESS.label}
              percent={pptxProgress}
            />
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
