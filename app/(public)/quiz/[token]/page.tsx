"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StudentGamifiedQuestion } from "@/components/quiz/student-gamified-question";
import { StudentMatchingLineRenderer } from "@/components/quiz/student-matching-line-renderer";
import { StudentWorksheetQuestion } from "@/components/quiz/student-worksheet-question";

type SharedQuestion = {
  id: number;
  question: string;
  options: string[];
  structure?:
    | {
        type: "matching";
        left: Array<{ id: string; text: string }>;
        right: Array<{ id: string; text: string }>;
      }
    | {
        type: "worksheet";
        instructions?: string;
        parts: Array<{ id: string; prompt: string }>;
      }
    | {
        type: "gamified";
        mode?: "bingo" | "timeline" | "puzzle";
        puzzleKey?: string;
        answerKey?: string;
        timelineItems?: string[];
      }
    | null;
  questionType:
    | "mcq"
    | "true_false"
    | "fill_blank"
    | "short_answer"
    | "matching"
    | "essay_rubric"
    | "worksheet"
    | "gamified";
};

type SharedQuiz = {
  id: number;
  title: string;
  instructions: string;
  difficulty?: "easy" | "medium" | "hard";
  questions: SharedQuestion[];
};

type SubmitResult = {
  total: number;
  correct: number;
  scorePercent: number;
  details: Array<{
    questionId: number;
    question: string;
    questionType:
      | "mcq"
      | "true_false"
      | "fill_blank"
      | "short_answer"
      | "matching"
      | "essay_rubric"
      | "worksheet"
      | "gamified";
    selected: string;
    correctAnswer: string;
    correct: boolean;
  }>;
};

function prettifyGamifiedIndicator(indicator: string) {
  const normalized = String(indicator || "")
    .replace(/[\[\]]/g, "")
    .trim()
    .toLowerCase();
  if (normalized === "timeline_order" || normalized === "timeline") return "Timeline Order";
  if (normalized === "super_race" || normalized === "super race" || normalized === "bingo") {
    return "Super Race";
  }
  if (normalized === "puzzle") return "Puzzle";
  return normalized
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatQuestionForDisplay(question: string) {
  const source = String(question || "").trim();
  const match = source.match(/\[([A-Z_]+)\]/);
  const indicator = match ? prettifyGamifiedIndicator(match[1]) : null;
  const cleaned = source
    .replace(/\s*\[[A-Z_]+\]\s*:?\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return {
    indicator,
    text: cleaned,
  };
}

export default function StudentQuizPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [quiz, setQuiz] = useState<SharedQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSubmittedDialog, setShowSubmittedDialog] = useState(false);
  const [closeCountdown, setCloseCountdown] = useState(5);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [quizStarted, setQuizStarted] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showReloadWarning, setShowReloadWarning] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/quiz-share/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || "Failed to load shared quiz.");
          return;
        }
        setQuiz(data.quiz as SharedQuiz);
      } catch {
        setError("Failed to load shared quiz.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers]
  );
  const progressPercent = quiz ? Math.round((answeredCount / quiz.questions.length) * 100) : 0;
  const xp = answeredCount * 10;
  const badge =
    answeredCount >= 10
      ? "Master"
      : answeredCount >= 5
      ? "Challenger"
      : answeredCount >= 1
      ? "Starter"
      : "Ready";
  const streak = quiz
    ? quiz.questions.reduce((acc, q) => (answers[String(q.id)] ? acc + 1 : acc), 0)
    : 0;
  const elapsedSeconds = sessionStartedAt ? Math.max(0, Math.floor((nowTick - sessionStartedAt) / 1000)) : 0;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail.trim());
  const canSubmit =
    Boolean(studentName.trim()) &&
    emailLooksValid &&
    quiz !== null &&
    answeredCount === quiz.questions.length &&
    !submitting &&
    !result;
  const hasInProgressWork = quizStarted && !result;

  const expireQuizSession = async () => {
    if (!token) return;
    try {
      await fetch(`/api/quiz-share/${encodeURIComponent(token)}/expire`, {
        method: "POST",
        cache: "no-store",
        keepalive: true,
      });
    } catch {
      // ignore session expiration failures
    }
  };

  useEffect(() => {
    if (!showSubmittedDialog) return;
    setCloseCountdown(5);
    const intervalId = window.setInterval(() => {
      setCloseCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          try {
            window.close();
          } catch {
            // ignore
          }
          // Fallback if browser blocks window.close()
          window.location.replace("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [showSubmittedDialog]);

  useEffect(() => {
    if (!quiz || result) return;
    if (!quizStarted || !sessionStartedAt) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [quiz, result, quizStarted, sessionStartedAt]);

  useEffect(() => {
    if (!quizStarted || result) return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        void expireQuizSession();
        setSessionExpired(true);
        setShowFullscreenWarning(true);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [quizStarted, result, token]);

  useEffect(() => {
    if (!hasInProgressWork) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (token && navigator.sendBeacon) {
        navigator.sendBeacon(`/api/quiz-share/${encodeURIComponent(token)}/expire`);
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasInProgressWork, token]);

  useEffect(() => {
    if (!hasInProgressWork || result) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const isReloadKey =
        event.key === "F5" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r");
      if (!isReloadKey) return;
      event.preventDefault();
      setShowReloadWarning(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasInProgressWork, result]);

  const expireAndReload = () => {
    void expireQuizSession().finally(() => {
      window.location.reload();
    });
  };

  const startQuiz = async () => {
    try {
      if (document.fullscreenElement == null) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // ignore fullscreen errors and continue with the quiz normally
    }

    try {
      const screenOrientation = (screen as Screen & {
        orientation?: { lock?: (orientation: string) => Promise<void> };
      }).orientation;
      await screenOrientation?.lock?.("landscape");
    } catch {
      // ignore unsupported orientation locking
    }

    setSessionStartedAt(Date.now());
    setQuizStarted(true);
    setShowFullscreenWarning(false);
    setSessionExpired(false);
  };

  const submitQuiz = async () => {
    if (!quiz) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/quiz-share/${encodeURIComponent(token)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          studentName: studentName.trim(),
          studentEmail: studentEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to submit quiz.");
        return;
      }
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch {
        // ignore fullscreen exit failures
      }
      setResult(data.result as SubmitResult);
      setShowSubmittedDialog(true);
      setShowFullscreenWarning(false);
    } catch {
      setError("Failed to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50">
      <Card className="min-h-screen w-full rounded-none border-0 shadow-none">
        <CardHeader className="bg-linear-to-r from-blue-600 to-purple-600 text-white">
          <div className="mx-auto w-full max-w-6xl">
            <h1 className="text-2xl font-bold">Student Quiz</h1>
            <p className="text-sm text-blue-100">
              Answer the questions below, then submit for instant score.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-4 md:p-6">
          {loading && <p className="text-sm text-zinc-500">Loading quiz...</p>}
          {!loading && sessionExpired && !result && (
            <Alert variant="destructive">
              <AlertDescription>
                This quiz session expired because the page was refreshed or fullscreen was exited before submission. Reopen the shared link to start again.
              </AlertDescription>
            </Alert>
          )}
          {!loading && error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && quiz && !sessionExpired && (
            <>
              {!quizStarted && !result && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/92 p-4">
                  <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                        Ready Check
                      </p>
                      <h2 className="text-2xl font-bold">{quiz.title}</h2>
                      <p className="text-sm leading-relaxed text-slate-300">
                        Press start to begin the quiz in fullscreen mode. This gives students a cleaner, more focused test-taking screen.
                      </p>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                        <p>{quiz.instructions}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            {quiz.questions.length} questions
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            Difficulty: {quiz.difficulty || "medium"}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                        Leaving fullscreen or refreshing this page before submission will expire this quiz session. If that happens, you will need to reopen the shared link and start again.
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={() => void startQuiz()} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                          Start Quiz
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mx-auto w-full max-w-6xl space-y-4">
                <div className="rounded-md border bg-zinc-50 p-3 text-sm">
                  <div className="font-semibold">{quiz.title}</div>
                  <div className="mt-1 text-zinc-600">{quiz.instructions}</div>
                  <div className="mt-2 text-xs text-zinc-500">
                    {answeredCount}/{quiz.questions.length} answered
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className="h-full bg-linear-to-r from-blue-500 to-emerald-500 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-zinc-600">
                    <div className="rounded border bg-white px-2 py-1">XP: {xp}</div>
                    <div className="rounded border bg-white px-2 py-1">Streak: {streak}</div>
                    <div className="rounded border bg-white px-2 py-1">
                      Time: {minutes}:{seconds}
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-emerald-700">Badge: {badge}</div>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-md border bg-white p-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Your full name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full rounded border px-3 py-2 text-sm"
                      disabled={Boolean(result)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="you@email.com"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full rounded border px-3 py-2 text-sm"
                      disabled={Boolean(result)}
                    />
                    {!result && studentEmail && !emailLooksValid && (
                      <p className="text-xs text-red-600">Enter a valid email.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {quiz.questions.map((q, idx) => {
                    const questionDisplay = formatQuestionForDisplay(q.question);
                    const safeOptions = Array.isArray(q.options) ? q.options : [];
                    const useChoiceMode =
                      q.questionType === "mcq" ||
                      q.questionType === "true_false" ||
                      (q.questionType === "gamified" && safeOptions.length >= 2);
                    const useLongTextMode =
                      q.questionType === "matching" || q.questionType === "essay_rubric";
                    const useShortInputMode =
                      !useChoiceMode && !useLongTextMode && q.questionType !== "worksheet";
                    return (
                      <div key={q.id} className="rounded-lg border bg-white p-4 shadow-xs">
                        <div className="flex flex-wrap items-start gap-2">
                          <p className="max-w-4xl font-medium leading-relaxed">
                            {idx + 1}. {questionDisplay.text}
                            <span className="ml-1 text-red-500">*</span>
                          </p>
                          {questionDisplay.indicator && (
                            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                              {questionDisplay.indicator}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          {q.questionType === "gamified" && (
                            <StudentGamifiedQuestion
                              questionId={q.id}
                              question={q.question}
                              options={safeOptions}
                              difficulty={quiz.difficulty || "medium"}
                              mode={
                                q.structure?.type === "gamified"
                                  ? q.structure.mode
                                  : undefined
                              }
                              answerKey={
                                q.structure?.type === "gamified"
                                  ? q.structure.answerKey
                                  : undefined
                              }
                              puzzleKey={
                                q.structure?.type === "gamified"
                                  ? q.structure.puzzleKey
                                  : undefined
                              }
                              timelineItems={
                                q.structure?.type === "gamified"
                                  ? q.structure.timelineItems
                                  : undefined
                              }
                              value={answers[String(q.id)] || ""}
                              disabled={Boolean(result)}
                              onChange={(next) =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [String(q.id)]: next,
                                }))
                              }
                            />
                          )}
                          {useChoiceMode && q.questionType !== "gamified" &&
                            safeOptions.map((opt, optIdx) => (
                              <label
                                key={`${q.id}-${optIdx}`}
                                className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm ${
                                  ""
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q-${q.id}`}
                                  value={opt}
                                  checked={answers[String(q.id)] === opt}
                                  onChange={() =>
                                    setAnswers((prev) => ({ ...prev, [String(q.id)]: opt }))
                                  }
                                  disabled={Boolean(result)}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          {useShortInputMode && q.questionType !== "gamified" && (
                            <input
                              type="text"
                              placeholder="Type your answer"
                              value={answers[String(q.id)] || ""}
                              onChange={(e) =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [String(q.id)]: e.target.value,
                                }))
                              }
                              disabled={Boolean(result)}
                              className="w-full rounded border px-3 py-2 text-sm"
                            />
                          )}
                          {q.questionType === "worksheet" && (
                            <StudentWorksheetQuestion
                              structure={
                                q.structure?.type === "worksheet"
                                  ? q.structure
                                  : null
                              }
                              value={answers[String(q.id)] || ""}
                              disabled={Boolean(result)}
                              onChange={(next) =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [String(q.id)]: next,
                                }))
                              }
                            />
                          )}
                          {q.questionType === "matching" && (
                            <StudentMatchingLineRenderer
                              question={q.question}
                              options={safeOptions}
                              structure={
                                q.structure?.type === "matching"
                                  ? q.structure
                                  : null
                              }
                              value={answers[String(q.id)] || ""}
                              disabled={Boolean(result)}
                              onChange={(next) =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [String(q.id)]: next,
                                }))
                              }
                            />
                          )}
                          {q.questionType === "essay_rubric" && (
                            <textarea
                              placeholder="Write your explanation in your own words"
                              value={answers[String(q.id)] || ""}
                              onChange={(e) =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [String(q.id)]: e.target.value,
                                }))
                              }
                              disabled={Boolean(result)}
                              rows={5}
                              className="w-full rounded border px-3 py-2 text-sm"
                            />
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>

                <div className="sticky bottom-0 -mx-4 border-t bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
                  {!result ? (
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <p className="text-xs text-zinc-500">
                        All fields marked with * are required. You must answer all questions before submitting.
                      </p>
                      <Button onClick={submitQuiz} disabled={!canSubmit}>
                        {submitting ? "Submitting..." : "Submit Quiz"}
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">
                      Quiz submitted.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {showSubmittedDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Quiz submitted</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Your responses were recorded. You can no longer edit this quiz.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              This tab will close in {closeCountdown}s.
            </p>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setShowSubmittedDialog(false)}>OK</Button>
            </div>
          </div>
        </div>
      )}
      {showFullscreenWarning && !result && !sessionExpired && (
        <div className="fixed inset-0 z-45 flex items-center justify-center bg-slate-950/72 p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-900">Fullscreen was exited</h3>
            <p className="mt-2 text-sm text-zinc-600">
              If you continue after exiting fullscreen, this quiz link will expire and you will need to reopen the shared link to start again.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => void startQuiz()}>
                Re-enter Fullscreen
              </Button>
              <Button variant="destructive" onClick={() => setShowFullscreenWarning(false)}>
                I Understand
              </Button>
            </div>
          </div>
        </div>
      )}
      {showReloadWarning && !result && !sessionExpired && (
        <div className="fixed inset-0 z-45 flex items-center justify-center bg-slate-950/72 p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-900">Reload will expire this quiz</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Refreshing this page before submission will expire the current quiz session. You will need to reopen the shared link and start again.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReloadWarning(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={expireAndReload}>
                Reload Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
