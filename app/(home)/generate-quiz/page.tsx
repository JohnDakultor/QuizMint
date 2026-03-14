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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareTimerMinutes, setShareTimerMinutes] = useState(60);
  const [shareOpen, setShareOpen] = useState<boolean | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [numberOfItems, setNumberOfItems] = useState(10);
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
          } else {
            setShareOpen(null);
            setShareExpiresAt(null);
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
        body: JSON.stringify({ quizId: quiz.id, durationMinutes: shareTimerMinutes }),
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
      q.options.forEach((opt: string, j: number) => {
        textToCopy += `   ${String.fromCharCode(97 + j)}) ${opt}\n`;
      });
      textToCopy += `    Answer: ${q.answer}\n\n`;
    });
    await navigator.clipboard.writeText(textToCopy);
    alert("Copied formatted quiz to clipboard!");
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
      q.options.forEach((opt: string, j: number) =>
        addLine(`   ${String.fromCharCode(97 + j)}) ${opt ?? ""}`, 0),
      );
      addLine(`   Answer: ${q.answer ?? ""}`, 0, "italic");
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
      const res = await fetch("/api/download-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz, format: "word" }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to download Word file");
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
      alert("Error downloading Word file");
    }
  };

  const handleDownloadPPT = async () => {
    if (!quiz) return;
    if (!user || user.subscriptionPlan !== "premium")
      return setShowSubscribeModal(true);

    try {
      const res = await fetch("/api/download-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz, format: "ppt" }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to download PPT file");
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
      alert("Error downloading PPT file");
    }
  };

  const generateQuizFromPrompt = async () => {
    if (!prompt.trim() && !uploadedFile) return;
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

      if (uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("prompt", prompt);
        formData.append("difficulty", difficulty);
        formData.append("adaptiveLearning", adaptiveLearning.toString());
        formData.append("numberOfItems", String(numberOfItems));

        const res = await fetch("/api/upload-file", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        const data = await res.json();

        if (!res.ok) {
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
          setQuiz(data.quiz);
          setSources(Array.isArray(data.sources) ? data.sources : []);
          setLastLoaded(false);
          setShareOpen(null);
          setShareExpiresAt(null);
          setUploadedFile(null);
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
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
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
          liteMode={liteMode}
          uploadedFile={uploadedFile}
          setUploadedFile={setUploadedFile}
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
          shareLoading={shareLoading}
          onClearQuiz={() => {
            setQuiz(null);
            setLastLoaded(false);
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
          window.location.href = "/subscription";
        }}
      />

      <QuizShareModal
        open={showShareModal}
        shareLoading={shareLoading}
        shareTimerMinutes={shareTimerMinutes}
        setShareTimerMinutes={setShareTimerMinutes}
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

