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
import { QuizPageHeader } from "@/components/quiz/quiz-page-header";
import { AdaptiveSuggestionsPanel } from "@/components/quiz/adaptive-suggestions-panel";
import { QuizSubscribeModal } from "@/components/quiz/subscribe-modal";
import { trackGaEvent } from "@/lib/ga-client";
import type { GamifiedMode } from "@/lib/quiz-question-types";

function cleanAnswerMeta(value: unknown) {
  return String(value || "")
    .replace(/\n?__QMETA_V1__[A-Za-z0-9+/=]+$/g, "")
    .trim();
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [quiz, setQuiz] = useState<any | null>(null);
  const [sources, setSources] = useState<SourceIcon[]>([]);
  const [lastLoaded, setLastLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [quizProgress, setQuizProgress] = useState(0);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [adUnlockInfo, setAdUnlockInfo] = useState<{
    available: boolean;
    nextAdResetAt?: string | null;
    nextFreeAt?: string | null;
    remaining?: number;
  } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [adaptiveSuggestions, setAdaptiveSuggestions] = useState<string[]>([]);
  const [showAdaptivePanel, setShowAdaptivePanel] = useState(false);
  const [forceFreshGeneration, setForceFreshGeneration] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareTimerMinutes, setShareTimerMinutes] = useState(60);
  const [shareShuffleQuestions, setShareShuffleQuestions] = useState(false);
  const [shareShuffleActive, setShareShuffleActive] = useState(false);
  const [shareOpen, setShareOpen] = useState<boolean | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
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
  const isPremiumAdaptiveEnabled =
    user?.subscriptionPlan === "premium" && user?.adaptiveLearning === true;
  const generationAbortRef = useRef<AbortController | null>(null);
  const ASYNC_JOB_POLL_INTERVAL_MS = 1500;
  const ASYNC_JOB_TIMEOUT_MS = 8 * 60 * 1000;
  const attachRequestId = (message: string, data: any) =>
    data?.requestId ? `${message} (Ref: ${data.requestId})` : message;

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
        setUser(data.user);
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

  useEffect(() => {
    void loadAdaptiveSuggestions();
  }, [loadAdaptiveSuggestions]);

  useEffect(() => {
    const fetchLatestQuiz = async () => {
      try {
        const res = await fetch("/api/quizzes/latest");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.quiz) {
          setQuiz(data.quiz);
          setSources(Array.isArray(data.sources) ? data.sources : []);
          setLastLoaded(true);
          if (data?.shareSettings) {
            setShareOpen(Boolean(data.shareSettings.isOpen));
            setShareExpiresAt(
              typeof data.shareSettings.expiresAt === "string"
                ? data.shareSettings.expiresAt
                : null
            );
            setShareShuffleActive(Boolean(data.shareSettings.shuffleQuestions));
          } else {
            setShareOpen(null);
            setShareExpiresAt(null);
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
    if (!prefilledPrompt) return;
    setPrompt(prefilledPrompt);
  }, [searchParams]);

  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort();
      generationAbortRef.current = null;
    };
  }, []);

  const pauseQuizGeneration = () => {
    if (!generationAbortRef.current) return;
    generationAbortRef.current.abort();
    generationAbortRef.current = null;
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
      const res = await fetch("/api/quiz-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          durationMinutes: shareTimerMinutes,
          shuffleQuestions: shareShuffleQuestions,
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
      setShareOpen(true);
      setShareExpiresAt(
        typeof data?.shareSettings?.expiresAt === "string"
          ? data.shareSettings.expiresAt
          : null
      );
      setShareShuffleActive(Boolean(data?.shareSettings?.shuffleQuestions));

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
      setInfoMessage("Student quiz link copied.");
    } catch {
      setError("Failed to create student share link.");
    } finally {
      setShareLoading(false);
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
    quiz.questions.forEach((q: any, i: number) => {
      textToCopy += `${i + 1}. ${q.question}\n`;
      (Array.isArray(q.options) ? q.options : []).forEach((opt: string, j: number) => {
        textToCopy += `   ${String.fromCharCode(97 + j)}) ${opt}\n`;
      });
      textToCopy += `    Answer: ${cleanAnswerMeta(q.answer)}\n\n`;
    });
    await navigator.clipboard.writeText(textToCopy);
    setInfoMessage("Copied formatted quiz to clipboard.");
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

    quiz.questions.forEach((q: any, i: number) => {
      addLine(`${i + 1}. ${q.question ?? ""}`, 0, "bold");
      (Array.isArray(q.options) ? q.options : []).forEach((opt: string, j: number) =>
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
    if (!user || user.subscriptionPlan !== "premium")
      return setShowSubscribeModal(true);

    try {
      const exportQuiz = {
        ...quiz,
        questions: (Array.isArray(quiz.questions) ? quiz.questions : []).map((q: any) => ({
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
    if (!user || user.subscriptionPlan !== "premium")
      return setShowSubscribeModal(true);

    try {
      const exportQuiz = {
        ...quiz,
        questions: (Array.isArray(quiz.questions) ? quiz.questions : []).map((q: any) => ({
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
    setAdUnlockInfo(null);

    try {
      generationAbortRef.current?.abort();
      const controller = new AbortController();
      generationAbortRef.current = controller;

      const difficulty = user?.aiDifficulty || "easy";
      const adaptiveLearning = user?.adaptiveLearning ?? false;

      if (uploadedFiles.length > 0) {
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

        const res = await fetch("/api/upload-file", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        let data = await res.json();
        let requestSucceeded = res.ok;

        if (res.status === 202 && data?.queued && data?.jobId) {
          setInfoMessage("Queued. Processing your uploaded content now...");
          if (!data?.dispatched) {
            await fetch(`/api/generation-jobs/${data.jobId}/process`, {
              method: "POST",
              signal: controller.signal,
            }).catch(() => null);
          }
          data = await pollAsyncGenerationJob(String(data.jobId), controller.signal);
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
          setQuiz(data.quiz);
          setSources(Array.isArray(data.sources) ? data.sources : []);
          setLastLoaded(false);
          setShareOpen(null);
          setShareExpiresAt(null);
          setUploadedFiles([]);
          setQuizProgress(100);
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      } else {
        const requestBody = {
          text: prompt,
          difficulty: difficulty, // This will always be a valid string
          adaptiveLearning: adaptiveLearning, // This will always be a boolean
          forceFreshGeneration,
          numberOfItems,
          questionMix: mixTotal > 0 ? questionMix : null,
          gamifiedMode: questionMix.gamified > 0 ? gamifiedMode : undefined,
        };

    

      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestBody, async: true }),
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
        setInfoMessage("Queued. Processing your quiz now...");
        if (!data?.dispatched) {
          await fetch(`/api/generation-jobs/${data.jobId}/process`, {
            method: "POST",
            signal: controller.signal,
          }).catch(() => null);
        }
        data = await pollAsyncGenerationJob(String(data.jobId), controller.signal);
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
          (typeof data?.adResetAvailable === "boolean" ||
            typeof data?.adResetsRemaining === "number")
        ) {
          setAdUnlockInfo({
            available: Boolean(data?.adResetAvailable),
            nextAdResetAt: data?.nextAdResetAt || null,
            nextFreeAt: data?.nextFreeAt || null,
            remaining:
              typeof data?.adResetsRemaining === "number"
                ? data.adResetsRemaining
                : undefined,
          });
          setError("");
          setInfoMessage(
            attachRequestId(
              "Free limit reached. Watch an ad to unlock immediately or wait for reset.",
              data
            )
          );
          return;
        }
        if (res.status === 403 && data?.error?.toString().includes("Free limit")) {
          setAdUnlockInfo({
            available: Boolean(data?.adResetAvailable),
            nextAdResetAt: data?.nextAdResetAt || null,
            nextFreeAt: data?.nextFreeAt || null,
            remaining:
              typeof data?.adResetsRemaining === "number"
                ? data.adResetsRemaining
                : undefined,
          });
        }
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
          
          setQuiz(data.quiz);
          trackGaEvent("quiz_generate", {
            action: "success",
            source: "prompt",
            question_count: Array.isArray(data?.quiz?.questions)
              ? data.quiz.questions.length
              : 0,
            source_count: Array.isArray(data?.sources) ? data.sources.length : 0,
          });
          setSources(Array.isArray(data.sources) ? data.sources : []);
          setLastLoaded(false);
          setShareOpen(null);
          setShareExpiresAt(null);
          setForceFreshGeneration(false);
          void loadAdaptiveSuggestions();
          setAdUnlockInfo(null);
          setQuizProgress(100);
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      }
    }
  } catch (err: any) {
    trackGaEvent("quiz_generate", {
      action: err?.name === "AbortError" ? "aborted" : "error",
      source: uploadedFiles.length > 0 ? "file_upload" : "prompt",
    });
    if (err?.name === "AbortError") {
      setError("");
      setInfoMessage("Generation paused.");
      return;
    }
   
    setError(err.message || "Failed to generate quiz");
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
      />
      <AdaptiveSuggestionsPanel
        visible={isPremiumAdaptiveEnabled && showAdaptivePanel}
        suggestions={adaptiveSuggestions}
        onClose={() => setShowAdaptivePanel(false)}
        onApply={(suggestion) => {
          setPrompt(suggestion);
          setForceFreshGeneration(true);
          setError("");
          setInfoMessage("Suggestion applied. Fresh generation enabled.");
          setShowAdaptivePanel(false);
        }}
      />

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
            <div className="mt-2 rounded-lg border border-zinc-200 bg-white/80 p-2 dark:border-slate-700 dark:bg-slate-800">
              <label className="mb-1 block text-[11px] font-semibold text-zinc-700 dark:text-slate-200">Game Type</label>
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
          adUnlockInfo={adUnlockInfo}
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          onPaste={handlePaste}
          onGenerate={generateQuizFromPrompt}
          onPause={pauseQuizGeneration}
          onCopyTemplateLink={copyQuizTemplateLink}
          onShareTemplateLink={shareQuizTemplateLink}
          onShowSubscribe={() => setShowSubscribeModal(true)}
          onAdUnlocked={() => {
            setError("");
            setInfoMessage("Usage reset. You can generate again.");
            setAdUnlockInfo(null);
          }}
        />
        <QuizOutputCard
          loading={loading}
          quiz={quiz}
          sources={sources}
          lastLoaded={lastLoaded}
          shareOpen={shareOpen}
          shareExpiresAt={shareExpiresAt}
          shareShuffleActive={shareShuffleActive}
          shareLoading={shareLoading}
          onClearQuiz={() => {
            setQuiz(null);
            setLastLoaded(false);
            setShareShuffleActive(false);
          }}
          onCopy={handleCopy}
          onOpenShareModal={() => setShowShareModal(true)}
          onDownloadPDF={handleDownloadPDF}
          onDownloadWord={handleDownloadWord}
          onDownloadPPT={handleDownloadPPT}
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
        shareLoading={shareLoading}
        shareTimerMinutes={shareTimerMinutes}
        setShareTimerMinutes={setShareTimerMinutes}
        shareShuffleQuestions={shareShuffleQuestions}
        setShareShuffleQuestions={setShareShuffleQuestions}
        canSubmit={Boolean(quiz)}
        onClose={() => setShowShareModal(false)}
        onSubmit={async () => {
          await shareStudentQuizLink();
          setShowShareModal(false);
        }}
      />
    </div>
  );
}

