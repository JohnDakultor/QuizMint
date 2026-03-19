"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StudentGamifiedQuestion } from "@/components/quiz/student-gamified-question";

type SharedQuestion = {
  id: number;
  question: string;
  options: string[];
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
        setSessionStartedAt(Date.now());
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
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [quiz, result]);

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
      setResult(data.result as SubmitResult);
      setShowSubmittedDialog(true);
    } catch {
      setError("Failed to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-linear-to-r from-blue-600 to-purple-600 text-white">
          <h1 className="text-2xl font-bold">Student Quiz</h1>
          <p className="text-sm text-blue-100">
            Answer the questions below, then submit for instant score.
          </p>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          {loading && <p className="text-sm text-zinc-500">Loading quiz...</p>}
          {!loading && error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && quiz && (
            <>
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
                  const safeOptions = Array.isArray(q.options) ? q.options : [];
                  const useChoiceMode =
                    q.questionType === "mcq" ||
                    q.questionType === "true_false" ||
                    (q.questionType === "gamified" && safeOptions.length >= 2);
                  const useLongTextMode =
                    q.questionType === "matching" || q.questionType === "essay_rubric";
                  const useShortInputMode = !useChoiceMode && !useLongTextMode;
                  return (
                    <div key={q.id} className="rounded-lg border bg-white p-4 shadow-xs">
                      <p className="font-medium">
                        {idx + 1}. {q.question}
                        <span className="ml-1 text-red-500">*</span>
                      </p>
                      <div className="mt-3 space-y-2">
                        {q.questionType === "gamified" && (
                          <StudentGamifiedQuestion
                            questionId={q.id}
                            question={q.question}
                            options={safeOptions}
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
                            placeholder={
                              q.questionType === "worksheet"
                                ? "Enter your worksheet answer"
                                : "Type your answer"
                            }
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
                        {q.questionType === "matching" && (
                          <textarea
                            placeholder="Enter matches one per line, e.g. Term - Definition"
                            value={answers[String(q.id)] || ""}
                            onChange={(e) =>
                              setAnswers((prev) => ({
                                ...prev,
                                [String(q.id)]: e.target.value,
                              }))
                            }
                            disabled={Boolean(result)}
                            rows={4}
                            className="w-full rounded border px-3 py-2 text-sm"
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

              {!result ? (
                <Button onClick={submitQuiz} disabled={!canSubmit}>
                  {submitting ? "Submitting..." : "Submit Quiz"}
                </Button>
              ) : (
                <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">
                  Quiz submitted.
                </div>
              )}
              {!result && (
                <p className="text-xs text-zinc-500">
                  All fields marked with * are required. You must answer all questions before submitting.
                </p>
              )}
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
    </div>
  );
}
