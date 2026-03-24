
"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { 
  Clock,
  Target, Search, BookOpen, Zap,
  Brain,
} from "lucide-react";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Tour from "@/components/ui/tour";
import SkeletonLoading from "@/components/ui/skeleton-loading";
import LoadingProgress from "@/components/ui/loading-progress";
import LiteModeBadge from "@/components/ui/lite-mode-badge";
import { type SourceIcon } from "@/components/source-icons";
import { LessonPlanInputForm } from "@/components/lesson-plan/input-form";
import { LessonPlanOutputPanel } from "@/components/lesson-plan/output-panel";
import { LessonPlanDaySections } from "@/components/lesson-plan/day-sections";
import { FourAsPhaseCard, SpecificActivityCard } from "@/components/lesson-plan/activity-cards";
import { trackGaEvent } from "@/lib/ga-client";
import {
  getLessonPlanFramework,
  normalizeLessonPlanFramework,
  type LessonPlanFrameworkId,
} from "@/lib/lesson-plan-frameworks";

const PptxEditor = dynamic(() => import("@/components/lesson-plan/pptx-editor"), {
  ssr: false,
});

const FREE_PLAN_LIMIT = 3;
const LESSON_EXPORT_POLL_TIMEOUT_MS = 10 * 60 * 1000;
const LESSON_EXPORT_LOCALSTORAGE_KEY = "lessonPlanPendingExports";
type PendingExportJob = {
  jobId: string;
  format: "docx" | "pdf" | "pptx";
  topic: string;
  createdAt: number;
};

// Usage Indicator Component
function UsageIndicator({ usage }: { usage: any }) {
  if (!usage) return null;
  
  const used = usage.used || 0;
  const limit = usage.limit || FREE_PLAN_LIMIT;
  const percentage = Math.min((used / limit) * 100, 100);
  const nextReset = usage.nextReset ? new Date(usage.nextReset) : null;
  
  const getTimeUntilReset = () => {
    if (!nextReset) return "";
    const now = new Date();
    const diffMs = nextReset.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Resets soon";
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `Resets in ${hours}h ${minutes}m`;
  };
  
  return (
    <div className="mt-4 p-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-blue-700">Free Plan Usage</span>
        </div>
        <span className="text-sm text-blue-600 font-medium bg-white px-2 py-1 rounded">
          {used}/{limit} lesson plans
        </span>
      </div>
      <div className="w-full bg-blue-100 rounded-full h-2.5 mb-2">
        <div 
          className={`h-2.5 rounded-full transition-all duration-300 ${
            percentage >= 90 ? "bg-red-500" : 
            percentage >= 70 ? "bg-yellow-500" : "bg-linear-to-r from-blue-500 to-indigo-500"
          }`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-blue-600 font-medium">
          {used === limit ? "Limit reached" : `${limit - used} remaining`}
        </span>
        <span className="text-blue-500 font-medium">
          {getTimeUntilReset()}
        </span>
      </div>
    </div>
  );
}

// Main Component
export default function LessonPlanPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);
  const [formDataObject, setFormDataObject] = useState<any>(null);
  const [usageInfo, setUsageInfo] = useState<any>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free");
  const [liteMode, setLiteMode] = useState(false);
  const [pptxDeck, setPptxDeck] = useState<any | null>(null);
  const [pptxDeckSource, setPptxDeckSource] = useState<"lesson_plan" | "lesson_material_upload">(
    "lesson_plan"
  );
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [slidesLoadingLabel, setSlidesLoadingLabel] = useState(
    "Preparing editable PPTX slides..."
  );
  const [lessonProgress, setLessonProgress] = useState(0);
  const [slidesProgress, setSlidesProgress] = useState(0);
  const [pptxProgress, setPptxProgress] = useState(0);
  const [pendingExportJobs, setPendingExportJobs] = useState<PendingExportJob[]>([]);
  const [retryingPendingExport, setRetryingPendingExport] = useState(false);
  const [showPptxEditor, setShowPptxEditor] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<LessonPlanFrameworkId>(
    normalizeLessonPlanFramework(searchParams.get("framework"))
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPlans, setHistoryPlans] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [lessonSources, setLessonSources] = useState<SourceIcon[]>([]);
  const [lessonSourceTrace, setLessonSourceTrace] = useState<{
    mode: "none" | "documents" | "semantic_cache";
    fromCache: boolean;
    sourceCount: number;
  } | null>(null);
  const [lessonMaterialUploadUsage, setLessonMaterialUploadUsage] = useState<{
    used: number;
    limit: number;
    remaining: number;
    resetAtMs: number | null;
  } | null>(null);
  const [countdownNowMs, setCountdownNowMs] = useState(() => Date.now());
  const lessonPlanRef = useRef<HTMLDivElement | null>(null);
  const uploadLessonPlanInputRef = useRef<HTMLInputElement | null>(null);
  const lessonFormRef = useRef<HTMLFormElement | null>(null);
  const generationAbortRef = useRef<AbortController | null>(null);
  const ASYNC_JOB_POLL_INTERVAL_MS = 1500;
  const ASYNC_JOB_TIMEOUT_MS = 10 * 60 * 1000;
  const withRequestId = (message: string, payload: any) =>
    payload?.requestId ? `${message} (Ref: ${payload.requestId})` : message;
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
  const dedupedHistoryPlans = useMemo(() => {
    const seen = new Set<string>();
    const unique: any[] = [];
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
        setSubscriptionPlan(plan);
        if (plan === "free" || !plan) {
          const used = Number(data?.user?.lessonMaterialUploadUsage || 0);
          const limit = 3;
          const resetInSeconds = Number(data?.user?.lessonMaterialUploadResetInSeconds || 0);
          const resetAtMs = resetInSeconds > 0 ? Date.now() + resetInSeconds * 1000 : null;
          setLessonMaterialUploadUsage({
            used,
            limit,
            remaining: Math.max(limit - used, 0),
            resetAtMs,
          });
        } else {
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
      setHistoryLoading(true);
      try {
        const res = await fetch("/api/lesson-plans");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.plans)) {
          setHistoryPlans(data.plans);
        }
      } catch {
        // ignore
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort();
      generationAbortRef.current = null;
    };
  }, []);

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
            (job: any) =>
              typeof job?.jobId === "string" &&
              (job?.format === "docx" || job?.format === "pdf" || job?.format === "pptx")
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
      if (lastStatus === "completed") {
        await downloadCompletedExport(jobId, format, topic);
        removePendingExportJob(jobId);
        return;
      }

      if (lastStatus === "failed") {
        removePendingExportJob(jobId);
        throw new Error(withRequestId(statusData?.error || "Export job failed", statusData));
      }

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
    });
    setError(null);
    setInfoMessage("Still processing. We kept it running in the background. Click 'Download when ready' to retry.");
  };

  function pauseLessonPlanGeneration() {
    if (!generationAbortRef.current) return;
    generationAbortRef.current.abort();
    generationAbortRef.current = null;
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
    } as Record<string, any>;
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
    const formObj = Object.fromEntries(formData.entries());
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
    setUsageInfo(null);
    setLessonSources([]);
    setLessonSourceTrace(null);
    setIsHistoryView(false);

    try {
      generationAbortRef.current?.abort();
      const controller = new AbortController();
      generationAbortRef.current = controller;

      const res = await fetch("/api/generate-lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formObj, async: true }),
        signal: controller.signal,
      });

      let data = await res.json().catch(() => ({}));

      if (res.status === 202 && data?.queued && data?.jobId) {
        setInfoMessage("Queued. Processing lesson plan...");
        if (!data?.dispatched) {
          await fetch(`/api/generation-jobs/${data.jobId}/process`, {
            method: "POST",
            signal: controller.signal,
          }).catch(() => null);
        }
        data = await pollAsyncGenerationJob(String(data.jobId), controller.signal);
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
        if (res.status === 403 && data.error === "Free limit reached") {
          const resetInSeconds = Number(data?.resetInSeconds || 0);
          const hh = Math.floor(resetInSeconds / 3600);
          const mm = Math.floor((resetInSeconds % 3600) / 60);
          const ss = Math.floor(resetInSeconds % 60);
          const waitTime =
            resetInSeconds > 0
              ? `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
              : "about 3 hours";
          setError(null);
          setInfoMessage(
            withRequestId(
              `Free limit reached. You can generate up to ${FREE_PLAN_LIMIT} lesson plans every 3 hours. Try Pro or Premium now. Please try again in ${waitTime}.`,
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
      
      setLessonPlan(data.lessonPlan);
      setSelectedFramework(normalizeLessonPlanFramework(data?.lessonPlan?.framework || formObj.framework));
      trackGaEvent("lesson_plan_generate", {
        action: "success",
        framework: normalizeLessonPlanFramework(data?.lessonPlan?.framework || formObj.framework),
        day_count: Array.isArray(data?.lessonPlan?.days)
          ? data.lessonPlan.days.length
          : 0,
        source_count: Array.isArray(data?.sources) ? data.sources.length : 0,
      });
      setUsageInfo(data.usage);
      setLessonSources(Array.isArray(data.sources) ? data.sources : []);
      setLessonSourceTrace(
        data?.sourceTrace && typeof data.sourceTrace === "object"
          ? {
              mode:
                data.sourceTrace.mode === "documents" ||
                data.sourceTrace.mode === "semantic_cache"
                  ? data.sourceTrace.mode
                  : "none",
              fromCache: Boolean(data.sourceTrace.fromCache),
              sourceCount: Number(data.sourceTrace.sourceCount || 0),
            }
          : null
      );
      setIsHistoryView(false);
      setLessonProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 120));
      
    } catch (err: any) {
      trackGaEvent("lesson_plan_generate", {
        action: err?.name === "AbortError" ? "aborted" : "error",
      });
      if (err?.name === "AbortError") {
        setError("Generation paused.");
        return;
      }
      setError(err.message || "Failed to generate lesson plan");
    } finally {
      generationAbortRef.current = null;
      setLoading(false);
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
    } catch (err: any) {
      console.error("Download error:", err);
      setError(err?.message || "Failed to download.");
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
    } catch (err: any) {
      console.error("PDF UI download error:", err);
      setError(err?.message || "Failed to download PDF.");
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
      await pollExportJob(
        latest.jobId,
        latest.format,
        latest.topic || String(formDataObject?.topic || "lesson_plan"),
        LESSON_EXPORT_POLL_TIMEOUT_MS
      );
    } catch (err: any) {
      setError(err?.message || "Failed to retry export download.");
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
    setSlidesLoadingLabel("Preparing editable PPTX slides...");
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
    } catch (err: any) {
      setError(err.message || "Failed to generate slides.");
    } finally {
      setLoadingSlides(false);
    }
  }

  function openLessonPlanUploadPicker() {
    if (loadingSlides) return;
    uploadLessonPlanInputRef.current?.click();
  }

  async function handleLessonPlanFileUpload(file: File) {
    if (!file) return;
    setError(null);
    setInfoMessage(null);
    setSlidesLoadingLabel("Parsing uploaded file and generating editable slides...");
    setLoadingSlides(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("async", "true");
      // Do not auto-inject current lesson form inputs into uploaded-file generation.
      // This keeps uploaded-file prompts based on file content unless backend defaults apply.

      const res = await fetch("/api/lesson-material-from-file", {
        method: "POST",
        body: formData,
      });
      let data = await res.json().catch(() => ({}));
      if (res.status === 202 && data?.queued && data?.jobId) {
        setInfoMessage("Queued. Processing uploaded lesson file...");
        if (!data?.dispatched) {
          await fetch(`/api/generation-jobs/${data.jobId}/process`, {
            method: "POST",
          }).catch(() => null);
        }
        data = await pollAsyncGenerationJob(String(data.jobId));
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
          const resetInSeconds = Number(data?.usage?.resetInSeconds || 0);
          const resetAtMs = resetInSeconds > 0 ? Date.now() + resetInSeconds * 1000 : null;
          setLessonMaterialUploadUsage({
            used: Number(data.usage.used || 0),
            limit: Number(data.usage.limit || 3),
            remaining: Number(data.usage.remaining || 0),
            resetAtMs,
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
      if (data?.usage && typeof data.usage === "object") {
        const resetInSeconds = Number(data?.usage?.resetInSeconds || 0);
        const resetAtMs = resetInSeconds > 0 ? Date.now() + resetInSeconds * 1000 : null;
        setLessonMaterialUploadUsage({
          used: Number(data.usage.used || 0),
          limit: Number(data.usage.limit || 3),
          remaining: Number(data.usage.remaining || 0),
          resetAtMs,
        });
      }
      setInfoMessage("Uploaded lesson plan converted to editable slides.");
    } catch (err: any) {
      setError(err?.message || "Failed to generate lesson material from uploaded file.");
    } finally {
      setLoadingSlides(false);
      if (uploadLessonPlanInputRef.current) {
        uploadLessonPlanInputRef.current.value = "";
      }
    }
  }

  function shouldKeepSpecificActivities(day: any) {
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

  function shouldKeepAssessment(day: any) {
    const count = Array.isArray(day?.assessment) ? day.assessment.length : 0;
    return count <= 2;
  }

  async function downloadEditedPptx(deckOverride?: any) {
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
    } catch (err: any) {
      setError(err.message || "Failed to generate PPTX");
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

  const isPausedMessage = error?.trim().toLowerCase() === "generation paused.";
  const lessonPlanTourSteps = [
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
          "Click to generate. Use Pause anytime to stop an in-flight request.",
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
          "Open recent generated plans and reload one instantly.",
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-transparent">
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
        slidesProgress={slidesProgress}
        slidesLoadingLabel={slidesLoadingLabel}
        pptxProgress={pptxProgress}
        isFree={isFree}
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
          void handleLessonPlanFileUpload(file);
        }}
        onFrameworkChange={setSelectedFramework}
      />

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

      <Dialog open={showPptxEditor} onOpenChange={setShowPptxEditor}>
        <DialogContent
          showCloseButton={false}
          className="!top-0 !left-0 !right-0 !bottom-0 !h-screen !w-screen !max-h-screen !max-w-none !translate-x-0 !translate-y-0 rounded-none border-0 bg-slate-100 p-0 shadow-none dark:bg-slate-950"
        >
          <DialogTitle className="sr-only">Edit PPTX Slides</DialogTitle>
          {downloadingPptx && (
            <div className="pointer-events-none absolute right-20 top-4 z-20 w-80">
              <LoadingProgress
                label="Generating PPTX file..."
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
                const historyTrace =
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
