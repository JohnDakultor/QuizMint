
"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { 
  Clock,
  Target, Search, BookOpen, Zap,
  Brain,
  BrainCircuit,
} from "lucide-react";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import Tour from "@/components/ui/tour";
import SkeletonLoading from "@/components/ui/skeleton-loading";
import LoadingProgress from "@/components/ui/loading-progress";
import LiteModeBadge from "@/components/ui/lite-mode-badge";
import { type SourceIcon } from "@/components/source-icons";
import { LessonPlanInputForm } from "@/components/lesson-plan/input-form";
import { LessonPlanAssignModal } from "@/components/lesson-plan/lesson-plan-assign-modal";
import { LessonPlanOutputPanel } from "@/components/lesson-plan/output-panel";
import { LessonPlanDaySections } from "@/components/lesson-plan/day-sections";
import { FourAsPhaseCard, SpecificActivityCard } from "@/components/lesson-plan/activity-cards";
import { trackGaEvent } from "@/lib/ga-client";
import {
  LESSON_PLAN_FRAMEWORKS,
  getLessonPlanFramework,
  normalizeLessonPlanFramework,
  type LessonPlanFrameworkId,
} from "@/lib/lesson-plan-frameworks";
import {
  LESSON_PLAN_PPTX_EXPORT_PROGRESS,
  LESSON_PLAN_SLIDES_PROGRESS,
  LESSON_PLAN_UPLOAD_SLIDES_PROGRESS,
} from "@/lib/loading-stage-labels";
import { shouldQueueLessonPlanGeneration } from "@/lib/lesson-plan-workload-routing";
import type { PptDeck } from "@/lib/lesson-plan-ppt-ai";
import type { LessonPlanData, LessonPlanDay } from "@/lib/lessonPlan-gen-pdf-dl";

const PptxEditor = dynamic(() => import("@/components/lesson-plan/pptx-editor"), {
  ssr: false,
});

const LESSON_EXPORT_POLL_TIMEOUT_MS = 10 * 60 * 1000;
const LESSON_EXPORT_LOCALSTORAGE_KEY = "lessonPlanPendingExports";
const LESSON_GENERATION_LOCALSTORAGE_KEY = "lessonPlanPendingGeneration";
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

type PendingLessonGenerationJob = {
  jobId: string;
  createdAt: number;
};

type ClassOption = {
  id: string;
  name: string;
  subject: string | null;
  gradeLevel: string | null;
  section: string | null;
  archived: boolean;
};

type AdaptiveWorkspaceSummary = {
  supportLevel: string;
  focus: string[];
  primaryClassName: string | null;
  primaryClassId: string | null;
  summary: string;
  recommendation: string;
  suggestedPrompt: string;
};

type LessonPlanState = LessonPlanData & {
  subject?: string;
  minutesPerDay?: number;
  __sources?: SourceIcon[];
  __sourceTrace?: {
    mode?: "none" | "documents" | "semantic_cache";
    fromCache?: boolean;
    sourceCount?: number;
  };
  [key: string]: unknown;
};

type LessonPlanFormData = {
  framework?: LessonPlanFrameworkId | string | null;
  topic: string;
  subject: string;
  grade: string;
  days: number;
  minutesPerDay: number;
  [key: string]: unknown;
};

type LessonPlanUsageInfo = {
  remainingPoints?: number;
  maxPoints?: number;
  requiredPoints?: number;
  nextRechargeAt?: string | null;
  [key: string]: unknown;
};

type LessonPlanHistoryItem = {
  id: string;
  title: string;
  topic: string;
  subject: string;
  grade: string;
  days: number;
  minutesPerDay: number;
  createdAt: string;
  data: LessonPlanState;
};

type LessonSourceTrace = {
  mode: "none" | "documents" | "semantic_cache";
  fromCache: boolean;
  sourceCount: number;
};

type LessonMaterialUploadConfig = {
  framework: LessonPlanFrameworkId;
  topic: string;
  subject: string;
  grade: string;
  days: number;
  minutesPerDay: number;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// Usage Indicator Component
function UsageIndicator({ usage }: { usage: LessonPlanUsageInfo | null }) {
  if (!usage) return null;

  const remainingPoints = Number(usage.remainingPoints || 0);
  const maxPoints = Number(usage.maxPoints || 100);
  const requiredPoints = Number(usage.requiredPoints || 30);
  const percentage = maxPoints > 0 ? Math.min((remainingPoints / maxPoints) * 100, 100) : 0;
  const nextRecharge = usage.nextRechargeAt ? new Date(usage.nextRechargeAt) : null;
  
  const getTimeUntilRecharge = () => {
    if (!nextRecharge) return "";
    const now = new Date();
    const diffMs = nextRecharge.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Recharges soon";
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `Recharges in ${hours}h ${minutes}m`;
  };
  
  return (
    <div className="mt-4 p-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-blue-700">Lesson Plan Credits</span>
        </div>
        <span className="text-sm text-blue-600 font-medium bg-white px-2 py-1 rounded">
          {remainingPoints}/{maxPoints} credits
        </span>
      </div>
      <div className="w-full bg-blue-100 rounded-full h-2.5 mb-2">
        <div 
          className={`h-2.5 rounded-full transition-all duration-300 ${
            percentage <= 10 ? "bg-red-500" : 
            percentage <= 30 ? "bg-yellow-500" : "bg-linear-to-r from-blue-500 to-indigo-500"
          }`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-blue-600 font-medium">
          {remainingPoints < requiredPoints
            ? `Need ${requiredPoints} credits`
            : `${requiredPoints} credits per lesson plan`}
        </span>
        <span className="text-blue-500 font-medium">
          {getTimeUntilRecharge()}
        </span>
      </div>
    </div>
  );
}

// Main Component
export default function LessonPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<LessonPlanState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);
  const [formDataObject, setFormDataObject] = useState<LessonPlanFormData | null>(null);
  const [usageInfo, setUsageInfo] = useState<LessonPlanUsageInfo | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free");
  const [adaptiveLearningEnabled, setAdaptiveLearningEnabled] = useState(false);
  const [liteMode, setLiteMode] = useState(false);
  const [pptxDeck, setPptxDeck] = useState<PptDeck | null>(null);
  const [pptxDeckSource, setPptxDeckSource] = useState<"lesson_plan" | "lesson_material_upload">(
    "lesson_plan"
  );
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [slidesLoadingStage, setSlidesLoadingStage] = useState<string | null>(
    LESSON_PLAN_SLIDES_PROGRESS.stage
  );
  const [slidesLoadingLabel, setSlidesLoadingLabel] = useState<string>(
    LESSON_PLAN_SLIDES_PROGRESS.label
  );
  const [lessonProgress, setLessonProgress] = useState(0);
  const [slidesProgress, setSlidesProgress] = useState(0);
  const [pptxProgress, setPptxProgress] = useState(0);
  const [pendingExportJobs, setPendingExportJobs] = useState<PendingExportJob[]>([]);
  const [retryingPendingExport, setRetryingPendingExport] = useState(false);
  const [showPptxEditor, setShowPptxEditor] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteLessonPlanModal, setShowDeleteLessonPlanModal] = useState(false);
  const [deletingLessonPlan, setDeletingLessonPlan] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<LessonPlanFrameworkId>(
    normalizeLessonPlanFramework(searchParams.get("framework"))
  );
  const [currentLessonPlanId, setCurrentLessonPlanId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentInstructions, setAssignmentInstructions] = useState("");
  const [assignmentAvailableFrom, setAssignmentAvailableFrom] = useState("");
  const [assignmentDueAt, setAssignmentDueAt] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPlans, setHistoryPlans] = useState<LessonPlanHistoryItem[]>([]);
  const [adaptiveWorkspaceSummary, setAdaptiveWorkspaceSummary] =
    useState<AdaptiveWorkspaceSummary | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [lessonSources, setLessonSources] = useState<SourceIcon[]>([]);
  const [lessonSourceTrace, setLessonSourceTrace] = useState<LessonSourceTrace | null>(null);
  const [lessonMaterialUploadUsage, setLessonMaterialUploadUsage] = useState<{
    remainingPoints: number;
    maxPoints: number;
    requiredPoints: number;
    resetAtMs: number | null;
  } | null>(null);
  const [countdownNowMs, setCountdownNowMs] = useState(() => Date.now());
  const [showLessonUploadConfigModal, setShowLessonUploadConfigModal] = useState(false);
  const [lessonUploadFramework, setLessonUploadFramework] =
    useState<LessonPlanFrameworkId>(selectedFramework);
  const [lessonUploadDays, setLessonUploadDays] = useState("1");
  const [lessonUploadMinutesPerDay, setLessonUploadMinutesPerDay] = useState("40");
  const [lessonUploadTopic, setLessonUploadTopic] = useState("");
  const [lessonUploadSubject, setLessonUploadSubject] = useState("");
  const [lessonUploadGrade, setLessonUploadGrade] = useState("");
  const lessonPlanRef = useRef<HTMLDivElement | null>(null);
  const uploadLessonPlanInputRef = useRef<HTMLInputElement | null>(null);
  const lessonFormRef = useRef<HTMLFormElement | null>(null);
  const generationAbortRef = useRef<AbortController | null>(null);
  const ASYNC_JOB_POLL_INTERVAL_MS = 1500;
  const ASYNC_JOB_TIMEOUT_MS = 10 * 60 * 1000;
  const withRequestId = (
    message: string,
    payload: { requestId?: string | null } | null | undefined,
  ) => (payload?.requestId ? `${message} (Ref: ${payload.requestId})` : message);
  const withRequestIdFromText = (fallback: string, text: string) => {
    try {
      const parsed = JSON.parse(text);
      const message = parsed?.error || parsed?.message || fallback;
      return parsed?.requestId ? `${message} (Ref: ${parsed.requestId})` : message;
    } catch {
      return fallback;
    }
  };
  const isPremium = subscriptionPlan === "premium";
  const isFree = subscriptionPlan === "free" || !subscriptionPlan;
  const adaptiveWorkflowEnabled =
    subscriptionPlan === "premium" && !liteMode && adaptiveLearningEnabled;

  const persistPendingLessonGenerationJob = (job: PendingLessonGenerationJob | null) => {
    if (typeof window === "undefined") return;
    try {
      if (!job) {
        window.localStorage.removeItem(LESSON_GENERATION_LOCALSTORAGE_KEY);
        return;
      }
      window.localStorage.setItem(LESSON_GENERATION_LOCALSTORAGE_KEY, JSON.stringify(job));
    } catch {
      // ignore storage failures
    }
  };

  async function pollAsyncGenerationJob(jobId: string, signal?: AbortSignal) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < ASYNC_JOB_TIMEOUT_MS) {
      const statusRes = await fetch(`/api/generation-jobs/${jobId}`, {
        cache: "no-store",
        signal,
      });
      const statusData = await statusRes.json().catch(() => ({}));
      if (!statusRes.ok) {
        throw new Error(
          withRequestId(
            statusData?.error || "Failed to poll generation job",
            statusData
          )
        );
      }
      const status = String(statusData?.job?.status || "queued");
      if (status === "completed") return statusData?.job?.result || {};
      if (status === "failed") {
        throw new Error(
          withRequestId(
            statusData?.job?.error || "Generation job failed",
            statusData
          )
        );
      }
      await new Promise((resolve) =>
        setTimeout(resolve, ASYNC_JOB_POLL_INTERVAL_MS)
      );
    }
    throw new Error("Generation is taking longer than expected. Please try again.");
  }

  const hydrateGeneratedLessonPlan = (
    data: Record<string, unknown>,
    fallbackForm?: LessonPlanFormData | null
  ) => {
    const nextLessonPlan = data.lessonPlan as LessonPlanState | null;
    const savedLessonPlan =
      data.savedLessonPlan && typeof data.savedLessonPlan === "object"
        ? (data.savedLessonPlan as { id?: unknown })
        : null;
    const sourceTrace =
      data.sourceTrace && typeof data.sourceTrace === "object"
        ? (data.sourceTrace as {
            mode?: unknown;
            fromCache?: unknown;
            sourceCount?: unknown;
          })
        : null;
    const nextFramework = normalizeLessonPlanFramework(
      String(nextLessonPlan?.framework || fallbackForm?.framework || selectedFramework)
    );
    if (!nextLessonPlan) {
      throw new Error("No lesson plan data received from server");
    }
    setLessonPlan(nextLessonPlan);
    setCurrentLessonPlanId(typeof savedLessonPlan?.id === "string" ? savedLessonPlan.id : null);
    setSelectedFramework(nextFramework);
    setFormDataObject(
      fallbackForm || {
        framework: nextFramework,
        topic: String(nextLessonPlan.topic || nextLessonPlan.title || "").trim(),
        subject: String(nextLessonPlan.subject || "").trim(),
        grade: String(nextLessonPlan.grade || "").trim(),
        days: Number(nextLessonPlan.days || 1),
        minutesPerDay: Number(nextLessonPlan.minutesPerDay || 40),
      }
    );
    setUsageInfo((data.usage as LessonPlanUsageInfo | null) ?? null);
    setLessonSources(Array.isArray(data.sources) ? data.sources : []);
    setLessonSourceTrace(
      sourceTrace
        ? {
            mode:
              sourceTrace.mode === "documents" ||
              sourceTrace.mode === "semantic_cache"
                ? sourceTrace.mode
                : "none",
            fromCache: Boolean(sourceTrace.fromCache),
            sourceCount: Number(sourceTrace.sourceCount || 0),
          }
        : null
    );
    setIsHistoryView(false);
  };
  const dedupedHistoryPlans = useMemo(() => {
    const seen = new Set<string>();
    const unique: LessonPlanHistoryItem[] = [];
    for (const plan of historyPlans) {
      const fingerprint = JSON.stringify({
        title: plan?.title ?? "",
        topic: plan?.topic ?? "",
        subject: plan?.subject ?? "",
        grade: plan?.grade ?? "",
        days: plan?.days ?? "",
        minutesPerDay: plan?.minutesPerDay ?? "",
        data: plan?.data ?? null,
      });
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      unique.push(plan);
    }
    return unique;
  }, [historyPlans]);

  useEffect(() => {
    setSelectedFramework(normalizeLessonPlanFramework(searchParams.get("framework")));
  }, [searchParams]);

  const frameworkConfig = useMemo(
    () => getLessonPlanFramework(lessonPlan?.framework || formDataObject?.framework || selectedFramework),
    [formDataObject?.framework, lessonPlan?.framework, selectedFramework]
  );

  const lessonTemplateDefaults = useMemo(
    () => ({
      framework: normalizeLessonPlanFramework(searchParams.get("framework")),
      topic: searchParams.get("topic") || "",
      subject: searchParams.get("subject") || "",
      grade: searchParams.get("grade") || "",
      days: searchParams.get("days") || "",
      minutesPerDay: searchParams.get("minutesPerDay") || "40",
      objectives: searchParams.get("objectives") || "",
      constraints: searchParams.get("constraints") || "",
    }),
    [searchParams]
  );
  const lessonTemplateKey = searchParams.toString();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const plan = data?.user?.subscriptionPlan || "free";
        setLiteMode(Boolean(data?.user?.liteMode));
        setAdaptiveLearningEnabled(Boolean(data?.user?.adaptiveLearning));
        setSubscriptionPlan(plan);
        if (plan === "free" || !plan) {
          setUsageInfo({
            remainingPoints: Number(data?.user?.freeLessonPlanPoints || 0),
            maxPoints: Number(data?.user?.freeLessonPlanPointsMax || 100),
            requiredPoints: 30,
            nextRechargeAt:
              typeof data?.user?.freeLessonPlanPointsRechargeAt === "string"
                ? data.user.freeLessonPlanPointsRechargeAt
                : null,
          });
          setLessonMaterialUploadUsage({
            remainingPoints: Number(data?.user?.freeLessonPlanPoints || 0),
            maxPoints: Number(data?.user?.freeLessonPlanPointsMax || 100),
            requiredPoints: 40,
            resetAtMs:
              typeof data?.user?.freeLessonPlanPointsRechargeAt === "string"
                ? new Date(data.user.freeLessonPlanPointsRechargeAt).getTime()
                : null,
          });
        } else {
          setUsageInfo(null);
          setLessonMaterialUploadUsage(null);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      await refreshLessonPlanHistory();
    };
    loadHistory();
  }, []);

  async function refreshLessonPlanHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/lesson-plans");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.plans)) {
        setHistoryPlans(data.plans as LessonPlanHistoryItem[]);
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      setLoadingClasses(true);
      try {
        const res = await fetch("/api/classes", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        setClasses(Array.isArray(data?.classes) ? (data.classes as ClassOption[]) : []);
      } catch {
        if (!cancelled) setClasses([]);
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    }
    void loadClasses();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAdaptiveWorkspaceSummary() {
      try {
        const res = await fetch("/api/dashboard/summary", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        const summary =
          data?.adaptiveWorkspaceSummary &&
          typeof data.adaptiveWorkspaceSummary === "object" &&
          !Array.isArray(data.adaptiveWorkspaceSummary)
            ? (data.adaptiveWorkspaceSummary as AdaptiveWorkspaceSummary)
            : null;
        if (!cancelled) setAdaptiveWorkspaceSummary(summary);
      } catch {
        if (!cancelled) setAdaptiveWorkspaceSummary(null);
      }
    }
    void loadAdaptiveWorkspaceSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort();
      generationAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading) return;

    let cancelled = false;
    const raw = window.localStorage.getItem(LESSON_GENERATION_LOCALSTORAGE_KEY);
    if (!raw) return;

    let pending: PendingLessonGenerationJob | null = null;
    try {
      pending = JSON.parse(raw) as PendingLessonGenerationJob;
    } catch {
      window.localStorage.removeItem(LESSON_GENERATION_LOCALSTORAGE_KEY);
      return;
    }

    if (!pending?.jobId) return;

    const controller = new AbortController();
    generationAbortRef.current = controller;
    setLoading(true);
    setError(null);
    setInfoMessage("Resuming queued lesson plan generation...");

    void pollAsyncGenerationJob(pending.jobId, controller.signal)
      .then(async (data) => {
        if (cancelled) return;
        hydrateGeneratedLessonPlan((data ?? {}) as Record<string, unknown>, formDataObject);
        setLessonProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 120));
        persistPendingLessonGenerationJob(null);
        setInfoMessage(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") return;
        persistPendingLessonGenerationJob(null);
        setError(getErrorMessage(err, "Failed to resume lesson plan generation"));
        setInfoMessage(null);
      })
      .finally(() => {
        if (cancelled) return;
        generationAbortRef.current = null;
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [formDataObject, loading, selectedFramework]);

  useEffect(() => {
    if (!lessonMaterialUploadUsage?.resetAtMs) return;
    const timer = setInterval(() => setCountdownNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lessonMaterialUploadUsage?.resetAtMs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LESSON_EXPORT_LOCALSTORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setPendingExportJobs(
          parsed.filter(
            (job: unknown): job is PendingExportJob =>
              typeof job === "object" &&
              job !== null &&
              typeof (job as PendingExportJob).jobId === "string" &&
              ((job as PendingExportJob).format === "docx" ||
                (job as PendingExportJob).format === "pdf" ||
                (job as PendingExportJob).format === "pptx")
          )
        );
      }
    } catch {
      // ignore malformed local data
    }
  }, []);

  const persistPendingExportJobs = (jobs: PendingExportJob[]) => {
    setPendingExportJobs(jobs);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LESSON_EXPORT_LOCALSTORAGE_KEY, JSON.stringify(jobs));
    } catch {
      // ignore storage failures
    }
  };

  const addPendingExportJob = (job: PendingExportJob) => {
    const next = [job, ...pendingExportJobs.filter((item) => item.jobId !== job.jobId)].slice(0, 5);
    persistPendingExportJobs(next);
  };

  const updatePendingExportJob = (
    jobId: string,
    updates: Partial<PendingExportJob>
  ) => {
    persistPendingExportJobs(
      pendingExportJobs.map((item) =>
        item.jobId === jobId ? { ...item, ...updates } : item
      )
    );
  };

  const removePendingExportJob = (jobId: string) => {
    persistPendingExportJobs(pendingExportJobs.filter((item) => item.jobId !== jobId));
  };

  const downloadCompletedExport = async (
    jobId: string,
    format: "docx" | "pdf" | "pptx",
    topic: string
  ) => {
    const fileRes = await fetch(`/api/lesson-plan-export/${jobId}?download=1`, {
      cache: "no-store",
    });
    if (!fileRes.ok) {
      const text = await fileRes.text();
      throw new Error(withRequestIdFromText("Failed to download ready file", text));
    }

    const blob = await fileRes.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${topic || "lesson_plan"}.${format}`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const pollExportJob = async (
    jobId: string,
    format: "docx" | "pdf" | "pptx",
    topic: string,
    timeoutMs: number
  ) => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const startedAt = Date.now();
    let lastStatus = "queued";

    while (Date.now() - startedAt < timeoutMs) {
      const statusRes = await fetch(`/api/lesson-plan-export/${jobId}`, {
        cache: "no-store",
      });
      const statusData = await statusRes.json().catch(() => ({}));

      if (!statusRes.ok) {
        throw new Error(
          withRequestId(statusData?.error || "Failed to fetch export status", statusData)
        );
      }

      lastStatus = String(statusData?.status || "queued");
      const statusLabel = String(statusData?.stageLabel || "").trim();
      if (lastStatus === "completed") {
        if (statusLabel) setInfoMessage(statusLabel);
        await downloadCompletedExport(jobId, format, topic);
        removePendingExportJob(jobId);
        return;
      }

      if (lastStatus === "failed") {
        updatePendingExportJob(jobId, {
          status: "failed",
          stageLabel: statusLabel || "Export failed",
          progress: Number(statusData?.progress || 100),
          canRetry: Boolean(statusData?.canRetry),
        });
        throw new Error(withRequestId(statusData?.error || "Export job failed", statusData));
      }

      if (statusLabel) {
        setInfoMessage(statusLabel);
      }

      updatePendingExportJob(jobId, {
        status: lastStatus === "processing" ? "processing" : "queued",
        stageLabel: statusLabel || null,
        progress:
          typeof statusData?.progress === "number" ? statusData.progress : null,
        canRetry: Boolean(statusData?.canRetry),
      });

      if (lastStatus === "queued") {
        await fetch("/api/lesson-plan-export/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        }).catch(() => null);
      }

      await sleep(1500);
    }

    addPendingExportJob({
      jobId,
      format,
      topic,
      createdAt: Date.now(),
      status: "queued",
      stageLabel: `Queued ${format.toUpperCase()} export`,
      progress: 18,
      canRetry: false,
    });
    setError(null);
    setInfoMessage(
      `Still processing. We kept the ${format.toUpperCase()} export running in the background. Click 'Download when ready' to retry.`
    );
  };

  function pauseLessonPlanGeneration() {
    if (!generationAbortRef.current) return;
    generationAbortRef.current.abort();
    generationAbortRef.current = null;
    persistPendingLessonGenerationJob(null);
    setLoading(false);
    setLessonProgress(0);
    setError("Generation paused.");
  }

  const getLessonTemplateValues = () => {
    const formData = lessonFormRef.current
      ? Object.fromEntries(new FormData(lessonFormRef.current).entries())
      : {};
    const merged = {
      ...lessonTemplateDefaults,
      ...(formDataObject || {}),
      ...formData,
    } as Record<string, unknown>;
    return {
      framework: normalizeLessonPlanFramework(merged.framework),
      topic: String(merged.topic || "").trim(),
      subject: String(merged.subject || "").trim(),
      grade: String(merged.grade || "").trim(),
      days: String(merged.days || "").trim(),
      minutesPerDay: String(merged.minutesPerDay || "").trim(),
      objectives: String(merged.objectives || "").trim(),
      constraints: String(merged.constraints || "").trim(),
    };
  };

  const buildLessonTemplateUrl = () => {
    if (typeof window === "undefined") return "";
    const values = getLessonTemplateValues();
    if (!values.topic) return "";
    const url = new URL("/lessonPlan", window.location.origin);
    Object.entries(values).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    return url.toString();
  };

  const getInterventionLaunchContext = () => {
    const sourceType = searchParams.get("interventionSourceType");
    const sourceId = searchParams.get("interventionSourceId");
    const mode = searchParams.get("interventionMode");
    if (!sourceType || !sourceId || !mode) return null;
    return {
      sourceType,
      sourceId,
      classId: searchParams.get("interventionClassId") || null,
      className: searchParams.get("interventionClassName") || null,
      assignmentTitle: searchParams.get("interventionAssignmentTitle") || null,
      mode,
    };
  };

  const updateLessonTemplateSearch = (
    updater: (current: ReturnType<typeof getLessonTemplateValues>) => ReturnType<typeof getLessonTemplateValues>
  ) => {
    const nextValues = updater(getLessonTemplateValues());
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(nextValues).forEach(([key, value]) => {
      const normalized = String(value || "").trim();
      if (normalized) params.set(key, normalized);
      else params.delete(key);
    });
    router.replace(`/lessonPlan?${params.toString()}`, { scroll: false });
  };

  const applyAdaptiveLessonContext = (mode: "replace" | "append") => {
    if (!adaptiveWorkspaceSummary) return;
    const adaptiveObjectives = adaptiveWorkspaceSummary.focus.length
      ? `Reteach these weak concepts: ${adaptiveWorkspaceSummary.focus.join("; ")}`
      : `Reinforce the current weak concepts for ${adaptiveWorkspaceSummary.primaryClassName || "the priority class"}`;
    const adaptiveConstraints = [
      adaptiveWorkspaceSummary.recommendation,
      `Support level: ${adaptiveWorkspaceSummary.supportLevel}.`,
      adaptiveWorkspaceSummary.primaryClassName
        ? `Prioritize ${adaptiveWorkspaceSummary.primaryClassName} for this follow-up lesson.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    updateLessonTemplateSearch((current) => ({
      ...current,
      topic:
        mode === "replace" && !current.topic.trim()
          ? `Adaptive Follow-Up for ${adaptiveWorkspaceSummary.primaryClassName || "Priority Class"}`
          : current.topic,
      days: current.days || "1",
      minutesPerDay: current.minutesPerDay || "40",
      objectives:
        mode === "append"
          ? current.objectives.trim()
            ? `${current.objectives.trim()}\n${adaptiveObjectives}`
            : adaptiveObjectives
          : adaptiveObjectives,
      constraints:
        mode === "append"
          ? current.constraints.trim()
            ? `${current.constraints.trim()}\n${adaptiveConstraints}`
            : adaptiveConstraints
          : adaptiveConstraints,
    }));
    setError(null);
    setInfoMessage(
      mode === "append"
        ? "Adaptive class-result context appended to the lesson plan fields."
        : "Adaptive class-result context applied to the lesson plan fields.",
    );
  };

  const copyLessonTemplateLink = async () => {
    const url = buildLessonTemplateUrl();
    if (!url) {
      setError(null);
      setInfoMessage("Add at least a topic first to create a shareable template link.");
      return;
    }
    await navigator.clipboard.writeText(url);
    setError(null);
    setInfoMessage("Template link copied.");
  };

  const shareLessonTemplateLink = async () => {
    const url = buildLessonTemplateUrl();
    if (!url) {
      setError(null);
      setInfoMessage("Add at least a topic first to create a shareable template link.");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Lesson Plan Template",
          text: "Use this prefilled lesson plan template:",
          url,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    await navigator.clipboard.writeText(url);
    setError(null);
    setInfoMessage("Template link copied.");
  };

  useEffect(() => {
    if (!loading) {
      setLessonProgress(0);
      return;
    }
    setLessonProgress(7);
    const id = setInterval(() => {
      setLessonProgress((prev) => {
        if (prev >= 92) return prev;
        return prev + Math.max(1, Math.floor((100 - prev) / 12));
      });
    }, 600);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!loadingSlides) {
      setSlidesProgress(0);
      return;
    }
    setSlidesProgress(10);
    const id = setInterval(() => {
      setSlidesProgress((prev) => {
        if (prev >= 94) return prev;
        return prev + Math.max(1, Math.floor((100 - prev) / 10));
      });
    }, 500);
    return () => clearInterval(id);
  }, [loadingSlides]);

  useEffect(() => {
    if (!downloadingPptx) {
      setPptxProgress(0);
      return;
    }
    setPptxProgress(12);
    const id = setInterval(() => {
      setPptxProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.max(1, Math.floor((100 - prev) / 11));
      });
    }, 500);
    return () => clearInterval(id);
  }, [downloadingPptx]);

  async function generateLessonPlan(formData: FormData) {
    const rawForm = Object.fromEntries(formData.entries());
    const formObj: LessonPlanFormData = {
      framework: normalizeLessonPlanFramework(String(rawForm.framework || "")),
      topic: String(rawForm.topic || "").trim(),
      subject: String(rawForm.subject || "").trim(),
      grade: String(rawForm.grade || "").trim(),
      days: Number(rawForm.days || 0),
      minutesPerDay: Number(rawForm.minutesPerDay || 0),
      objectives: String(rawForm.objectives || "").trim(),
      constraints: String(rawForm.constraints || "").trim(),
    };
    trackGaEvent("lesson_plan_generate", {
      action: "start",
      framework: normalizeLessonPlanFramework(formObj.framework),
      topic: String(formObj.topic || "").slice(0, 80),
      days: Number(formObj.days || 0),
      minutes_per_day: Number(formObj.minutesPerDay || 0),
      lite_mode: liteMode,
    });
    setFormDataObject(formObj);

    setLoading(true);
    setError(null);
    setLessonPlan(null);
    setCurrentLessonPlanId(null);
    setUsageInfo(null);
    setLessonSources([]);
    setLessonSourceTrace(null);
    setIsHistoryView(false);

    const shouldUseAsyncGeneration = shouldQueueLessonPlanGeneration({
      framework: String(formObj.framework || ""),
      topic: formObj.topic,
      subject: formObj.subject,
      grade: formObj.grade,
      objectives: String(formObj.objectives || ""),
      constraints: String(formObj.constraints || ""),
      days: Number(formObj.days || 0),
      minutesPerDay: Number(formObj.minutesPerDay || 0),
      adaptiveLaunch: Boolean(getInterventionLaunchContext()),
      format: "json",
    }).shouldQueue;

    try {
      generationAbortRef.current?.abort();
      const controller = new AbortController();
      generationAbortRef.current = controller;

      const res = await fetch("/api/generate-lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formObj,
          async: shouldUseAsyncGeneration,
          launchContext: getInterventionLaunchContext(),
        }),
        signal: controller.signal,
      });

      let data = await res.json().catch(() => ({}));

      if (res.status === 202 && data?.queued && data?.jobId) {
        persistPendingLessonGenerationJob({
          jobId: String(data.jobId),
          createdAt: Date.now(),
        });
        setInfoMessage("Queued. Processing lesson plan...");
        if (!data?.dispatched) {
          await fetch(`/api/generation-jobs/${data.jobId}/process`, {
            method: "POST",
            signal: controller.signal,
          }).catch(() => null);
        }
        data = await pollAsyncGenerationJob(String(data.jobId), controller.signal);
        persistPendingLessonGenerationJob(null);
        setInfoMessage(null);
      }
      
      if (!res.ok) {
        trackGaEvent("lesson_plan_generate", {
          action: "error",
          http_status: res.status,
        });
        if (res.status === 429) {
          setError(null);
          setInfoMessage(
            withRequestId(
              data?.message ||
                data?.error ||
                "Too many requests. Please wait a moment and try again.",
              data
            )
          );
          return;
        }
        if (res.status === 403 && data.error === "Not enough free lesson plan credits.") {
          const nextRechargeAt =
            typeof data?.nextRechargeAt === "string" ? new Date(data.nextRechargeAt) : null;
          const waitTime =
            nextRechargeAt && !Number.isNaN(nextRechargeAt.getTime())
              ? nextRechargeAt.toLocaleString()
              : "the next recharge window";
          setUsageInfo({
            remainingPoints: Number(data?.remainingPoints || 0),
            maxPoints: Number(data?.maxPoints || 100),
            requiredPoints: Number(data?.requiredPoints || 30),
            nextRechargeAt: data?.nextRechargeAt || null,
          });
          setError(null);
          setInfoMessage(
            withRequestId(
              `Not enough lesson plan credits. This lesson plan needs ${Number(data?.requiredPoints || 30)} credits. Please try again after ${waitTime}, or upgrade to Pro or Premium.`,
              data
            )
          );
          return;
        }
        if (res.status === 403 && data.error === "Premium required") {
          throw new Error(
            withRequestId(
              data.message || "Premium is required for downloads and PPTX generation.",
              data
            )
          );
        }
        throw new Error(
          withRequestId(data.error || data.message || "Failed to generate lesson plan", data)
        );
      }
      const generatedLessonPlan =
        data?.lessonPlan && typeof data.lessonPlan === "object"
          ? (data.lessonPlan as { framework?: unknown; days?: unknown })
          : null;
      trackGaEvent("lesson_plan_generate", {
        action: "success",
        framework: normalizeLessonPlanFramework(
          String(generatedLessonPlan?.framework || formObj.framework)
        ),
        day_count: Array.isArray(generatedLessonPlan?.days)
          ? generatedLessonPlan.days.length
          : 0,
        source_count: Array.isArray(data?.sources) ? data.sources.length : 0,
      });
      hydrateGeneratedLessonPlan(data as Record<string, unknown>, formObj);
      setLessonProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 120));
      
    } catch (err: unknown) {
      trackGaEvent("lesson_plan_generate", {
        action: err instanceof Error && err.name === "AbortError" ? "aborted" : "error",
      });
    if (err instanceof Error && err.name === "AbortError") {
      setError("Generation paused.");
      return;
    }
    persistPendingLessonGenerationJob(null);
    setError(getErrorMessage(err, "Failed to generate lesson plan"));
  } finally {
      generationAbortRef.current = null;
      setLoading(false);
    }
  }

  async function handleAssignLessonPlan() {
    if (!currentLessonPlanId || !selectedClassId || !assignmentTitle.trim()) return;

    setAssignLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          lessonPlanId: currentLessonPlanId,
          title: assignmentTitle.trim(),
          instructions: assignmentInstructions.trim() || null,
          availableFrom: assignmentAvailableFrom || null,
          dueAt: assignmentDueAt || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const assignmentPayload =
        data?.assignment && typeof data.assignment === "object"
          ? (data.assignment as { class?: { name?: unknown } })
          : null;
      if (!res.ok) {
        throw new Error(data?.error || "Failed to assign lesson plan");
      }
      setShowAssignModal(false);
      setInfoMessage(
        `Lesson plan assigned to ${
          typeof assignmentPayload?.class?.name === "string"
            ? assignmentPayload.class.name
            : "class"
        }.`
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to assign lesson plan"));
    } finally {
      setAssignLoading(false);
    }
  }

  function handleOpenAssignModal() {
    if (!lessonPlan) return;
    if (!currentLessonPlanId) {
      setError(null);
      setInfoMessage(
        "This lesson plan is not linked to a saved record yet. Generate or reopen a saved lesson plan first, then assign it to a class.",
      );
      return;
    }
    setShowAssignModal(true);
  }

  async function handleDeleteCurrentLessonPlan() {
    if (!currentLessonPlanId) return;

    setDeletingLessonPlan(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch(`/api/lesson-plans/${currentLessonPlanId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete lesson plan");
      }

      setLessonPlan(null);
      setCurrentLessonPlanId(null);
      setLessonSources([]);
      setLessonSourceTrace(null);
      setIsHistoryView(false);
      setPptxDeck(null);
      setPptxDeckSource("lesson_plan");
      setShowDeleteLessonPlanModal(false);
      await refreshLessonPlanHistory();
      setInfoMessage("Lesson plan deleted.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to delete lesson plan"));
    } finally {
      setDeletingLessonPlan(false);
    }
  }

  async function downloadLessonPlan(format: "docx" | "pdf" | "pptx" = "docx") {
    if (!lessonPlan || !formDataObject) return;

    if (format === "pptx") {
      setDownloadingPptx(true);
    } else if (format === "pdf") {
      setDownloadingPdf(true);
    } else {
      setDownloading(true);
    }

    try {
      if (format === "pptx" && !isPremium) {
        throw new Error("Premium is required to download lesson plan files.");
      }

      const queueRes = await fetch("/api/lesson-plan-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          lessonPlan,
          topic: formDataObject.topic || lessonPlan?.title || "Lesson Plan",
          subject: formDataObject.subject || lessonPlan?.subject || "General",
          grade: formDataObject.grade || lessonPlan?.grade || "General",
          days: Number(formDataObject.days || lessonPlan?.days || 1),
          minutesPerDay: Number(formDataObject.minutesPerDay || lessonPlan?.minutesPerDay || 40),
        }),
      });

      const queueData = await queueRes.json().catch(() => ({}));
      if (!queueRes.ok || !queueData?.jobId) {
        throw new Error(
          withRequestId(queueData?.error || "Failed to queue export job", queueData)
        );
      }

      const jobId = queueData.jobId as string;

      // Trigger processing immediately; this is compatible with future worker/cron setups.
      await fetch("/api/lesson-plan-export/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      }).catch(() => null);

      await pollExportJob(
        jobId,
        format,
        String(formDataObject.topic || "lesson_plan"),
        LESSON_EXPORT_POLL_TIMEOUT_MS
      );
    } catch (err: unknown) {
      console.error("Download error:", err);
      setError(getErrorMessage(err, "Failed to download."));
    } finally {
      if (format === "pptx") {
        setDownloadingPptx(false);
      } else if (format === "pdf") {
        setDownloadingPdf(false);
      } else {
        setDownloading(false);
      }
    }
  }

  async function downloadLessonPlanPdfFromUi() {
    if (!lessonPlanRef.current || !formDataObject) return;
    setDownloadingPdf(true);
    try {
      const element = lessonPlanRef.current;
      const styles = await collectStyles();
      const renderRoot = element.cloneNode(true) as HTMLElement;
      const tmp = document.createElement("div");
      tmp.id = "lessonplan-pdf-probe";
      tmp.style.position = "fixed";
      tmp.style.left = "-10000px";
      tmp.style.top = "0";
      tmp.style.width = `${element.clientWidth || 1024}px`;
      tmp.style.pointerEvents = "none";
      tmp.style.opacity = "0";
      tmp.appendChild(renderRoot);
      document.body.appendChild(tmp);

      // Dynamic pagination:
      // - keep a day card together when it fits in one A4 content area
      // - allow split only for oversized day cards to prevent clipping
      const approxA4ContentHeightPx = 980;
      renderRoot.querySelectorAll<HTMLElement>(".pdf-day-card").forEach((card) => {
        if (card.scrollHeight > approxA4ContentHeightPx) {
          card.classList.add("pdf-day-card-long");
        }
      });

      const extraCss = `
        <style>
          @page { size: A3; margin: 12mm 10mm; }
          body { background: white; margin: 0; }
          html, body { width: 100%; }
          [data-print-hidden] { display: none !important; }
          [data-pdf-hide] { display: none !important; }
          [data-pdf-only] { display: block !important; }
          [data-page-start] { break-before: page !important; page-break-before: always !important; }
          [data-page-end] { break-after: page !important; page-break-after: always !important; }
          [data-page-keep] { break-inside: avoid-page !important; page-break-inside: avoid !important; }
          [data-page-flow] { break-inside: auto !important; page-break-inside: auto !important; }
          [data-pdf-keep] { break-inside: auto; page-break-inside: auto; }
          .pdf-day-card { break-inside: avoid-page; page-break-inside: avoid; }
          .pdf-day-card-long { break-inside: auto; page-break-inside: auto; }
          /* Strict mode: each major titled section starts on a new page */
          .pdf-section-page {
            break-before: auto;
            page-break-before: auto;
            break-inside: auto;
            page-break-inside: auto;
            min-height: auto;
            display: block;
            padding-top: 0;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          .pdf-day-card .pdf-section-page:first-of-type {
            break-before: auto;
            page-break-before: auto;
          }
          .pdf-section-title { text-align: center !important; justify-content: center !important; margin-top: 0 !important; }
          .pdf-day-card .mb-10, .pdf-day-card .mt-10, .pdf-day-card .mt-8 { margin-top: 8px !important; margin-bottom: 8px !important; }
          .shadow-2xl, .shadow-xl, .shadow-lg, .shadow, [class*="shadow-"] { box-shadow: none !important; }
          .pdf-header {
            border-bottom: 2px solid #e5e7eb;
            padding: 16px 0 12px;
            margin-bottom: 16px;
          }
          .pdf-header-title { font-size: 20px; font-weight: 700; color: #111827; }
          .pdf-header-meta { font-size: 12px; color: #4b5563; margin-top: 6px; }
          .pdf-summary {
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 12px;
            background: #f8fafc;
          }
          .pdf-summary-title { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 6px; }
          .pdf-summary-line { font-size: 12px; color: #4b5563; }
          .overflow-hidden { overflow: visible !important; }
          .truncate { overflow: visible !important; text-overflow: clip !important; white-space: normal !important; }
          .text-ellipsis { text-overflow: clip !important; }
          .whitespace-nowrap { white-space: normal !important; }
          .min-w-0 { min-width: 0 !important; }
          .backdrop-blur-sm { backdrop-filter: none !important; }
          .line-clamp-1, .line-clamp-2, .line-clamp-3, .line-clamp-4, .line-clamp-5, .line-clamp-6 {
            display: block !important;
            -webkit-line-clamp: unset !important;
            overflow: visible !important;
          }
          [class*="max-h-"] { max-height: none !important; }
          [class*="overflow-y-"] { overflow-y: visible !important; }
          [class*="overflow-x-"] { overflow-x: visible !important; }
          .flex-wrap { flex-wrap: wrap !important; }
        </style>
      `;

      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${formDataObject.topic || "lesson_plan"}</title>
            ${styles}
            ${extraCss}
          </head>
          <body>
            ${renderRoot.outerHTML}
          </body>
        </html>
      `;

      const res = await fetch("/api/lesson-plan-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          title: formDataObject.topic || "lesson_plan",
          pageSize: "A3",
        }),
      });
      if (tmp.parentElement) {
        tmp.parentElement.removeChild(tmp);
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${formDataObject.topic || "lesson_plan"}.pdf`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err: unknown) {
      console.error("PDF UI download error:", err);
      setError(getErrorMessage(err, "Failed to download PDF."));
    } finally {
      const leftover = document.getElementById("lessonplan-pdf-probe");
      if (leftover?.parentElement) {
        leftover.parentElement.removeChild(leftover);
      }
      setDownloadingPdf(false);
    }
  }

  async function retryPendingExportDownload() {
    if (!pendingExportJobs.length) {
      setError(null);
      setInfoMessage("No pending export found.");
      return;
    }

    const latest = pendingExportJobs[0];
    setRetryingPendingExport(true);
    try {
      if (latest.canRetry) {
        setError(null);
        setInfoMessage(`Retrying ${latest.format.toUpperCase()} export...`);
        updatePendingExportJob(latest.jobId, {
          status: "queued",
          stageLabel: `Queued ${latest.format.toUpperCase()} export`,
          progress: 18,
          canRetry: false,
        });
        await fetch("/api/lesson-plan-export/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: latest.jobId }),
        }).catch(() => null);
      }
      await pollExportJob(
        latest.jobId,
        latest.format,
        latest.topic || String(formDataObject?.topic || "lesson_plan"),
        LESSON_EXPORT_POLL_TIMEOUT_MS
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to retry export download."));
    } finally {
      setRetryingPendingExport(false);
    }
  }

  async function loadPptxSlidesForEdit() {
    if (!lessonPlan || !formDataObject) return;
    if (!isPremium) {
      setError("Premium is required to edit and download PPTX.");
      return;
    }
    setSlidesLoadingStage(LESSON_PLAN_SLIDES_PROGRESS.stage);
    setSlidesLoadingLabel(LESSON_PLAN_SLIDES_PROGRESS.label);
    setLoadingSlides(true);
    try {
      const res = await fetch("/api/lesson-plan-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonPlan,
          topic: formDataObject.topic,
          subject: formDataObject.subject,
          grade: formDataObject.grade,
          duration: `${formDataObject.days} day(s), ${formDataObject.minutesPerDay} minutes per day`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(withRequestId(data.error || "Failed to generate slides.", data));
      }
      setPptxDeck(data.deck);
      setPptxDeckSource("lesson_plan");
      setShowPptxEditor(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to generate slides."));
    } finally {
      setLoadingSlides(false);
    }
  }

  function openLessonPlanUploadPicker() {
    if (loadingSlides) return;
    const formSnapshot = getCurrentLessonUploadConfig();
    setLessonUploadFramework(formSnapshot.framework);
    setLessonUploadDays(String(formSnapshot.days));
    setLessonUploadMinutesPerDay(String(formSnapshot.minutesPerDay));
    setLessonUploadTopic(formSnapshot.topic);
    setLessonUploadSubject(formSnapshot.subject);
    setLessonUploadGrade(formSnapshot.grade);
    setShowLessonUploadConfigModal(true);
  }

  function getCurrentLessonUploadConfig(): LessonMaterialUploadConfig {
    const rawForm = lessonFormRef.current ? Object.fromEntries(new FormData(lessonFormRef.current).entries()) : {};
    const rawDays = Number(rawForm.days || formDataObject?.days || lessonTemplateDefaults.days || 1);
    const rawMinutes = Number(
      rawForm.minutesPerDay || formDataObject?.minutesPerDay || lessonTemplateDefaults.minutesPerDay || 40
    );

    return {
      framework: normalizeLessonPlanFramework(
        String(rawForm.framework || formDataObject?.framework || selectedFramework)
      ),
      topic: String(rawForm.topic || formDataObject?.topic || lessonTemplateDefaults.topic || "").trim(),
      subject: String(rawForm.subject || formDataObject?.subject || lessonTemplateDefaults.subject || "").trim(),
      grade: String(rawForm.grade || formDataObject?.grade || lessonTemplateDefaults.grade || "").trim(),
      days: Number.isFinite(rawDays) ? Math.min(Math.max(Math.trunc(rawDays), 1), 7) : 1,
      minutesPerDay: Number.isFinite(rawMinutes) ? Math.min(Math.max(Math.trunc(rawMinutes), 10), 120) : 40,
    };
  }

  async function handleLessonPlanFileUpload(
    file: File,
    uploadConfig?: LessonMaterialUploadConfig
  ) {
    if (!file) return;
    setShowLessonUploadConfigModal(false);
    setError(null);
    setInfoMessage(null);
    setSlidesLoadingStage(LESSON_PLAN_UPLOAD_SLIDES_PROGRESS.stage);
    setSlidesLoadingLabel(LESSON_PLAN_UPLOAD_SLIDES_PROGRESS.label);
    setLoadingSlides(true);
    try {
      const effectiveUploadConfig = uploadConfig || getCurrentLessonUploadConfig();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("async", "true");
      formData.append("framework", effectiveUploadConfig.framework);
      formData.append("days", String(effectiveUploadConfig.days));
      formData.append("minutesPerDay", String(effectiveUploadConfig.minutesPerDay));
      formData.append(
        "duration",
        `${effectiveUploadConfig.days} day(s), ${effectiveUploadConfig.minutesPerDay} minutes per day`
      );
      if (effectiveUploadConfig.topic) formData.append("topic", effectiveUploadConfig.topic);
      if (effectiveUploadConfig.subject) formData.append("subject", effectiveUploadConfig.subject);
      if (effectiveUploadConfig.grade) formData.append("grade", effectiveUploadConfig.grade);

      const res = await fetch("/api/lesson-material-from-file", {
        method: "POST",
        body: formData,
      });
      let data = await res.json().catch(() => ({}));
      if (res.status === 202 && data?.queued && data?.jobId) {
        persistPendingLessonGenerationJob({
          jobId: String(data.jobId),
          createdAt: Date.now(),
        });
        setInfoMessage("Queued. Processing uploaded lesson file...");
        if (!data?.dispatched) {
          await fetch(`/api/generation-jobs/${data.jobId}/process`, {
            method: "POST",
          }).catch(() => null);
        }
        data = await pollAsyncGenerationJob(String(data.jobId));
        persistPendingLessonGenerationJob(null);
        setInfoMessage(null);
      }
      if (!res.ok) {
        if (res.status === 429) {
          setError(null);
          setInfoMessage(
            withRequestId(
              data?.message ||
                data?.error ||
                "Too many requests. Please wait a moment and try again.",
              data
            )
          );
          return;
        }
        if (data?.usage && typeof data.usage === "object") {
          setLessonMaterialUploadUsage({
            remainingPoints: Number(data.usage.remainingPoints || 0),
            maxPoints: Number(data.usage.maxPoints || 100),
            requiredPoints: Number(data.usage.requiredPoints || 40),
            resetAtMs:
              typeof data?.usage?.nextRechargeAt === "string"
                ? new Date(data.usage.nextRechargeAt).getTime()
                : null,
          });
        }
        throw new Error(
          withRequestId(
            data?.error || data?.message || "Failed to generate lesson material",
            data
          )
        );
      }

      setPptxDeck(data.deck);
      setPptxDeckSource("lesson_material_upload");
      setShowPptxEditor(true);
      setShowLessonUploadConfigModal(false);
      if (data?.usage && typeof data.usage === "object") {
        setLessonMaterialUploadUsage({
          remainingPoints: Number(data.usage.remainingPoints || 0),
          maxPoints: Number(data.usage.maxPoints || 100),
          requiredPoints: Number(data.usage.requiredPoints || 40),
          resetAtMs:
            typeof data?.usage?.nextRechargeAt === "string"
              ? new Date(data.usage.nextRechargeAt).getTime()
              : null,
        });
      }
      setInfoMessage("Uploaded lesson plan converted to editable slides.");
    } catch (err: unknown) {
      persistPendingLessonGenerationJob(null);
      setError(getErrorMessage(err, "Failed to generate lesson material from uploaded file."));
    } finally {
      setLoadingSlides(false);
      if (uploadLessonPlanInputRef.current) {
        uploadLessonPlanInputRef.current.value = "";
      }
    }
  }

  function shouldKeepSpecificActivities(day: LessonPlanDay | null | undefined) {
    const activities = day?.specificActivities || {};
    const q1 = Array.isArray(activities?.ACTIVITY?.questions) ? activities.ACTIVITY.questions.length : 0;
    const q2 = Array.isArray(activities?.ANALYSIS?.trueFalse) ? activities.ANALYSIS.trueFalse.length : 0;
    const q3 = Array.isArray(activities?.APPLICATION?.multipleChoice)
      ? activities.APPLICATION.multipleChoice.length
      : 0;
    const q4 = Array.isArray(activities?.APPLICATION?.identification?.clues)
      ? activities.APPLICATION.identification.clues.length
      : 0;
    return q1 + q2 + q3 + q4 <= 12;
  }

  function shouldKeepAssessment(day: LessonPlanDay | null | undefined) {
    const count = Array.isArray(day?.assessment) ? day.assessment.length : 0;
    return count <= 2;
  }

  async function downloadEditedPptx(deckOverride?: PptDeck | null) {
    const deckToExport = deckOverride || pptxDeck;
    if (!deckToExport) return;
    setDownloadingPptx(true);
    try {
      const res = await fetch("/api/generate-lesson-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck: deckToExport, source: pptxDeckSource }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(null);
          setInfoMessage(
            withRequestId(
              data?.message ||
                data?.error ||
                "Too many requests. Please wait a moment and try again.",
              data
            )
          );
          return;
        }
        const text = JSON.stringify(data || {});
        throw new Error(withRequestIdFromText("Failed to generate PPTX", text));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${deckToExport.title || "Lesson_Plan"}.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to generate PPTX"));
    } finally {
      setDownloadingPptx(false);
    }
  }

  async function collectStyles() {
    const styleTags = Array.from(document.querySelectorAll("style"));
    const linkTags = Array.from(document.querySelectorAll("link[rel='stylesheet']")) as HTMLLinkElement[];
    const inlineStyles = styleTags.map((s) => s.outerHTML).join("\n");

    const linkedCss: string[] = [];
    for (const link of linkTags) {
      try {
        const href = link.href;
        if (!href) continue;
        const res = await fetch(href);
        if (res.ok) {
          const css = await res.text();
          linkedCss.push(`<style>${css}</style>`);
        }
      } catch {
        // ignore missing stylesheet
      }
    }

    return `${inlineStyles}\n${linkedCss.join("\n")}`;
  }

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (infoMessage) {
      const timer = setTimeout(() => {
        setInfoMessage(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [infoMessage]);

  useEffect(() => {
    const title = String(lessonPlan?.title || "").trim();
    if (!title) return;
    setAssignmentTitle(`${title} Assignment`);
  }, [lessonPlan?.title]);

  const isPausedMessage = error?.trim().toLowerCase() === "generation paused.";
  const lessonPlanTourSteps = [
    {
      element: "#lessonplan-adaptive-context",
      popover: {
        title: "Adaptive Lesson Context",
        description:
          "Bring in class-result patterns and intervention guidance here to shape a stronger follow-up lesson plan.",
      },
    },
    {
      element: "#lessonplan-topic",
      popover: {
        title: "Set the topic",
        description:
          "Enter the lesson topic first, then fill subject and grade level.",
      },
    },
    {
      element: "#lessonplan-subject",
      popover: {
        title: "Set the subject",
        description: "Add the subject area for this lesson plan.",
      },
    },
    {
      element: "#lessonplan-framework",
      popover: {
        title: "Instructional framework",
        description:
          "Choose the lesson framework here so the generated plan follows the right teaching structure.",
      },
    },
    {
      element: "#lessonplan-grade",
      popover: {
        title: "Set the grade",
        description: "Enter the target grade or year level.",
      },
    },
    {
      element: "#lessonplan-days",
      popover: {
        title: "Choose duration",
        description:
          "Set number of days (max 7) and minutes per day to control scope.",
      },
    },
    {
      element: "#lessonplan-minutes",
      popover: {
        title: "Set minutes per day",
        description: "Choose how many minutes each day will cover.",
      },
    },
    {
      element: "#lessonplan-objectives",
      popover: {
        title: "Learning objectives",
        description: "Optional: add target outcomes to guide generation.",
      },
    },
    {
      element: "#lessonplan-constraints",
      popover: {
        title: "Special constraints",
        description: "Optional: add rules, requirements, or limitations.",
      },
    },
    {
      element: "#lessonplan-generate",
      popover: {
        title: "Generate plan",
        description:
          "Generate the lesson plan here, then move it into class-linked planning and follow-up workflow.",
      },
    },
    {
      element: "#lessonplan-copy-template-link",
      popover: {
        title: "Copy template link",
        description:
          "Copy a shareable URL with current lesson inputs prefilled.",
      },
    },
    {
      element: "#lessonplan-share-template-link",
      popover: {
        title: "Share template",
        description:
          "Share your current lesson input template using the device share menu.",
      },
    },
    {
      element: "#lessonplan-upload-file",
      popover: {
        title: "Upload Lesson File",
        description:
          "Upload a lesson plan file (PDF, DOCX, PPTX, XLSX, TXT, CSV, MD) to generate editable slides.",
      },
    },
    {
      element: "#lessonplan-history",
      popover: {
        title: "Recent plans",
        description:
          "Reload recent plans and continue using them as reusable class workflow assets.",
      },
    },
    {
      element: "#lessonplan-assign-class",
      popover: {
        title: "Assign To Class",
        description:
          "After generating a lesson plan, attach it to a class so it becomes part of planning history and the wider teacher workflow.",
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-transparent">
      <ConfirmActionModal
        open={showDeleteLessonPlanModal}
        onOpenChange={setShowDeleteLessonPlanModal}
        title="Delete lesson plan?"
        description="This will permanently remove the saved lesson plan from your workflow and history."
        confirmLabel="Delete Lesson Plan"
        loading={deletingLessonPlan}
        onConfirm={handleDeleteCurrentLessonPlan}
      />
      <style jsx global>{`
        @media print {
          html,
          body {
            background: #fff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #lessonplan-print-root,
          #lessonplan-print-root * {
            visibility: visible !important;
          }
          #lessonplan-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          [data-print-hidden] {
            display: none !important;
          }
          [data-page-start] { break-before: page !important; page-break-before: always !important; }
          [data-page-end] { break-after: page !important; page-break-after: always !important; }
          [data-page-keep] { break-inside: avoid-page !important; page-break-inside: avoid !important; }
          [data-page-flow] { break-inside: auto !important; page-break-inside: auto !important; }
          /* Reduce unwanted hard page breaks in browser print */
          #lessonplan-print-root [data-pdf-page],
          #lessonplan-print-root .pdf-day-card,
          #lessonplan-print-root .pdf-section-page {
            break-before: auto !important;
            page-break-before: auto !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          /* Keep visual cards together when possible */
          #lessonplan-print-root .rounded-2xl,
          #lessonplan-print-root .rounded-xl,
          #lessonplan-print-root .border-2 {
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
          }
          /* Tighter print spacing to avoid whitespace-driven breaks */
          #lessonplan-print-root .mt-10,
          #lessonplan-print-root .mt-8,
          #lessonplan-print-root .mb-10,
          #lessonplan-print-root .mb-8 {
            margin-top: 10px !important;
            margin-bottom: 10px !important;
          }
        }
      `}</style>
      {!liteMode && <Tour steps={lessonPlanTourSteps} tourId="lessonplan-generator" />}
      {/* Header */}
      <div className="relative text-center rounded-3xl border border-indigo-200/50 bg-linear-to-r from-slate-950 via-indigo-900 to-cyan-800 p-4 sm:p-6 shadow-[0_20px_55px_-20px_rgba(30,64,175,0.65)] overflow-hidden">
        <div className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-20 h-44 w-44 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative z-10 mb-4 flex items-center justify-end gap-2">
          <LiteModeBadge className="static" />
          <button
            id="lessonplan-history"
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/35 bg-white/15 text-white shadow-sm transition hover:bg-white/30 hover:text-white hover:border-cyan-200 hover:shadow-[0_0_0_2px_rgba(103,232,249,0.35)]"
            aria-label="Open recent lesson plans"
            title="Recent lesson plans"
            data-print-hidden
          >
            <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Lesson Plan Generator
        </h1>
        <p className="text-blue-100 text-base sm:text-lg max-w-3xl mx-auto">
          {frameworkConfig.description}
        </p>
        
        {/* Framework Overview Cards */}
        <div className="mt-8 flex flex-wrap items-stretch justify-center gap-4 max-w-6xl mx-auto">
          {frameworkConfig.cards.map((item, idx) => (
            <div
              key={idx}
              className="w-full max-w-[320px] sm:w-[280px] lg:w-[260px] xl:w-[280px] p-4 rounded-2xl border border-white/15 bg-white/95 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.55)] dark:bg-slate-900/85 dark:border-slate-700/80"
            >
              <div className="flex items-center justify-center mb-3">
                <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500">
                  {idx === 0 ? (
                    <Target className="h-6 w-6 text-white" />
                  ) : idx === 1 ? (
                    <Search className="h-6 w-6 text-white" />
                  ) : idx === 2 ? (
                    <BookOpen className="h-6 w-6 text-white" />
                  ) : (
                    <Zap className="h-6 w-6 text-white" />
                  )}
                </div>
              </div>
              <p className="font-bold text-slate-900 text-center mb-1 dark:text-white">{item.title}</p>
              <p className="text-sm text-slate-600 text-center mb-2 dark:text-slate-300">{item.subtitle}</p>
              <p className="text-xs text-slate-500 text-center dark:text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {adaptiveWorkflowEnabled && adaptiveWorkspaceSummary?.summary ? (
        <section
          id="lessonplan-adaptive-context"
          className="rounded-2xl border border-cyan-200/80 bg-linear-to-br from-cyan-50 to-white p-4 shadow-[0_10px_30px_-18px_rgba(8,145,178,0.35)]"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-cyan-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-cyan-700">
                  Adaptive Lesson Context
                </span>
                {adaptiveWorkspaceSummary.primaryClassName ? (
                  <span className="inline-flex rounded-full border border-cyan-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {adaptiveWorkspaceSummary.primaryClassName}
                  </span>
                ) : null}
              </div>
              <p className="text-sm font-medium text-slate-900">
                {adaptiveWorkspaceSummary.summary}
              </p>
              <p className="text-xs text-slate-500">
                {adaptiveWorkspaceSummary.recommendation}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => applyAdaptiveLessonContext("replace")}
                className="inline-flex max-w-md flex-col items-start justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-4 py-3 text-left shadow-[0_10px_24px_-18px_rgba(8,145,178,0.9)] transition hover:-translate-y-0.5 hover:from-cyan-700 hover:to-sky-700"
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold leading-5 text-white">
                  <BrainCircuit className="h-4 w-4 shrink-0" />
                  Use Adaptive Context
                </span>
                <span className="mt-1 text-[11px] font-medium leading-4 text-cyan-100/95">
                  Replace the current lesson guidance with the strongest adaptive follow-up context.
                </span>
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Form Section */}
      <LessonPlanInputForm
        lessonTemplateKey={lessonTemplateKey}
        lessonTemplateDefaults={lessonTemplateDefaults}
        selectedFramework={selectedFramework}
        lessonFormRef={lessonFormRef}
              loading={loading}
              loadingSlides={loadingSlides}
              lessonPlanExists={Boolean(lessonPlan)}
              downloadingPptx={downloadingPptx}
              lessonProgress={lessonProgress}
              slidesLoadingStage={slidesLoadingStage}
              slidesProgress={slidesProgress}
              slidesLoadingLabel={slidesLoadingLabel}
              pptxProgress={pptxProgress}
        isFree={isFree}
        usageInfo={usageInfo}
        lessonMaterialUploadUsage={lessonMaterialUploadUsage}
        countdownNowMs={countdownNowMs}
        infoMessage={infoMessage}
        error={error}
        isPausedMessage={isPausedMessage}
        uploadLessonPlanInputRef={uploadLessonPlanInputRef}
        onSubmit={(e) => {
          e.preventDefault();
          generateLessonPlan(new FormData(e.currentTarget));
        }}
        onPause={pauseLessonPlanGeneration}
        onCopyTemplateLink={copyLessonTemplateLink}
        onShareTemplateLink={shareLessonTemplateLink}
        onOpenUploadPicker={openLessonPlanUploadPicker}
        onHandleFileUpload={(file) => {
          void handleLessonPlanFileUpload(file, {
            framework: lessonUploadFramework,
            topic: lessonUploadTopic,
            subject: lessonUploadSubject,
            grade: lessonUploadGrade,
            days: Math.min(Math.max(Number(lessonUploadDays) || 1, 1), 7),
            minutesPerDay: Math.min(Math.max(Number(lessonUploadMinutesPerDay) || 40, 10), 120),
          });
        }}
        onFrameworkChange={setSelectedFramework}
      />

      <Dialog
        open={showLessonUploadConfigModal}
        onOpenChange={(open) => {
          if (loadingSlides) return;
          setShowLessonUploadConfigModal(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Prepare File-To-PPTX Upload</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Choose the lesson structure settings to use before selecting your file.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Instructional Framework
              </label>
              <select
                value={lessonUploadFramework}
                onChange={(event) =>
                  setLessonUploadFramework(
                    normalizeLessonPlanFramework(event.target.value)
                  )
                }
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {Object.values(LESSON_PLAN_FRAMEWORKS).map((framework) => (
                  <option key={framework.id} value={framework.id}>
                    {framework.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Number of Days
                </label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={lessonUploadDays}
                  onChange={(event) => setLessonUploadDays(event.target.value)}
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Minutes Per Day
                </label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={lessonUploadMinutesPerDay}
                  onChange={(event) => setLessonUploadMinutesPerDay(event.target.value)}
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLessonUploadConfigModal(false)}
                className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-zinc-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => uploadLessonPlanInputRef.current?.click()}
                className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Choose File
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated Lesson Plan */}
      {lessonPlan && (
        <LessonPlanOutputPanel
          lessonPlan={lessonPlan}
          lessonPlanRef={lessonPlanRef}
          lessonSources={lessonSources}
          lessonSourceTrace={lessonSourceTrace}
          downloadingPdf={downloadingPdf}
          downloadingDocx={downloading}
          downloadingPptx={downloadingPptx}
          loadingSlides={loadingSlides}
          slidesLoadingLabel={slidesLoadingLabel}
          slidesProgress={slidesProgress}
          pptxProgress={pptxProgress}
          isPremium={isPremium}
          isFree={isFree}
          usageInfo={usageInfo}
          pendingExportJobs={pendingExportJobs}
          retryingPendingExport={retryingPendingExport}
          onDownloadPdf={downloadLessonPlanPdfFromUi}
          onDownloadDocx={() => {
            void downloadLessonPlan("docx");
          }}
          onRetryPendingExport={() => {
            void retryPendingExportDownload();
          }}
          onLoadPptxSlidesForEdit={() => {
            void loadPptxSlidesForEdit();
          }}
          onAssignToClass={handleOpenAssignModal}
          onDeleteLessonPlan={() => setShowDeleteLessonPlanModal(true)}
          canAssignToClass={Boolean(lessonPlan)}
          canDeleteLessonPlan={Boolean(currentLessonPlanId)}
          deletingLessonPlan={deletingLessonPlan}
          renderUsageIndicator={(usage) => <UsageIndicator usage={usage} />}
        >

            {/* Days */}
            <LessonPlanDaySections
              lessonPlan={lessonPlan}
              shouldKeepSpecificActivities={shouldKeepSpecificActivities}
              shouldKeepAssessment={shouldKeepAssessment}
              renderFourAsPhaseCard={(phase, idx) => (
                <FourAsPhaseCard key={idx} phase={phase} index={idx} />
              )}
              renderSpecificActivityCard={(phase, activity) => (
                <SpecificActivityCard key={phase} phase={phase} activity={activity} />
              )}
            />
        </LessonPlanOutputPanel>
      )}

      <LessonPlanAssignModal
        open={showAssignModal}
        classes={classes}
        loadingClasses={loadingClasses}
        assignLoading={assignLoading}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        assignmentTitle={assignmentTitle}
        setAssignmentTitle={setAssignmentTitle}
        assignmentInstructions={assignmentInstructions}
        setAssignmentInstructions={setAssignmentInstructions}
        assignmentAvailableFrom={assignmentAvailableFrom}
        setAssignmentAvailableFrom={setAssignmentAvailableFrom}
        assignmentDueAt={assignmentDueAt}
        setAssignmentDueAt={setAssignmentDueAt}
        canSubmit={Boolean(currentLessonPlanId) && Boolean(selectedClassId) && Boolean(assignmentTitle.trim())}
        onClose={() => setShowAssignModal(false)}
        onSubmit={handleAssignLessonPlan}
      />

      <Dialog open={showPptxEditor} onOpenChange={setShowPptxEditor}>
        <DialogContent
          showCloseButton={false}
          className="!top-0 !left-0 !right-0 !bottom-0 !h-screen !w-screen !max-h-screen !max-w-none !translate-x-0 !translate-y-0 rounded-none border-0 bg-slate-100 p-0 shadow-none dark:bg-slate-950"
        >
          <DialogTitle className="sr-only">Edit PPTX Slides</DialogTitle>
          {downloadingPptx && (
            <div className="pointer-events-none absolute right-20 top-4 z-20 w-80">
              <LoadingProgress
                stage={LESSON_PLAN_PPTX_EXPORT_PROGRESS.stage}
                label={LESSON_PLAN_PPTX_EXPORT_PROGRESS.label}
                percent={pptxProgress}
              />
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            {pptxDeck && (
            <PptxEditor
              deck={pptxDeck}
              onChange={setPptxDeck}
              onDownload={downloadEditedPptx}
              loading={downloadingPptx}
              onClose={() => setShowPptxEditor(false)}
            />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {historyOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-[1px]"
          onClick={() => setHistoryOpen(false)}
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-linear-to-b from-slate-950 via-indigo-900 to-cyan-900 shadow-2xl border-l border-indigo-300/40 transform transition-transform duration-300 ${
          historyOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/20 bg-white/10">
          <h3 className="font-semibold text-white">Recent Lesson Plans</h3>
          <button
            onClick={() => setHistoryOpen(false)}
            className="p-2 rounded-md text-white/90 hover:bg-white/15"
            aria-label="Close history panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto h-full">
          {historyLoading && (
            <div className="space-y-3">
              <SkeletonLoading className="h-20 w-full bg-blue-100" />
              <SkeletonLoading className="h-20 w-full bg-blue-100" />
              <SkeletonLoading className="h-20 w-full bg-blue-100" />
            </div>
          )}
          {!historyLoading && dedupedHistoryPlans.length === 0 && (
            <div className="text-sm text-blue-100">
              No lesson plans saved yet.
            </div>
          )}
          {dedupedHistoryPlans.map((plan) => (
            <button
              key={plan.id}
              className="w-full rounded-xl border border-white/20 bg-white/95 p-3 text-left text-slate-900 transition shadow-[0_10px_20px_-14px_rgba(59,130,246,0.6)] hover:bg-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={() => {
                setLessonPlan(plan.data);
                setCurrentLessonPlanId(typeof plan?.id === "string" ? plan.id : null);
                setFormDataObject({
                  framework: normalizeLessonPlanFramework(plan?.data?.framework),
                  topic: plan.topic,
                  subject: plan.subject,
                  grade: plan.grade,
                  days: plan.days,
                  minutesPerDay: plan.minutesPerDay,
                });
                const historySources = Array.isArray(plan?.data?.__sources)
                  ? plan.data.__sources
                  : [];
                const historyTrace: LessonSourceTrace | null =
                  plan?.data?.__sourceTrace && typeof plan.data.__sourceTrace === "object"
                    ? {
                        mode:
                          plan.data.__sourceTrace.mode === "documents" ||
                          plan.data.__sourceTrace.mode === "semantic_cache"
                            ? plan.data.__sourceTrace.mode
                            : "none",
                        fromCache: Boolean(plan.data.__sourceTrace.fromCache),
                        sourceCount: Number(plan.data.__sourceTrace.sourceCount || 0),
                      }
                    : null;
                setLessonSources(historySources);
                setLessonSourceTrace(historyTrace);
                setSelectedFramework(normalizeLessonPlanFramework(plan?.data?.framework));
                setIsHistoryView(true);
                setHistoryOpen(false);
                setPptxDeck(null);
                setPptxDeckSource("lesson_plan");
              }}
            >
              <div className="font-semibold text-blue-900 dark:text-sky-200">
                {plan.title || `${plan.topic} - ${plan.subject}`}
              </div>
              <div className="text-xs text-blue-700 dark:text-slate-300">
                {plan.topic} - {plan.subject} - {plan.grade}
              </div>
              <div className="mt-1 text-xs text-blue-600/80 dark:text-slate-400">
                {new Date(plan.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
          <div className="h-24" />
        </div>
      </aside>
    </div>
  );
}
