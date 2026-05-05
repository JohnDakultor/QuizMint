"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import { SourceIcon } from "@/components/source-icons";
import Tour from "@/components/ui/tour";
import { useSearchParams } from "next/navigation";
import { quizTourSteps } from "./tour-steps";
import { QuizInputCard } from "@/components/quiz/quiz-input-card";
import { QuizOutputCard } from "@/components/quiz/quiz-output-card";
import { QuizShareModal } from "@/components/quiz/quiz-share-modal";
import { QuizAssignModal } from "@/components/quiz/quiz-assign-modal";
import { QuizPageHeader } from "@/components/quiz/quiz-page-header";
import { AdaptiveSuggestionsPanel } from "@/components/quiz/adaptive-suggestions-panel";
import { QuizSubscribeModal } from "@/components/quiz/subscribe-modal";
import { trackGaEvent } from "@/lib/ga-client";
import type { GamifiedMode } from "@/lib/quiz-question-types";
import { shouldQueueQuizGeneration } from "@/lib/quiz-workload-routing";
import { hasPremiumFeaturePlan } from "@/lib/organization-subscription";
import { BrainCircuit } from "lucide-react";

function cleanAnswerMeta(value: unknown) {
  return String(value || "")
    .replace(/\n?__QMETA_V1__[A-Za-z0-9+/=]+$/g, "")
    .trim();
}

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

type QuizQuestion = {
  id?: number;
  question: string;
  options?: string[];
  answer: string;
  explanation?: string | null;
  hint?: string | null;
  [key: string]: unknown;
};

type QuizData = {
  title: string;
  instructions: string;
  questions: QuizQuestion[];
  [key: string]: unknown;
};

type QuizUser = {
  subscriptionPlan?: string | null;
  liteMode?: boolean;
  adaptiveLearning?: boolean;
  aiDifficulty?: string | null;
  freeQuizPoints?: number | null;
  freeQuizPointsMax?: number | null;
  freeQuizPointsRechargeAt?: string | null;
  [key: string]: unknown;
};

type FreeQuizPointsInfo = {
  remainingPoints: number;
  maxPoints: number;
  nextRechargeAt?: string | null;
  requiredPoints?: number;
  spentPoints?: number | null;
} | null;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const QUIZ_PENDING_JOB_STORAGE_KEY = "quizmintPendingQuizGeneration";

type PendingQuizGenerationJob = {
  jobId: string;
  createdAt: number;
};

export default function Dashboard() {
  const searchParams = useSearchParams();
  const getInterventionLaunchContext = useCallback(() => {
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
  }, [searchParams]);
  const [prompt, setPrompt] = useState("");
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [sources, setSources] = useState<SourceIcon[]>([]);
  const [lastLoaded, setLastLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [quizProgress, setQuizProgress] = useState(0);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [freeQuizPointsInfo, setFreeQuizPointsInfo] = useState<FreeQuizPointsInfo>(null);
  const [user, setUser] = useState<QuizUser | null>(null);
  const [adaptiveSuggestions, setAdaptiveSuggestions] = useState<string[]>([]);
  const [showAdaptivePanel, setShowAdaptivePanel] = useState(false);
  const [adaptiveWorkspaceSummary, setAdaptiveWorkspaceSummary] =
    useState<AdaptiveWorkspaceSummary | null>(null);
  const [forceFreshGeneration, setForceFreshGeneration] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareTimerMinutes, setShareTimerMinutes] = useState(60);
  const [timedAssessmentEnabled, setTimedAssessmentEnabled] = useState(false);
  const [assessmentTimerMinutes, setAssessmentTimerMinutes] = useState(20);
  const [shareShuffleQuestions, setShareShuffleQuestions] = useState(false);
  const [shareShuffleActive, setShareShuffleActive] = useState(false);
  const [shareOpen, setShareOpen] = useState<boolean | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [shareAssessmentDurationMinutes, setShareAssessmentDurationMinutes] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentInstructions, setAssignmentInstructions] = useState("");
  const [assignmentAvailableFrom, setAssignmentAvailableFrom] = useState("");
  const [assignmentDueAt, setAssignmentDueAt] = useState("");
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string | null>(null);
  const [currentAssignmentClassName, setCurrentAssignmentClassName] = useState<string | null>(null);
  const [numberOfItems, setNumberOfItems] = useState(10);
  const [questionMix, setQuestionMix] = useState({
    mcq: 0,
    trueFalse: 0,
    fillBlank: 0,
    shortAnswer: 0,
    matching: 0,
    essayRubric: 0,
    worksheet: 0,
    gamified: 0,
  });
  const [gamifiedMode, setGamifiedMode] = useState<GamifiedMode>("puzzle");
  const liteMode = Boolean(user?.liteMode);
  const isFreePlan = !user?.subscriptionPlan || user.subscriptionPlan === "free";
  const activeQuizPointCost = uploadedFiles.length > 0 ? 40 : 25;
  const isPremiumAdaptiveEnabled =
    hasPremiumFeaturePlan(user?.subscriptionPlan) && user?.adaptiveLearning === true;
  const hasAdaptiveClassContext = Boolean(adaptiveWorkspaceSummary?.summary);
  const generationAbortRef = useRef<AbortController | null>(null);
  const forcedGamifiedTourRef = useRef(false);
  const previousGamifiedCountRef = useRef(0);
  const ASYNC_JOB_POLL_INTERVAL_MS = 1500;
  const ASYNC_JOB_TIMEOUT_MS = 8 * 60 * 1000;
  const attachRequestId = (
    message: string,
    data: { requestId?: string | null } | null | undefined,
  ) => (data?.requestId ? `${message} (Ref: ${data.requestId})` : message);

  const syncFreeQuizPointsFromPayload = useCallback(
    (payload: Record<string, unknown> | null | undefined) => {
      if (!payload) return;
      const remainingPoints = Number(payload.remainingPoints);
      const maxPoints = Number(payload.maxPoints);
      const nextRechargeAt =
        typeof payload.nextRechargeAt === "string" ? payload.nextRechargeAt : null;
      const requiredPoints = Number(payload.requiredPoints);
      const spentPoints = Number(payload.spentPoints);

      if (Number.isFinite(remainingPoints) && Number.isFinite(maxPoints)) {
        setFreeQuizPointsInfo({
          remainingPoints,
          maxPoints,
          nextRechargeAt,
          requiredPoints: Number.isFinite(requiredPoints) ? requiredPoints : undefined,
          spentPoints: Number.isFinite(spentPoints) ? spentPoints : undefined,
        });
        setUser((current) =>
          current
            ? {
                ...current,
                freeQuizPoints: remainingPoints,
                freeQuizPointsMax: maxPoints,
                freeQuizPointsRechargeAt: nextRechargeAt,
              }
            : current
        );
      }
    },
    []
  );

  const persistPendingQuizJob = useCallback((job: PendingQuizGenerationJob | null) => {
    if (typeof window === "undefined") return;
    try {
      if (!job) {
        window.localStorage.removeItem(QUIZ_PENDING_JOB_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(QUIZ_PENDING_JOB_STORAGE_KEY, JSON.stringify(job));
    } catch {
      // ignore storage failures
    }
  }, []);

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
          attachRequestId(
            statusData?.error || "Failed to poll generation job",
            statusData
          )
        );
      }
      const status = String(statusData?.job?.status || "queued");
      if (status === "completed") {
        return statusData?.job?.result || {};
      }
      if (status === "failed") {
        throw new Error(
          attachRequestId(
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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user");
        if (!res.ok) return;
        const data = await res.json();
        const nextUser = (data?.user ?? null) as QuizUser | null;
        setUser(nextUser);
        if (
          nextUser &&
          (!nextUser.subscriptionPlan || nextUser.subscriptionPlan === "free") &&
          Number.isFinite(Number(nextUser.freeQuizPoints)) &&
          Number.isFinite(Number(nextUser.freeQuizPointsMax))
        ) {
          setFreeQuizPointsInfo({
            remainingPoints: Number(nextUser.freeQuizPoints),
            maxPoints: Number(nextUser.freeQuizPointsMax),
            nextRechargeAt:
              typeof nextUser.freeQuizPointsRechargeAt === "string"
                ? nextUser.freeQuizPointsRechargeAt
                : null,
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  const loadAdaptiveSuggestions = useCallback(async () => {
    if (!isPremiumAdaptiveEnabled) {
      setAdaptiveSuggestions([]);
      return;
    }
    try {
      const res = await fetch("/api/adaptive/suggestions?feature=quiz", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setAdaptiveSuggestions(
        Array.isArray(data?.suggestions)
          ? data.suggestions.filter((item: unknown): item is string => typeof item === "string")
          : []
      );
    } catch {
      // ignore personalization failures
    }
  }, [isPremiumAdaptiveEnabled]);

  const loadAdaptiveWorkspaceSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/summary", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const summary =
        data?.adaptiveWorkspaceSummary &&
        typeof data.adaptiveWorkspaceSummary === "object" &&
        !Array.isArray(data.adaptiveWorkspaceSummary)
          ? (data.adaptiveWorkspaceSummary as AdaptiveWorkspaceSummary)
          : null;
      setAdaptiveWorkspaceSummary(summary);
    } catch {
      setAdaptiveWorkspaceSummary(null);
    }
  }, []);

  const hydrateGeneratedQuiz = useCallback(async (data: Record<string, unknown>) => {
    if (!data.quiz) {
      setError("No quiz data received from server");
      return;
    }
    if (!Array.isArray((data.quiz as QuizData)?.questions) || (data.quiz as QuizData).questions.length === 0) {
      setError("Quiz generated but has no questions");
      return;
    }
    setQuiz(data.quiz as QuizData);
    setSources(Array.isArray(data.sources) ? data.sources : []);
    setLastLoaded(false);
    setShareOpen(null);
    setShareExpiresAt(null);
    setShareAssessmentDurationMinutes(null);
    setCurrentAssignmentId(null);
    setCurrentAssignmentClassName(null);
    setForceFreshGeneration(false);
    void loadAdaptiveSuggestions();
    syncFreeQuizPointsFromPayload(data);
    setQuizProgress(100);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }, [loadAdaptiveSuggestions, syncFreeQuizPointsFromPayload]);

  useEffect(() => {
    void loadAdaptiveSuggestions();
  }, [loadAdaptiveSuggestions]);

  useEffect(() => {
    void loadAdaptiveWorkspaceSummary();
  }, [loadAdaptiveWorkspaceSummary]);

  useEffect(() => {
    const fetchLatestQuiz = async () => {
      try {
        const res = await fetch("/api/quizzes/latest");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.quiz) {
          setQuiz(data.quiz as QuizData);
          setSources(Array.isArray(data.sources) ? data.sources : []);
          setLastLoaded(true);
          setCurrentAssignmentId(
            typeof data?.latest?.latestAssignment?.id === "string"
              ? data.latest.latestAssignment.id
              : null
          );
          setCurrentAssignmentClassName(
            typeof data?.latest?.latestAssignment?.class?.name === "string"
              ? data.latest.latestAssignment.class.name
              : null
          );
          if (data?.shareSettings) {
            setShareOpen(Boolean(data.shareSettings.isOpen));
            setShareExpiresAt(
              typeof data.shareSettings.expiresAt === "string"
                ? data.shareSettings.expiresAt
                : null
            );
            setShareAssessmentDurationMinutes(
              typeof data?.shareSettings?.assessmentDurationMinutes === "number"
                ? data.shareSettings.assessmentDurationMinutes
                : null
            );
            setTimedAssessmentEnabled(
              typeof data?.shareSettings?.assessmentDurationMinutes === "number"
            );
            if (typeof data?.shareSettings?.assessmentDurationMinutes === "number") {
              setAssessmentTimerMinutes(data.shareSettings.assessmentDurationMinutes);
            }
            setShareShuffleActive(Boolean(data.shareSettings.shuffleQuestions));
          } else {
            setShareOpen(null);
            setShareExpiresAt(null);
            setShareAssessmentDurationMinutes(null);
            setTimedAssessmentEnabled(false);
            setShareShuffleActive(false);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLatestQuiz();
  }, []);

  useEffect(() => {
    const prefilledPrompt = searchParams.get("prompt");
    const adaptivePrompt = searchParams.get("adaptivePrompt");
    if (prefilledPrompt) {
      setPrompt(prefilledPrompt);
      return;
    }
    if (adaptivePrompt) {
      setPrompt(adaptivePrompt);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort();
      generationAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const raw = window.localStorage.getItem(QUIZ_PENDING_JOB_STORAGE_KEY);
    if (!raw) return;

    let pending: PendingQuizGenerationJob | null = null;
    try {
      pending = JSON.parse(raw) as PendingQuizGenerationJob;
    } catch {
      window.localStorage.removeItem(QUIZ_PENDING_JOB_STORAGE_KEY);
      return;
    }

    if (!pending?.jobId || loading) return;

    const controller = new AbortController();
    generationAbortRef.current = controller;
    setLoading(true);
    setError("");
    setInfoMessage("Resuming queued quiz generation...");

    void pollAsyncGenerationJob(pending.jobId, controller.signal)
      .then(async (data) => {
        if (cancelled) return;
        await hydrateGeneratedQuiz((data ?? {}) as Record<string, unknown>);
        persistPendingQuizJob(null);
        setInfoMessage("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") return;
        persistPendingQuizJob(null);
        setError(getErrorMessage(err, "Failed to resume quiz generation"));
        setInfoMessage("");
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
  }, [hydrateGeneratedQuiz, loading, persistPendingQuizJob]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean }>;
      setShowAdaptivePanel(Boolean(custom.detail?.open));
    };
    window.addEventListener("quiz-adaptive-visibility", handler as EventListener);
    return () =>
      window.removeEventListener("quiz-adaptive-visibility", handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean }>;
      const shouldOpen = Boolean(custom.detail?.open);
      setQuestionMix((current) => {
        if (shouldOpen) {
          if (current.gamified > 0) return current;
          previousGamifiedCountRef.current = current.gamified;
          forcedGamifiedTourRef.current = true;
          return { ...current, gamified: 1 };
        }
        if (!forcedGamifiedTourRef.current) return current;
        forcedGamifiedTourRef.current = false;
        return { ...current, gamified: previousGamifiedCountRef.current };
      });
    };
    window.addEventListener("quiz-gamified-visibility", handler as EventListener);
    return () =>
      window.removeEventListener("quiz-gamified-visibility", handler as EventListener);
  }, []);

  const pauseQuizGeneration = () => {
    if (!generationAbortRef.current) return;
    generationAbortRef.current.abort();
    generationAbortRef.current = null;
    persistPendingQuizJob(null);
    setLoading(false);
    setQuizProgress(0);
    setError("");
    setInfoMessage("Generation paused.");
  };

  const buildQuizTemplateUrl = () => {
    if (typeof window === "undefined") return "";
    const currentPrompt = prompt.trim();
    if (!currentPrompt) return "";
    const url = new URL("/generate-quiz", window.location.origin);
    url.searchParams.set("prompt", currentPrompt);
    return url.toString();
  };

  const copyQuizTemplateLink = async () => {
    const url = buildQuizTemplateUrl();
    if (!url) {
      setError("");
      setInfoMessage("Add a prompt first to create a shareable template link.");
      return;
    }
    await navigator.clipboard.writeText(url);
    setError("");
    setInfoMessage("Template link copied.");
  };

  const shareQuizTemplateLink = async () => {
    const url = buildQuizTemplateUrl();
    if (!url) {
      setError("");
      setInfoMessage("Add a prompt first to create a shareable template link.");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Quiz Template",
          text: "Use this prefilled quiz template:",
          url,
        });
        return;
      } catch {
        // no-op, fallback to copy
      }
    }
    await navigator.clipboard.writeText(url);
    setError("");
    setInfoMessage("Template link copied.");
  };

  const shareStudentQuizLink = async () => {
    if (!quiz?.id) {
      setError("");
      setInfoMessage("Generate a quiz first, then create a student link.");
      return;
    }

    setShareLoading(true);
    setError("");
    try {
      const assignmentSharePayload: Record<string, string> = {};
      if (assignmentAvailableFrom) {
        assignmentSharePayload.availableFrom = assignmentAvailableFrom;
      }
      if (assignmentDueAt) {
        assignmentSharePayload.dueAt = assignmentDueAt;
      }
      const res = currentAssignmentId
        ? await fetch(`/api/assignments/${encodeURIComponent(currentAssignmentId)}/share`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(assignmentSharePayload),
          })
        : await fetch("/api/quiz-share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quizId: quiz.id,
              durationMinutes: shareTimerMinutes,
              timedAssessmentEnabled,
              assessmentDurationMinutes: timedAssessmentEnabled
                ? assessmentTimerMinutes
                : null,
              shuffleQuestions: shareShuffleQuestions,
              assignmentId: currentAssignmentId,
            }),
          });
      const data = await res.json();
      if (!res.ok) {
        setInfoMessage("");
        setError(
          attachRequestId(
            data?.error || "Failed to create student share link.",
            data
          )
        );
        return;
      }

      const shareUrl = typeof data?.shareUrl === "string" ? data.shareUrl : "";
      if (!shareUrl) {
        setError("Share URL was not returned.");
        return;
      }
      if (currentAssignmentId) {
        setShareOpen(true);
        setShareExpiresAt(
          typeof data?.assignment?.dueAt === "string" ? data.assignment.dueAt : null
        );
        setShareAssessmentDurationMinutes(null);
        setShareShuffleActive(false);
      } else {
        setShareOpen(true);
        setShareExpiresAt(
          typeof data?.shareSettings?.expiresAt === "string"
            ? data.shareSettings.expiresAt
            : null
        );
        setShareAssessmentDurationMinutes(
          typeof data?.shareSettings?.assessmentDurationMinutes === "number"
            ? data.shareSettings.assessmentDurationMinutes
            : null
        );
        setShareShuffleActive(Boolean(data?.shareSettings?.shuffleQuestions));
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: quiz.title || "Quiz",
            text: "Answer this quiz here:",
            url: shareUrl,
          });
          setInfoMessage("Student quiz link shared.");
          return;
        } catch {
          // fallback to clipboard
        }
      }

      await navigator.clipboard.writeText(shareUrl);
      setInfoMessage(
        currentAssignmentClassName
          ? `Student link copied for ${currentAssignmentClassName}.`
          : "Student quiz link copied."
      );
    } catch {
      setError("Failed to create student share link.");
    } finally {
      setShareLoading(false);
    }
  };

  const loadClassesForAssignment = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const res = await fetch("/api/classes", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load classes");
      }
      const nextClasses = Array.isArray(data?.classes)
        ? (data.classes as ClassOption[])
        : [];
      setClasses(nextClasses);
      const firstActiveClass = nextClasses.find((item) => !item.archived);
      setSelectedClassId((current) =>
        current || firstActiveClass?.id || "",
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load classes");
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  const openAssignModal = async () => {
    if (!quiz) return;
    setAssignmentTitle((current) => current || `${quiz.title || "Quiz"} Assignment`);
    setAssignmentInstructions("");
    setAssignmentAvailableFrom("");
    setAssignmentDueAt("");
      setShowAssignModal(true);
    if (!classes.length) {
      await loadClassesForAssignment();
    }
  };

  const assignQuizToClass = async () => {
    if (!quiz?.id) {
      setError("Generate a quiz first, then assign it to a class.");
      return;
    }
    setAssignLoading(true);
    setError("");
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          quizId: quiz.id,
          title: assignmentTitle || `${quiz.title || "Quiz"} Assignment`,
          instructions: assignmentInstructions,
          availableFrom: assignmentAvailableFrom || null,
          dueAt: assignmentDueAt || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to assign quiz");
      }
      setCurrentAssignmentId(typeof data?.assignment?.id === "string" ? data.assignment.id : null);
      setCurrentAssignmentClassName(
        typeof data?.assignment?.class?.name === "string" ? data.assignment.class.name : null
      );
      setInfoMessage(`Assigned to ${data?.assignment?.class?.name || "class"}.`);
      setShowAssignModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign quiz");
    } finally {
      setAssignLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      setQuizProgress(0);
      return;
    }

    setQuizProgress(8);
    const id = setInterval(() => {
      setQuizProgress((prev) => {
        if (prev >= 92) return prev;
        return prev + Math.max(1, Math.floor((100 - prev) / 14));
      });
    }, 500);
    return () => clearInterval(id);
  }, [loading]);

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setPrompt((prev) => prev + text);
  };

  const handleCopy = async () => {
    if (!quiz) return;
    let textToCopy = `${quiz.title}\n\n${quiz.instructions}\n\n`;
    quiz.questions.forEach((q, i) => {
      textToCopy += `${i + 1}. ${q.question}\n`;
      (Array.isArray(q.options) ? q.options : []).forEach((opt, j) => {
        textToCopy += `   ${String.fromCharCode(97 + j)}) ${opt}\n`;
      });
      textToCopy += `    Answer: ${cleanAnswerMeta(q.answer)}\n\n`;
    });
    await navigator.clipboard.writeText(textToCopy);
    setInfoMessage("Copied formatted quiz to clipboard.");
  };

  const saveEditedQuiz = async (nextQuiz: QuizData) => {
    if (!quiz?.id) {
      throw new Error("Generate a quiz first before saving edits.");
    }

    setError("");
    setInfoMessage("");

    const payload = {
      title: String(nextQuiz.title || "").trim(),
      instructions: String(nextQuiz.instructions || "").trim(),
      questions: (Array.isArray(nextQuiz.questions) ? nextQuiz.questions : []).map((question) => ({
        id:
          typeof question.id === "number" && Number.isInteger(question.id)
            ? question.id
            : undefined,
        question: String(question.question || "").trim(),
        options: Array.isArray(question.options)
          ? question.options.map((option) => String(option || "").trim()).filter(Boolean)
          : [],
        answer: cleanAnswerMeta(question.answer),
        explanation:
          isPremiumAdaptiveEnabled && typeof question.explanation === "string"
            ? question.explanation.trim()
            : "",
        hint:
          typeof question.hint === "string"
            ? question.hint.trim()
            : "",
      })),
    };

    const res = await fetch(`/api/quizzes/${quiz.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        (typeof data?.error === "string" && data.error) ||
        "Failed to save quiz edits.";
      setError(message);
      throw new Error(message);
    }

    if (data?.quiz) {
      setQuiz(data.quiz as QuizData);
      setLastLoaded(false);
      setInfoMessage("Quiz edits saved. Student-facing actions now use this updated version.");
    }
  };

  const buildQuizPdfBlob = (): Blob | null => {
    if (!quiz) return null;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 40;
    const lineHeight = 18;
    let y = margin;

    const addLine = (
      text: string,
      indent = 0,
      fontStyle: "normal" | "bold" | "italic" = "normal",
    ) => {
      pdf.setFont("helvetica", fontStyle);
      const lines = pdf.splitTextToSize(
        text ?? "",
        pageWidth - margin * 2 - indent,
      );
      lines.forEach((line: string) => {
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin + indent, y);
        y += lineHeight;
      });
    };

    addLine(quiz.title ?? "", 0, "bold");
    y += 5;
    addLine(quiz.instructions ?? "", 0, "italic");
    y += 10;

    quiz.questions.forEach((q, i) => {
      addLine(`${i + 1}. ${q.question ?? ""}`, 0, "bold");
      (Array.isArray(q.options) ? q.options : []).forEach((opt, j) =>
        addLine(`   ${String.fromCharCode(97 + j)}) ${opt ?? ""}`, 0),
      );
      addLine(`   Answer: ${cleanAnswerMeta(q.answer)}`, 0, "italic");
      y += 10;
    });

    return pdf.output("blob");
  };

  const handleDownloadPDF = () => {
    const blob = buildQuizPdfBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "QuizMint Quiz.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadWord = async () => {
    if (!quiz) return;
    if (!user || !hasPremiumFeaturePlan(user.subscriptionPlan))
      return setShowSubscribeModal(true);

    try {
      const exportQuiz = {
        ...quiz,
        questions: (Array.isArray(quiz.questions) ? quiz.questions : []).map((q) => ({
          ...q,
          answer: cleanAnswerMeta(q.answer),
        })),
      };
      const res = await fetch("/api/download-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz: exportQuiz, format: "word" }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to download Word file");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "QuizMint.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Error downloading Word file");
    }
  };

  const handleDownloadPPT = async () => {
    if (!quiz) return;
    if (!user || !hasPremiumFeaturePlan(user.subscriptionPlan))
      return setShowSubscribeModal(true);

    try {
      const exportQuiz = {
        ...quiz,
        questions: (Array.isArray(quiz.questions) ? quiz.questions : []).map((q) => ({
          ...q,
          answer: cleanAnswerMeta(q.answer),
        })),
      };
      const res = await fetch("/api/download-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz: exportQuiz, format: "ppt" }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to download PPT file");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "QuizMint.pptx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Error downloading PPT file");
    }
  };

  const generateQuizFromPrompt = async () => {
    if (!prompt.trim() && uploadedFiles.length === 0) return;
    const trimmedPrompt = prompt.trim();
    const mixTotal =
      questionMix.mcq +
      questionMix.trueFalse +
      questionMix.fillBlank +
      questionMix.shortAnswer +
      questionMix.matching +
      questionMix.essayRubric +
      questionMix.worksheet +
      questionMix.gamified;
    if (mixTotal > 0 && mixTotal !== numberOfItems) {
      setError("Item mix total must match Number of Items.");
      return;
    }
    trackGaEvent("quiz_generate", {
      action: "start",
      source: uploadedFiles.length > 0 ? "file_upload" : "prompt",
      number_of_items: numberOfItems,
      lite_mode: liteMode,
    });
    setLoading(true);
    setQuiz(null);
    setError("");
    setInfoMessage("");
    setSources([]);
    if (!uploadedFiles.length) {
      setFreeQuizPointsInfo((current) =>
        current
          ? {
              ...current,
              requiredPoints: 25,
            }
          : current
      );
    }

    try {
      generationAbortRef.current?.abort();
      const controller = new AbortController();
      generationAbortRef.current = controller;

      const difficulty = user?.aiDifficulty || "easy";
      const adaptiveLearning = user?.adaptiveLearning ?? false;

      if (uploadedFiles.length > 0) {
        const launchContext = getInterventionLaunchContext();
        const formData = new FormData();
        uploadedFiles.forEach((file) => formData.append("file", file));
        formData.append("prompt", prompt);
        formData.append("difficulty", difficulty);
        formData.append("adaptiveLearning", adaptiveLearning.toString());
        formData.append("numberOfItems", String(numberOfItems));
        formData.append("mixMcq", String(questionMix.mcq));
        formData.append("mixTrueFalse", String(questionMix.trueFalse));
        formData.append("mixFillBlank", String(questionMix.fillBlank));
        formData.append("mixShortAnswer", String(questionMix.shortAnswer));
        formData.append("mixMatching", String(questionMix.matching));
        formData.append("mixEssayRubric", String(questionMix.essayRubric));
        formData.append("mixWorksheet", String(questionMix.worksheet));
        formData.append("mixGamified", String(questionMix.gamified));
        formData.append("gamifiedMode", gamifiedMode);
        formData.append("async", "true");
        if (launchContext) {
          formData.append("launchContext", JSON.stringify(launchContext));
        }

        const res = await fetch("/api/upload-file", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        let data = await res.json();
        let requestSucceeded = res.ok;

      if (res.status === 202 && data?.queued && data?.jobId) {
          persistPendingQuizJob({
            jobId: String(data.jobId),
            createdAt: Date.now(),
          });
          setInfoMessage("Queued. Processing your uploaded content now...");
          if (!data?.dispatched) {
            await fetch(`/api/generation-jobs/${data.jobId}/process`, {
              method: "POST",
              signal: controller.signal,
            }).catch(() => null);
          }
          data = await pollAsyncGenerationJob(String(data.jobId), controller.signal);
          persistPendingQuizJob(null);
          setInfoMessage("");
          requestSucceeded = true;
        }

        if (!requestSucceeded) {
          trackGaEvent("quiz_generate", {
            action: "error",
            source: "file_upload",
            http_status: res.status,
          });
          if (res.status === 429) {
            setError("");
            setInfoMessage(
              attachRequestId(
                data.message || data.error || "Too many requests. Please wait a moment and try again.",
                data
              )
            );
            return;
          }
          // Backend sent 400 or other error
          setError(
            attachRequestId(
              data.message || data.error || "Failed to generate quiz from file",
              data
            )
          );
        } else {
          trackGaEvent("quiz_generate", {
            action: "success",
            source: "file_upload",
            question_count: Array.isArray(data?.quiz?.questions)
              ? data.quiz.questions.length
              : 0,
            source_count: Array.isArray(data?.sources) ? data.sources.length : 0,
          });
          setQuiz(data.quiz as QuizData);
          setSources(Array.isArray(data.sources) ? data.sources : []);
          setLastLoaded(false);
          setShareOpen(null);
          setShareExpiresAt(null);
          setShareAssessmentDurationMinutes(null);
          setCurrentAssignmentId(null);
          setCurrentAssignmentClassName(null);
          setUploadedFiles([]);
          await hydrateGeneratedQuiz(data as Record<string, unknown>);
        }
      } else {
        const launchContext = getInterventionLaunchContext();
        const promptQuestionMix = mixTotal > 0 ? questionMix : null;
        const requestBody = {
          text: prompt,
          difficulty: difficulty, // This will always be a valid string
          adaptiveLearning: adaptiveLearning, // This will always be a boolean
          forceFreshGeneration,
          numberOfItems,
          questionMix: promptQuestionMix,
          gamifiedMode: questionMix.gamified > 0 ? gamifiedMode : undefined,
          launchContext,
        };
        const shouldUseAsyncGeneration = shouldQueueQuizGeneration({
          text: trimmedPrompt,
          requestedItemCount: numberOfItems,
          questionMix: promptQuestionMix,
          adaptiveLearning,
        }).shouldQueue;

    

      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...requestBody,
          async: shouldUseAsyncGeneration,
        }),
        signal: controller.signal,
      });

    
      // Get the response as text first
      const responseText = await res.text();
      
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
     
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }

      let requestSucceeded = res.ok;

      if (res.status === 202 && data?.queued && data?.jobId) {
        persistPendingQuizJob({
          jobId: String(data.jobId),
          createdAt: Date.now(),
        });
        setInfoMessage("Queued. Processing your quiz now...");
        if (!data?.dispatched) {
          await fetch(`/api/generation-jobs/${data.jobId}/process`, {
            method: "POST",
            signal: controller.signal,
          }).catch(() => null);
        }
        data = await pollAsyncGenerationJob(String(data.jobId), controller.signal);
        persistPendingQuizJob(null);
        setInfoMessage("");
        requestSucceeded = true;
      }

      if (!requestSucceeded) {
        trackGaEvent("quiz_generate", {
          action: "error",
          source: "prompt",
          http_status: res.status,
        });
        if (res.status === 429) {
          setError("");
          setInfoMessage(
            attachRequestId(
              data.message || data.error || "Too many requests. Please wait a moment and try again.",
              data
            )
          );
          return;
        }
        if (
          res.status === 403 &&
          (typeof data?.remainingPoints === "number" ||
            typeof data?.maxPoints === "number" ||
            typeof data?.nextRechargeAt === "string")
        ) {
          syncFreeQuizPointsFromPayload(data as Record<string, unknown>);
          setError("");
          setInfoMessage(
            attachRequestId(
              "Not enough free quiz points. Please wait for recharge or upgrade to keep generating.",
              data
            )
          );
          return;
        }
        syncFreeQuizPointsFromPayload(data as Record<string, unknown>);
        setError(
          attachRequestId(
            data.error || data.message || `Failed to generate quiz (${res.status})`,
            data
          )
        );
      } else {
        
        
        // Debug the quiz object
        
        
        // Check if quiz has questions
        if (!data.quiz) {
         
          setError("No quiz data received from server");
        } else if (!data.quiz.questions || data.quiz.questions.length === 0) {
        
          setError("Quiz generated but has no questions");
        } else {
          trackGaEvent("quiz_generate", {
            action: "success",
            source: "prompt",
            question_count: Array.isArray(data?.quiz?.questions)
              ? data.quiz.questions.length
              : 0,
            source_count: Array.isArray(data?.sources) ? data.sources.length : 0,
          });
          await hydrateGeneratedQuiz(data as Record<string, unknown>);
        }
      }
    }
  } catch (err: unknown) {
    trackGaEvent("quiz_generate", {
      action: err instanceof Error && err.name === "AbortError" ? "aborted" : "error",
      source: uploadedFiles.length > 0 ? "file_upload" : "prompt",
    });
    if (err instanceof Error && err.name === "AbortError") {
      setError("");
      setInfoMessage("Generation paused.");
      return;
    }
    persistPendingQuizJob(null);
    setError(getErrorMessage(err, "Failed to generate quiz"));
  } finally {
    generationAbortRef.current = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!infoMessage) return;
    const timer = setTimeout(() => setInfoMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [infoMessage]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-transparent">
      {!liteMode && <Tour steps={quizTourSteps} tourId="home-quiz" />}
      <QuizPageHeader
        isPremiumAdaptiveEnabled={isPremiumAdaptiveEnabled}
        onToggleAdaptive={() => setShowAdaptivePanel((prev) => !prev)}
        freeQuizPointsInfo={freeQuizPointsInfo}
        isFreePlan={isFreePlan}
      />
      {isPremiumAdaptiveEnabled && showAdaptivePanel ? (
        <section
          id="quiz-adaptive-context"
          className="rounded-2xl border border-indigo-200/80 bg-linear-to-br from-indigo-50 to-white p-4 shadow-[0_10px_30px_-18px_rgba(79,70,229,0.35)]"
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                    Adaptive Follow-Up Hub
                  </span>
                  {adaptiveWorkspaceSummary?.primaryClassName ? (
                    <span className="inline-flex rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {adaptiveWorkspaceSummary.primaryClassName}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-medium text-slate-900">
                  {adaptiveWorkspaceSummary?.summary ||
                    "Use this hub to turn live classroom signals into a better next quiz instead of starting from a blank prompt."}
                </p>
                <p className="text-xs text-slate-500">
                  {adaptiveWorkspaceSummary?.recommendation ||
                    "When no priority class context is available yet, this area falls back to adaptive prompt starters."}
                </p>
              </div>
            </div>
            {hasAdaptiveClassContext && adaptiveWorkspaceSummary ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPrompt(adaptiveWorkspaceSummary.suggestedPrompt);
                    setForceFreshGeneration(true);
                    setError("");
                    setInfoMessage("Adaptive class context applied to the prompt.");
                  }}
                  className="inline-flex max-w-md flex-col items-start justify-center rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 px-4 py-3 text-left shadow-[0_10px_24px_-18px_rgba(79,70,229,0.9)] transition hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold leading-5 text-white">
                    <BrainCircuit className="h-4 w-4 shrink-0" />
                    Use Priority Follow-Up Prompt
                  </span>
                  <span className="mt-1 text-[11px] font-medium leading-4 text-indigo-100/95">
                    Replace the prompt with a results-based follow-up prompt for the priority class.
                  </span>
                </button>
              </div>
            ) : (
              <AdaptiveSuggestionsPanel
                visible={showAdaptivePanel}
                suggestions={adaptiveSuggestions}
                title="Adaptive Prompt Starters"
                emptyMessage="Once you build more class or quiz history, adaptive prompt starters will show up here."
                onClose={() => setShowAdaptivePanel(false)}
                onApply={(suggestion) => {
                  setPrompt(suggestion);
                  setForceFreshGeneration(true);
                  setError("");
                  setInfoMessage("Adaptive prompt starter applied.");
                  setShowAdaptivePanel(false);
                }}
              />
            )}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col lg:flex-row gap-6 justify-center w-full">
        <aside
          id="quiz-item-mix"
          className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-linear-to-b from-amber-50 via-white to-zinc-50 p-3 shadow-[0_10px_30px_-18px_rgba(245,158,11,0.75)] lg:w-56 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-300/25 blur-2xl" />
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-zinc-800 dark:text-slate-100">Item Mix</div>
            <button
              id="quiz-item-mix-clear"
              type="button"
              onClick={() =>
                setQuestionMix({
                  mcq: 0,
                  trueFalse: 0,
                  fillBlank: 0,
                  shortAnswer: 0,
                  matching: 0,
                  essayRubric: 0,
                  worksheet: 0,
                  gamified: 0,
                })
              }
              className="h-6 rounded-md border border-zinc-300/80 bg-white/90 px-2 text-[10px] font-semibold text-zinc-700 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-white/80 p-2 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
            {[
              { key: "mcq", label: "MCQ" },
              { key: "trueFalse", label: "T/F" },
              { key: "fillBlank", label: "Fill" },
              { key: "shortAnswer", label: "Short" },
              { key: "matching", label: "Match" },
              { key: "essayRubric", label: "Essay" },
              { key: "worksheet", label: "Worksheet" },
              { key: "gamified", label: "Game" },
            ].map((entry) => (
              <label
                key={entry.key}
                className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-xs text-zinc-700 transition hover:bg-amber-50/70 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <span className="font-medium">{entry.label}</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={questionMix[entry.key as keyof typeof questionMix]}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    const safe = Number.isFinite(next) ? Math.min(50, Math.max(0, Math.floor(next))) : 0;
                    setQuestionMix({
                      ...questionMix,
                      [entry.key]: safe,
                    });
                  }}
                  className="h-7 w-14 rounded-md border border-zinc-300 bg-white px-1 text-center text-xs font-semibold text-zinc-900 outline-none ring-amber-200 transition focus:ring-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-2 py-1 text-center text-xs font-semibold text-amber-800 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300">
            {questionMix.mcq +
              questionMix.trueFalse +
              questionMix.fillBlank +
              questionMix.shortAnswer +
              questionMix.matching +
              questionMix.essayRubric +
              questionMix.worksheet +
              questionMix.gamified}
            {" / "}
            {numberOfItems}
          </div>
          {questionMix.gamified > 0 && (
            <div
              id="quiz-gamified-mode-card"
              className="mt-2 rounded-lg border border-zinc-200 bg-white/80 p-2 dark:border-slate-700 dark:bg-slate-800"
            >
              <label className="mb-1 block text-[11px] font-semibold text-zinc-700 dark:text-slate-200">Mode</label>
              <select
                id="quiz-gamified-mode"
                value={gamifiedMode}
                onChange={(e) => setGamifiedMode(e.target.value as GamifiedMode)}
                className="h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-xs font-medium text-zinc-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="puzzle">Puzzle Quiz</option>
                <option value="bingo">Super Race</option>
                <option value="timeline">Timeline Order</option>
              </select>
            </div>
          )}
        </aside>

        <QuizInputCard
          prompt={prompt}
          setPrompt={(value) => {
            setPrompt(value);
            setForceFreshGeneration(false);
          }}
          numberOfItems={numberOfItems}
          setNumberOfItems={setNumberOfItems}
          user={user}
          loading={loading}
          quizProgress={quizProgress}
          infoMessage={infoMessage}
          error={error}
          freeQuizPointsInfo={freeQuizPointsInfo}
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          onPaste={handlePaste}
          onGenerate={generateQuizFromPrompt}
          onPause={pauseQuizGeneration}
          onCopyTemplateLink={copyQuizTemplateLink}
          onShareTemplateLink={shareQuizTemplateLink}
          onShowSubscribe={() => setShowSubscribeModal(true)}
        />
        <QuizOutputCard
          loading={loading}
          quiz={quiz}
          sources={sources}
          lastLoaded={lastLoaded}
          shareOpen={shareOpen}
          shareExpiresAt={shareExpiresAt}
          shareAssessmentDurationMinutes={shareAssessmentDurationMinutes}
          shareShuffleActive={shareShuffleActive}
          shareLoading={shareLoading}
          assignLoading={assignLoading}
          onClearQuiz={() => {
            setQuiz(null);
            setLastLoaded(false);
            setShareOpen(null);
            setShareExpiresAt(null);
            setShareAssessmentDurationMinutes(null);
            setShareShuffleActive(false);
            setCurrentAssignmentId(null);
            setCurrentAssignmentClassName(null);
          }}
          onCopy={handleCopy}
          onOpenShareModal={() => setShowShareModal(true)}
          onOpenAssignModal={() => void openAssignModal()}
          onDownloadPDF={handleDownloadPDF}
          onDownloadWord={handleDownloadWord}
          onDownloadPPT={handleDownloadPPT}
          onSaveEdits={saveEditedQuiz}
          canEditExplanations={isPremiumAdaptiveEnabled}
        />
      </section>

      <QuizSubscribeModal
        open={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
        onSubscribe={() => {
          trackGaEvent("subscription_click", {
            source: "quiz_subscribe_modal",
            location: "generate_quiz",
          });
          window.location.href = "/subscription";
        }}
      />

      <QuizShareModal
        open={showShareModal}
        mode={currentAssignmentId ? "assignment" : "quiz"}
        assignmentClassName={currentAssignmentClassName}
        shareLoading={shareLoading}
        shareTimerMinutes={shareTimerMinutes}
        setShareTimerMinutes={setShareTimerMinutes}
        timedAssessmentEnabled={timedAssessmentEnabled}
        setTimedAssessmentEnabled={setTimedAssessmentEnabled}
        assessmentTimerMinutes={assessmentTimerMinutes}
        setAssessmentTimerMinutes={setAssessmentTimerMinutes}
        shareShuffleQuestions={shareShuffleQuestions}
        setShareShuffleQuestions={setShareShuffleQuestions}
        canSubmit={Boolean(quiz)}
        onClose={() => setShowShareModal(false)}
        onSubmit={async () => {
          await shareStudentQuizLink();
          setShowShareModal(false);
        }}
      />

      <QuizAssignModal
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
        canSubmit={Boolean(quiz) && Boolean(selectedClassId) && Boolean(assignmentTitle.trim())}
        onClose={() => setShowAssignModal(false)}
        onSubmit={assignQuizToClass}
      />
    </div>
  );
}

