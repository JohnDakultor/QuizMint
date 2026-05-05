"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { BookOpen, Brain, Clock3, FileText, Sparkles, UsersRound } from "lucide-react";
import Tour from "@/components/ui/tour";
import SkeletonLoading from "@/components/ui/skeleton-loading";

type DashboardSummary = {
  subscriptionPlan: string;
  quizUsage: number;
  lastQuizAt: string | null;
  freeQuizPoints: number | null;
  freeQuizPointsMax: number | null;
  freeQuizPointsRechargeAt: string | null;
  lastActivityAt: string | null;
  quizCount: number;
  lessonPlanCount: number;
  classCount: number;
  activeAssignmentCount: number;
  todayQuizCount: number;
  todayLessonPlanCount: number;
  recentQuizzes: {
      id: number;
      title: string;
      createdAt: string;
      shareUrl?: string | null;
      shareSettings?: {
        isOpen: boolean;
        expiresAt: string | null;
      } | null;
    }[];
  recentPlans: { id: string; title: string; subject: string; createdAt: string }[];
  activeClasses: {
    id: string;
    name: string;
    subject: string | null;
    gradeLevel: string | null;
    section: string | null;
    _count: {
      students: number;
      assignments: number;
    };
  }[];
  activeAssignments: {
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
    availableFrom: string | null;
    createdAt: string;
    class: {
      id: string;
      name: string;
    };
    quiz: {
      id: number;
      title: string;
    } | null;
    _count: {
      attempts: number;
    };
  }[];
  latestClass: {
    id: string;
    name: string;
    subject: string | null;
    gradeLevel: string | null;
    section: string | null;
    updatedAt: string;
  } | null;
  draftAssignments: {
    id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
    class: {
      id: string;
      name: string;
    };
    quiz: {
      id: number;
      title: string;
    } | null;
    lessonPlan: {
      id: string;
      title: string;
    } | null;
  }[];
  overdueAssignments: {
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
    updatedAt: string;
    class: {
      id: string;
      name: string;
    };
    submissionCount: number;
    studentCount: number;
    missingCount: number;
  }[];
  reminderNeededAssignments: {
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
    class: {
      id: string;
      name: string;
    };
    submissionCount: number;
    studentCount: number;
    missingCount: number;
    lastRosterEmailAt: string | null;
    lastReminderAt: string | null;
  }[];
  todayView: {
    dueTodayCount: number;
    overdueCount: number;
    draftCount: number;
    reminderNeededCount: number;
    lowScoreAlertCount: number;
    recentSubmissionCount: number;
  };
  recentAssignmentResults: {
    id: string;
    title: string;
    dueAt: string | null;
    class: {
      id: string;
      name: string;
    };
    submissionCount: number;
    studentCount: number;
    missingCount: number;
    averageScore: number;
  }[];
  latestAssignment: {
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
    updatedAt: string;
    class: {
      id: string;
      name: string;
    };
    quiz: {
      id: number;
      title: string;
    } | null;
  } | null;
  dueSoonAssignments: {
    id: string;
    title: string;
    dueAt: string | null;
    class: {
      id: string;
      name: string;
    };
    submissionCount: number;
  }[];
  lowScoreAlerts: {
    id: string;
    title: string;
    class: {
      id: string;
      name: string;
    };
    averageScore: number;
    submissionCount: number;
    studentCount: number;
    missingCount: number;
  }[];
  recentSubmissions: {
    id: string;
    studentName: string | null;
    studentEmail: string | null;
    scorePercent: number;
    submittedAt: string;
    assignment: {
      id: string;
      title: string;
      class: {
        id: string;
        name: string;
      };
    } | null;
  }[];
  recentWorkflowActivity: {
    eventType: string;
    feature: string | null;
    status: string;
    createdAt: string;
    assignmentId: string | null;
    className: string | null;
    shareUrl: string | null;
    requestId: string | null;
    recipientCount: number | null;
    error: string | null;
  }[];
  suggestedAction: {
    type: string;
    title: string;
    description: string;
    href: string;
  };
};

type LastQuiz = {
  id: number;
  title: string;
  createdAt: string;
  questionCount: number;
};

type LastPlan = {
  id: string;
  title: string;
  subject: string;
  createdAt: string;
};

type StudentAttemptSummary = {
  id: string;
  quizId: number;
  quizTitle: string;
  assignmentId?: string | null;
  assignmentTitle?: string | null;
  classId?: string | null;
  className?: string | null;
  studentName: string | null;
  studentEmail: string | null;
  scorePercent: number;
  correctAnswers: number;
  totalQuestions: number;
  submittedAt: string;
  details?: Array<{
    questionId: number;
    question: string;
    questionType: string;
    selected: string;
    correctAnswer?: string;
    correct: boolean;
  }>;
};

function formatAttemptAnswer(value: string, questionType?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "No answer";

  if (questionType === "matching") {
    try {
      const parsed = JSON.parse(raw) as {
        kind?: string;
        map?: Record<string, string>;
      };
      if (parsed?.kind === "matching_map" && parsed.map && typeof parsed.map === "object") {
        return Object.entries(parsed.map)
          .map(([left, right]) => `${left} -> ${right}`)
          .join(", ");
      }
    } catch {
      return raw.replace(/\r?\n/g, ", ");
    }
  }

  try {
    const parsed = JSON.parse(raw) as { kind?: string; order?: string[] };
    if (parsed?.kind === "timeline_order" && Array.isArray(parsed.order)) {
      return parsed.order.join(" -> ");
    }
  } catch {
    // plain text answer
  }

  return raw.replace(/\r?\n/g, " ");
}

const QUIZ_TEMPLATES = [
  "Create a 10-item Grade 7 science quiz about ecosystems with multiple choice and true/false.",
  "Create a 15-item Grade 8 math quiz about linear equations with mixed question types and explanations.",
  "Create a 12-item Grade 9 biology quiz about cell division with hints for difficult items.",
  "Create a 20-item Grade 10 chemistry quiz about acids and bases with medium difficulty.",
  "Create a 10-item Grade 6 history quiz about ancient Egypt using multiple choice and fill-in-the-blank.",
  "Create a 15-item Grade 11 physics quiz about Newton's laws with concept-first questions.",
  "Create a 10-item English quiz on subject-verb agreement for Grade 8 with clear answer explanations.",
  "Create a 12-item geography quiz about world climate zones for Grade 9 with true/false and MCQ.",
  "Create a 10-item computer science quiz about algorithms for Grade 10 with practical scenarios.",
  "Create a 15-item health education quiz about nutrition for Grade 7 with mixed formats.",
];

const LESSON_TEMPLATES = [
  {
    topic: "Water Cycle",
    subject: "Science",
    grade: "Grade 7",
    days: "2",
    minutesPerDay: "40",
    objectives: "Explain evaporation, condensation, precipitation, and collection.",
    constraints: "Include one group activity and one exit ticket per day.",
  },
  {
    topic: "Linear Equations",
    subject: "Mathematics",
    grade: "Grade 8",
    days: "3",
    minutesPerDay: "45",
    objectives: "Solve one-step and two-step linear equations accurately.",
    constraints: "Use scaffolded examples and a short formative quiz on Day 3.",
  },
  {
    topic: "Photosynthesis",
    subject: "Biology",
    grade: "Grade 9",
    days: "2",
    minutesPerDay: "40",
    objectives: "Describe process inputs/outputs and why plants need photosynthesis.",
    constraints: "Add diagram labeling and misconception checks.",
  },
  {
    topic: "Industrial Revolution",
    subject: "History",
    grade: "Grade 9",
    days: "3",
    minutesPerDay: "40",
    objectives: "Analyze social and economic impacts of industrialization.",
    constraints: "Include source analysis and a reflection paragraph.",
  },
  {
    topic: "Newton's Laws",
    subject: "Physics",
    grade: "Grade 10",
    days: "3",
    minutesPerDay: "45",
    objectives: "Apply all three laws to real-world motion problems.",
    constraints: "Include one low-cost classroom experiment.",
  },
  {
    topic: "Atoms and Elements",
    subject: "Chemistry",
    grade: "Grade 8",
    days: "2",
    minutesPerDay: "40",
    objectives: "Differentiate atoms, molecules, and elements.",
    constraints: "Use visual models and vocabulary checks.",
  },
  {
    topic: "Grammar: Active vs Passive Voice",
    subject: "English",
    grade: "Grade 8",
    days: "2",
    minutesPerDay: "40",
    objectives: "Convert active voice to passive voice correctly.",
    constraints: "Include sentence transformation drills.",
  },
  {
    topic: "Map Skills",
    subject: "Geography",
    grade: "Grade 7",
    days: "2",
    minutesPerDay: "40",
    objectives: "Read scale, symbols, and coordinates on maps.",
    constraints: "Add hands-on worksheet and peer check.",
  },
  {
    topic: "Intro to Algorithms",
    subject: "Computer Science",
    grade: "Grade 10",
    days: "3",
    minutesPerDay: "45",
    objectives: "Trace and design simple step-by-step algorithms.",
    constraints: "Use pseudocode practice and debugging tasks.",
  },
  {
    topic: "Healthy Nutrition",
    subject: "Health",
    grade: "Grade 7",
    days: "2",
    minutesPerDay: "40",
    objectives: "Classify food groups and design a balanced meal.",
    constraints: "Include culturally relevant meal examples.",
  },
];

function getCountdownTimer(targetAt: string | null) {
  if (!targetAt) return null;
  const end = new Date(targetAt).getTime();
  const remaining = end - Date.now();
  if (remaining <= 0) return null;

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}


export default function HomeDashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [copiedShareQuizId, setCopiedShareQuizId] = useState<number | null>(null);
  const [lastQuiz, setLastQuiz] = useState<LastQuiz | null>(null);
  const [lastPlan, setLastPlan] = useState<LastPlan | null>(null);
  const [studentAttempts, setStudentAttempts] = useState<StudentAttemptSummary[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [quizActionLoadingId, setQuizActionLoadingId] = useState<number | null>(null);
  const [pendingDeleteQuizId, setPendingDeleteQuizId] = useState<number | null>(null);
  const [lessonActionLoadingId, setLessonActionLoadingId] = useState<string | null>(null);
  const [pendingDeletePlanId, setPendingDeletePlanId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const dashboardTourSteps = [
    {
      element: "#dashboard-hero",
      popover: {
        title: "Dashboard overview",
        description: "This dashboard now summarizes your teaching workflow: classes, assignments, results, and next actions.",
      },
    },
    {
      element: "#dashboard-stats",
      popover: {
        title: "Usage metrics",
        description: "Track the overall shape of your workflow, from generated resources to active class work.",
      },
    },
    {
      element: "#dashboard-quick-actions",
      popover: {
        title: "Quick actions",
        description: "Jump directly to quiz generation, lesson planning, or account settings.",
      },
    },
    {
      element: "#dashboard-active-classes",
      popover: {
        title: "Active classes",
        description:
          "This card surfaces the live classes anchoring your teacher workflow so you can jump straight back into classroom work.",
      },
    },
    {
      element: "#dashboard-active-assignments",
      popover: {
        title: "Active assignments",
        description:
          "Track current class work here and open results or operations without leaving the dashboard.",
      },
    },
    {
      element: "#dashboard-workflow-activity",
      popover: {
        title: "Workflow activity",
        description:
          "Review recent sharing, roster email, and reminder events so the operational history stays visible.",
      },
    },
    {
      element: "#dashboard-recent-quizzes",
      popover: {
        title: "Recent quizzes",
        description:
          "Reopen quizzes from your workflow history and keep moving into assignment, sharing, or follow-up steps.",
      },
    },
    {
      element: "#dashboard-student-submissions",
      popover: {
        title: "Student submissions",
        description:
          "Review recent student outcomes here before jumping into assignment-level intervention and follow-up.",
      },
    },
    {
      element: "#dashboard-recent-lessons",
      popover: {
        title: "Recent lesson plans",
        description: "Open your latest lesson plans and keep them connected to class workflow, assignments, and follow-up.",
      },
    },
    {
      element: "#dashboard-templates",
      popover: {
        title: "Quick templates",
        description: "Use templates as a fast starting point inside the broader teacher workflow.",
      },
    },
  ];

  async function refreshSummaryData() {
    const res = await fetch("/api/dashboard/summary", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to load dashboard");
    setData(json);
  }

  async function refreshAttemptsData() {
    setAttemptsLoading(true);
    const res = await fetch("/api/quiz-share/attempts", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStudentAttempts([]);
      setAttemptsLoading(false);
      return;
    }
    setStudentAttempts(
      Array.isArray(json?.attempts) ? (json.attempts as StudentAttemptSummary[]) : []
    );
    setAttemptsLoading(false);
  }

  useEffect(() => {
    const interval = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        await refreshSummaryData();
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadContinueState() {
      try {
        const [quizRes, lessonRes] = await Promise.all([
          fetch("/api/quizzes/latest", { cache: "no-store" }),
          fetch("/api/lesson-plans", { cache: "no-store" }),
        ]);
        const quizData = await quizRes.json().catch(() => ({}));
        const lessonData = await lessonRes.json().catch(() => ({}));
        if (!mounted) return;
        setLastQuiz((quizData?.latest as LastQuiz) || null);
        setLastPlan((lessonData?.latest as LastPlan) || null);
      } catch {
        if (!mounted) return;
        setLastQuiz(null);
        setLastPlan(null);
      }
    }
    loadContinueState();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadAttempts() {
      try {
        await refreshAttemptsData();
        if (!mounted) return;
      } catch {
        if (!mounted) return;
        setStudentAttempts([]);
      } finally {
        if (mounted) setAttemptsLoading(false);
      }
    }
    loadAttempts();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleToggleQuizOpen(quizId: number, nextOpen: boolean) {
    try {
      setQuizActionLoadingId(quizId);
      const res = await fetch("/api/quiz-share", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, isOpen: nextOpen }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update quiz availability");
      await Promise.all([refreshSummaryData(), refreshAttemptsData()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update quiz";
      setError(msg);
    } finally {
      setQuizActionLoadingId(null);
    }
  }

  async function handleDeleteQuiz(quizId: number) {
    try {
      setQuizActionLoadingId(quizId);
      const res = await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete quiz");
      await Promise.all([refreshSummaryData(), refreshAttemptsData()]);
      if (lastQuiz?.id === quizId) setLastQuiz(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete quiz";
      setError(msg);
    } finally {
      setQuizActionLoadingId(null);
    }
  }

  async function handleDeleteLessonPlan(lessonPlanId: string) {
    try {
      setLessonActionLoadingId(lessonPlanId);
      const res = await fetch(`/api/lesson-plans/${lessonPlanId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete lesson plan");
      await refreshSummaryData();
      if (lastPlan?.id === lessonPlanId) setLastPlan(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete lesson plan";
      setError(msg);
    } finally {
      setLessonActionLoadingId(null);
    }
  }

  const usageStatus = useMemo(() => {
    if (!data) return "-";
    const plan = (data.subscriptionPlan || "free").toLowerCase();
    if (plan !== "free") return "Unlimited";

    const points = Number(data.freeQuizPoints ?? 0);
    const maxPoints = Number(data.freeQuizPointsMax ?? 100);
    if (points > 0) return `${points} / ${maxPoints} points`;

    const timer = getCountdownTimer(data.freeQuizPointsRechargeAt);
    return timer ? `0 points - recharges in ${timer}` : `Ready to generate`;
  }, [data]);

  const todaySummary = useMemo(() => {
    if (!data) return "-";
    return `${data.todayQuizCount} quizzes - ${data.todayLessonPlanCount} lesson plans`;
  }, [data]);


  async function copyTemplate(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTemplate(text);
      setTimeout(() => setCopiedTemplate(null), 1600);
    } catch {
      setCopiedTemplate(null);
    }
  }

  async function copyShareLink(quizId: number, shareUrl: string) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareQuizId(quizId);
      setTimeout(() => setCopiedShareQuizId(null), 1600);
    } catch {
      setCopiedShareQuizId(null);
    }
  }

  return (
   <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-transparent">
      <Tour steps={dashboardTourSteps} tourId="home-dashboard" />
      <ConfirmActionModal
        open={pendingDeletePlanId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeletePlanId(null);
        }}
        title="Delete lesson plan?"
        description="This will permanently remove the saved lesson plan from the dashboard and lesson-plan history."
        confirmLabel="Delete Lesson Plan"
        loading={lessonActionLoadingId === pendingDeletePlanId}
        onConfirm={async () => {
          const id = pendingDeletePlanId;
          setPendingDeletePlanId(null);
          if (id) await handleDeleteLessonPlan(id);
        }}
      />
      <div
        id="dashboard-hero"
        className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">
              Command Center
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white sm:text-4xl">
              Run today&apos;s teaching workflow.
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-zinc-400 sm:text-base">
              Start new classroom material, resume active assignments, review
              student results, and decide what needs follow-up next.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge className="border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200">
              Plan: {(data?.subscriptionPlan || "free").toUpperCase()}
            </Badge>
            <Button asChild className="h-10 bg-teal-700 text-white hover:bg-teal-800">
              <Link href="/workspace">Open Workspace</Link>
            </Button>
            <Button asChild variant="outline" className="h-10">
              <Link href="/generate-quiz">Create Quiz</Link>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div id="dashboard-stats" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-zinc-400">
              <Brain className="h-4 w-4 text-teal-700 dark:text-teal-300" /> Quizzes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonLoading className="h-9 w-24" />
            ) : (
              <div className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">{data?.quizCount ?? 0}</div>
            )}
            <p className="mt-1 text-xs text-slate-500">Created and saved</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-zinc-400">
              <BookOpen className="h-4 w-4 text-teal-700 dark:text-teal-300" /> Lesson Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonLoading className="h-9 w-24" />
            ) : (
              <div className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">{data?.lessonPlanCount ?? 0}</div>
            )}
            <p className="mt-1 text-xs text-slate-500">Ready for instruction</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-zinc-400">
              <UsersRound className="h-4 w-4 text-teal-700 dark:text-teal-300" /> Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonLoading className="h-9 w-24" />
            ) : (
              <div className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">{data?.classCount ?? 0}</div>
            )}
            <p className="mt-1 text-xs text-slate-500">Active classroom spaces</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-zinc-400">
              <Clock3 className="h-4 w-4 text-teal-700 dark:text-teal-300" /> Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonLoading className="h-6 w-40" />
            ) : (
              <div className="text-base font-semibold text-slate-950 dark:text-white sm:text-lg">{usageStatus}</div>
            )}
            <p className="mt-1 text-xs text-slate-500">Generation capacity</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:gap-6">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Creation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-500">New teaching materials today</p>
            {loading ? (
              <>
                <SkeletonLoading className="h-6 w-56" />
                <SkeletonLoading className="h-4 w-48" />
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-slate-950 dark:text-white">{todaySummary}</p>
                <p className="text-xs text-slate-500">
                  Last activity:{" "}
                  {data?.lastActivityAt
                    ? new Date(data.lastActivityAt).toLocaleString()
                    : "No activity yet"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-base">Generation Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-500">Quiz points and recharge status</p>
            {loading ? (
              <>
                <SkeletonLoading className="h-6 w-28" />
                <SkeletonLoading className="h-4 w-52" />
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-slate-950 dark:text-white">{usageStatus}</p>
                <p className="text-xs text-slate-500">
                  {(data?.subscriptionPlan || "free") === "free"
                    ? "Free quiz generation now uses points that recharge automatically."
                    : "Pro and Premium do not use free-tier point limits."}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-base">Classroom Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-500">Continue where you left off</p>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Assignment</p>
              {loading ? (
                <>
                  <SkeletonLoading className="mt-1 h-4 w-44" />
                  <SkeletonLoading className="mt-1 h-3 w-56" />
                </>
              ) : (
                <>
                  <p className="text-sm font-medium truncate">
                    {data?.latestAssignment ? data.latestAssignment.title : "No assignment yet"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {data?.latestAssignment
                      ? `${data.latestAssignment.class.name} / ${data.latestAssignment.status} / ${new Date(
                          data.latestAssignment.updatedAt,
                        ).toLocaleString()}`
                      : "Assign a quiz to a class to keep the workflow moving"}
                  </p>
                </>
              )}
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href={data?.latestAssignment ? `/assignments/${data.latestAssignment.id}` : "/classes"}>
                Resume Assignment Workflow
              </Link>
            </Button>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Class</p>
              {loading ? (
                <>
                  <SkeletonLoading className="mt-1 h-4 w-44" />
                  <SkeletonLoading className="mt-1 h-3 w-56" />
                </>
              ) : (
                <>
                  <p className="text-sm font-medium truncate">
                    {data?.latestClass ? data.latestClass.name : "No class yet"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {data?.latestClass
                      ? `${[data.latestClass.subject, data.latestClass.gradeLevel, data.latestClass.section]
                          .filter(Boolean)
                          .join(" / ") || "Class profile ready"} / ${new Date(data.latestClass.updatedAt).toLocaleString()}`
                      : "Create a class to anchor the teacher workflow"}
                  </p>
                </>
              )}
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href={data?.latestClass ? `/classes/${data.latestClass.id}` : "/classes"}>
                Resume Latest Class
              </Link>
            </Button>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Quiz</p>
              {loading ? (
                <>
                  <SkeletonLoading className="mt-1 h-4 w-44" />
                  <SkeletonLoading className="mt-1 h-3 w-56" />
                </>
              ) : (
                <>
                  <p className="text-sm font-medium truncate">
                    {lastQuiz ? lastQuiz.title : "No quiz yet"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {lastQuiz
                      ? `${lastQuiz.questionCount} questions - ${new Date(lastQuiz.createdAt).toLocaleString()}`
                      : "Generate your first quiz"}
                  </p>
                </>
              )}
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/generate-quiz">Resume Quiz Workflow</Link>
            </Button>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Lesson Plan</p>
              {loading ? (
                <>
                  <SkeletonLoading className="mt-1 h-4 w-44" />
                  <SkeletonLoading className="mt-1 h-3 w-56" />
                </>
              ) : (
                <>
                  <p className="text-sm font-medium truncate">
                    {lastPlan ? lastPlan.title : "No lesson plan yet"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {lastPlan
                      ? `${lastPlan.subject} - ${new Date(lastPlan.createdAt).toLocaleString()}`
                      : "Generate your first lesson plan"}
                  </p>
                </>
              )}
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/lessonPlan">Resume Lesson Workflow</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-rose-200/80 bg-linear-to-br from-white to-rose-50 shadow-[0_12px_28px_-20px_rgba(244,63,94,0.55)]">
          <CardHeader>
            <CardTitle className="text-base">Overdue Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <>
                <SkeletonLoading className="h-6 w-14" />
                <SkeletonLoading className="h-4 w-44" />
              </>
            ) : (
              <>
                <p className="text-2xl font-semibold">{data?.todayView.overdueCount ?? 0}</p>
                <p className="text-xs text-zinc-500">
                  {data?.overdueAssignments?.[0]
                    ? `${data.overdueAssignments[0].title} in ${data.overdueAssignments[0].class.name}`
                    : "No overdue assignments right now"}
                </p>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href={data?.overdueAssignments?.[0] ? `/assignments/${data.overdueAssignments[0].id}` : "/workspace"}>
                    Review Overdue Work
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-indigo-200/80 bg-linear-to-br from-white to-indigo-50 shadow-[0_12px_28px_-20px_rgba(99,102,241,0.55)]">
          <CardHeader>
            <CardTitle className="text-base">Draft Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <>
                <SkeletonLoading className="h-6 w-14" />
                <SkeletonLoading className="h-4 w-44" />
              </>
            ) : (
              <>
                <p className="text-2xl font-semibold">{data?.todayView.draftCount ?? 0}</p>
                <p className="text-xs text-zinc-500">
                  {data?.draftAssignments?.[0]
                    ? `${data.draftAssignments[0].title} in ${data.draftAssignments[0].class.name}`
                    : "No unfinished draft assignments right now"}
                </p>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href={data?.draftAssignments?.[0] ? `/assignments/${data.draftAssignments[0].id}` : "/workspace"}>
                    Finish Draft
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50 shadow-[0_12px_28px_-20px_rgba(6,182,212,0.55)]">
          <CardHeader>
            <CardTitle className="text-base">Reminders Pending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <>
                <SkeletonLoading className="h-6 w-14" />
                <SkeletonLoading className="h-4 w-44" />
              </>
            ) : (
              <>
                <p className="text-2xl font-semibold">{data?.todayView.reminderNeededCount ?? 0}</p>
                <p className="text-xs text-zinc-500">
                  {data?.reminderNeededAssignments?.[0]
                    ? `${data.reminderNeededAssignments[0].missingCount} missing in ${data.reminderNeededAssignments[0].class.name}`
                    : "No reminder-needed assignments right now"}
                </p>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href={data?.reminderNeededAssignments?.[0] ? `/assignments/${data.reminderNeededAssignments[0].id}` : "/workspace"}>
                    Open Daily Workspace
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card
        id="dashboard-active-classes"
        className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50 shadow-[0_12px_28px_-20px_rgba(6,182,212,0.7)]"
      >
        <CardHeader>
          <CardTitle className="text-base">Active Classes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-lg border border-cyan-100 bg-white/90 px-3 py-2">
                <SkeletonLoading className="h-4 w-44" />
                <SkeletonLoading className="mt-1 h-3 w-36" />
              </div>
            ))
          ) : !data?.activeClasses?.length ? (
            <p className="text-sm text-zinc-500">No active classes yet.</p>
          ) : (
            data.activeClasses.map((classItem) => (
              <div
                key={classItem.id}
                className="flex flex-col gap-2 rounded-xl border border-cyan-100 bg-white/95 px-3 py-3 shadow-[0_6px_16px_-12px_rgba(6,182,212,0.45)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{classItem.name}</p>
                  <Badge variant="secondary">{classItem._count.students} students</Badge>
                  <Badge variant="secondary">{classItem._count.assignments} active assignments</Badge>
                </div>
                <p className="text-xs text-zinc-500">
                  {[classItem.subject, classItem.gradeLevel, classItem.section]
                    .filter(Boolean)
                    .join(" / ") || "Class profile still needs more context"}
                </p>
                <Button asChild size="sm" variant="outline" className="w-fit">
                  <Link href={`/classes/${classItem.id}`}>
                    <UsersRound className="h-4 w-4" />
                    Open Class
                  </Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card
          id="dashboard-recent-quizzes"
          className="border-blue-200/80 bg-linear-to-br from-white to-blue-50 shadow-[0_12px_28px_-20px_rgba(37,99,235,0.85)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800"
        >
          <CardHeader>
            <CardTitle className="text-base">Recent Quizzes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="rounded-lg border border-blue-100 bg-white/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                  <SkeletonLoading className="h-4 w-48" />
                  <SkeletonLoading className="mt-1 h-3 w-36" />
                </div>
              ))
            ) : !data?.recentQuizzes?.length ? (
              <p className="text-sm text-zinc-500">No quizzes yet.</p>
            ) : (
              data.recentQuizzes.map((quiz) => {
                const attemptsForQuiz = studentAttempts.filter((a) => a.quizId === quiz.id);
                const isOpen = quiz.shareSettings?.isOpen ?? true;
                const expiresAt = quiz.shareSettings?.expiresAt
                  ? new Date(quiz.shareSettings.expiresAt).toLocaleString()
                  : null;
                const busy = quizActionLoadingId === quiz.id;
                return (
                  <details
                    key={quiz.id}
                    className="group border border-blue-100 bg-white/95 rounded-xl px-3 py-2 shadow-[0_6px_16px_-12px_rgba(37,99,235,0.55)] dark:border-slate-700 dark:bg-slate-900"
                  >
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{quiz.title}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(quiz.createdAt).toLocaleString()} •{" "}
                          <span className={isOpen ? "text-green-700" : "text-red-600"}>
                            {isOpen ? "Open" : "Closed"}
                          </span>
                          {expiresAt ? ` • Ends: ${expiresAt}` : ""}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Click to view attempts and controls
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-400" />
                        <span className="text-xs text-zinc-500 transition-transform group-open:rotate-180">
                          ▼
                        </span>
                      </div>
                    </summary>
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {quiz.shareUrl && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void copyShareLink(quiz.id, quiz.shareUrl!)}
                            >
                              {copiedShareQuizId === quiz.id ? "Copied Link" : "Copy Share Link"}
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={quiz.shareUrl} target="_blank">
                                Open Student Link
                              </Link>
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void handleToggleQuizOpen(quiz.id, !isOpen)}
                        >
                          {isOpen ? "Close Quiz" : "Reopen Quiz"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => setPendingDeleteQuizId(quiz.id)}
                        >
                          Delete Quiz
                        </Button>
                      </div>
                      <div className="rounded border bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-xs font-semibold text-zinc-600 mb-1">
                          Attempts ({attemptsForQuiz.length})
                        </p>
                        {attemptsForQuiz.length === 0 ? (
                          <p className="text-xs text-zinc-500">No submissions yet.</p>
                        ) : (
                          <div className="space-y-1">
                            {attemptsForQuiz.slice(0, 8).map((attempt) => (
                              <div key={attempt.id} className="text-xs text-zinc-700">
                                {attempt.studentName} ({attempt.studentEmail}) •{" "}
                                {attempt.correctAnswers}/{attempt.totalQuestions} •{" "}
                                {attempt.scorePercent}% •{" "}
                                {new Date(attempt.submittedAt).toLocaleDateString()}{" "}
                                {new Date(attempt.submittedAt).toLocaleTimeString()}
                                {attempt.assignmentTitle ? ` • ${attempt.assignmentTitle}` : ""}
                                {attempt.className ? ` • ${attempt.className}` : ""}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                );
              })
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/generate-quiz">Create New Quiz</Link>
            </Button>
          </CardContent>
        </Card>

        <Card
          id="dashboard-recent-lessons"
          className="border-violet-200/80 bg-linear-to-br from-white to-violet-50 shadow-[0_12px_28px_-20px_rgba(139,92,246,0.85)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800"
        >
          <CardHeader>
            <CardTitle className="text-base">Recent Lesson Plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="rounded-lg border border-violet-100 bg-white/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                  <SkeletonLoading className="h-4 w-48" />
                  <SkeletonLoading className="mt-1 h-3 w-36" />
                </div>
              ))
            ) : !data?.recentPlans?.length ? (
              <p className="text-sm text-zinc-500">No lesson plans yet.</p>
            ) : (
              data.recentPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between border border-violet-100 bg-white/95 rounded-xl px-3 py-2 shadow-[0_6px_16px_-12px_rgba(139,92,246,0.45)] dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{plan.title}</p>
                    <p className="text-xs text-zinc-500">{plan.subject} - {new Date(plan.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPendingDeletePlanId(plan.id)}
                      disabled={lessonActionLoadingId === plan.id}
                    >
                      {lessonActionLoadingId === plan.id ? "Deleting..." : "Delete"}
                    </Button>
                    <Sparkles className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
              ))
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/lessonPlan">Create Lesson Plan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card
        id="dashboard-active-assignments"
        className="border-emerald-200/80 bg-linear-to-br from-white to-emerald-50 shadow-[0_12px_28px_-20px_rgba(16,185,129,0.65)]"
      >
        <CardHeader>
          <CardTitle className="text-base">Active Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-lg border border-emerald-100 bg-white/90 px-3 py-2">
                <SkeletonLoading className="h-4 w-52" />
                <SkeletonLoading className="mt-1 h-3 w-40" />
              </div>
            ))
          ) : !data?.activeAssignments?.length ? (
            <p className="text-sm text-zinc-500">No active assignments yet.</p>
          ) : (
            data.activeAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex flex-col gap-2 rounded-xl border border-emerald-100 bg-white/95 px-3 py-3 shadow-[0_6px_16px_-12px_rgba(16,185,129,0.45)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{assignment.title}</p>
                  <Badge variant="secondary">{assignment.status}</Badge>
                </div>
                <p className="text-xs text-zinc-500">
                  {assignment.class.name}
                  {assignment.quiz?.title ? ` / ${assignment.quiz.title}` : ""}
                </p>
                <p className="text-xs text-zinc-500">
                  {assignment.dueAt
                    ? `Due ${new Date(assignment.dueAt).toLocaleString()}`
                    : assignment.availableFrom
                    ? `Available ${new Date(assignment.availableFrom).toLocaleString()}`
                    : `Created ${new Date(assignment.createdAt).toLocaleDateString()}`}
                  {` / ${assignment._count.attempts} submission${assignment._count.attempts === 1 ? "" : "s"}`}
                </p>
                <Button asChild size="sm" variant="outline" className="w-fit">
                  <Link href={`/assignments/${assignment.id}`}>View Results</Link>
                </Button>
              </div>
            ))
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/classes">Open Class Workflow</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-amber-200/80 bg-linear-to-br from-white to-amber-50 shadow-[0_12px_28px_-20px_rgba(245,158,11,0.65)]">
        <CardHeader>
          <CardTitle className="text-base">Recent Assignment Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-lg border border-amber-100 bg-white/90 px-3 py-2">
                <SkeletonLoading className="h-4 w-48" />
                <SkeletonLoading className="mt-1 h-3 w-36" />
              </div>
            ))
          ) : !data?.recentAssignmentResults?.length ? (
            <p className="text-sm text-zinc-500">No reviewed assignment results yet.</p>
          ) : (
            data.recentAssignmentResults.map((assignment) => (
              <div
                key={assignment.id}
                className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-white/95 px-3 py-3 shadow-[0_6px_16px_-12px_rgba(245,158,11,0.45)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{assignment.title}</p>
                  <Badge variant="secondary">{assignment.averageScore}% avg</Badge>
                </div>
                <p className="text-xs text-zinc-500">
                  {assignment.class.name} / {assignment.submissionCount} of {assignment.studentCount} submitted
                </p>
                <p className="text-xs text-zinc-500">
                  {assignment.missingCount} missing
                  {assignment.dueAt ? ` / Due ${new Date(assignment.dueAt).toLocaleString()}` : ""}
                </p>
                <Button asChild size="sm" variant="outline" className="w-fit">
                  <Link href={`/assignments/${assignment.id}`}>Open Results</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card
        id="dashboard-workflow-activity"
        className="border-slate-200/90 bg-linear-to-br from-white to-slate-50 shadow-[0_12px_28px_-20px_rgba(71,85,105,0.45)]"
      >
        <CardHeader>
          <CardTitle className="text-base">Workflow Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-lg border border-slate-100 bg-white/90 px-3 py-2">
                <SkeletonLoading className="h-4 w-48" />
                <SkeletonLoading className="mt-1 h-3 w-40" />
              </div>
            ))
          ) : !data?.recentWorkflowActivity?.length ? (
            <p className="text-sm text-zinc-500">No recent share or email activity yet.</p>
          ) : (
            data.recentWorkflowActivity.map((item, idx) => (
              <div
                key={`${item.eventType}-${item.createdAt}-${idx}`}
                className="rounded-xl border border-slate-200 bg-white/95 px-3 py-3 shadow-[0_6px_16px_-12px_rgba(71,85,105,0.35)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {item.eventType === "assignment_shared"
                      ? "Assignment link created"
                      : item.eventType === "assignment_roster_emailed"
                      ? "Assignment emailed to roster"
                      : "Reminder sent to missing students"}
                  </p>
                  <Badge
                    className={
                      item.status === "success"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500">
                  {item.className || "Class workflow"} / {new Date(item.createdAt).toLocaleString()}
                  {item.recipientCount !== null ? ` / ${item.recipientCount} recipients` : ""}
                </p>
                {item.error ? <p className="mt-1 text-xs text-rose-600">{item.error}</p> : null}
                {item.assignmentId ? (
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link href={`/assignments/${item.assignmentId}`}>Open Assignment</Link>
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card
        id="dashboard-student-submissions"
        className="border-slate-200/90 bg-linear-to-br from-white to-slate-50 shadow-[0_12px_28px_-20px_rgba(71,85,105,0.55)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800"
      >
        <CardHeader>
          <CardTitle className="text-base">Student Quiz Submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {attemptsLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-lg border border-slate-100 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                <SkeletonLoading className="h-4 w-56" />
                <SkeletonLoading className="mt-1 h-3 w-64" />
              </div>
            ))
          ) : studentAttempts.length === 0 ? (
            <p className="text-sm text-zinc-500">No student submissions yet.</p>
          ) : (
            Object.values(
              studentAttempts.reduce<Record<string, StudentAttemptSummary[]>>((acc, attempt) => {
                const key = `${attempt.quizId}::${attempt.quizTitle}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(attempt);
                return acc;
              }, {})
            )
              .slice(0, 12)
              .map((group) => {
                const first = group[0];
                return (
                  <details
                    key={`${first.quizId}-${first.quizTitle}`}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_6px_16px_-12px_rgba(71,85,105,0.35)]"
                  >
                    <summary className="cursor-pointer list-none">
                      <p className="text-sm font-medium truncate">{first.quizTitle}</p>
                      <p className="text-xs text-zinc-500">
                        {group.length} submission{group.length > 1 ? "s" : ""}
                      </p>
                    </summary>
                    <div className="mt-2 space-y-2">
                      {group.map((attempt) => (
                        <div key={attempt.id} className="rounded border border-slate-100 p-2">
                          <p className="text-xs text-zinc-600">
                            {attempt.studentName} ({attempt.studentEmail}) • {attempt.correctAnswers}/
                            {attempt.totalQuestions} • {attempt.scorePercent}%
                            {attempt.assignmentTitle ? ` • ${attempt.assignmentTitle}` : ""}
                            {attempt.className ? ` • ${attempt.className}` : ""}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Taken: {new Date(attempt.submittedAt).toLocaleDateString()}{" "}
                            {new Date(attempt.submittedAt).toLocaleTimeString()}
                          </p>
                          {!!attempt.details?.length && (
                            <details className="mt-2 rounded bg-slate-50 p-2">
                              <summary className="cursor-pointer text-[11px] font-semibold text-slate-700">
                                View scored answers
                              </summary>
                              <div className="mt-2 space-y-2">
                                {attempt.details.map((detail) => (
                                  <div
                                    key={`${attempt.id}-${detail.questionId}`}
                                    className="rounded border border-slate-200 bg-white p-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-xs font-medium text-zinc-800">{detail.question}</p>
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                          detail.correct
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-rose-100 text-rose-700"
                                        }`}
                                      >
                                        {detail.correct ? "Correct" : "Incorrect"}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-zinc-600">
                                      Student: {formatAttemptAnswer(detail.selected, detail.questionType)}
                                    </p>
                                    <p className="text-[11px] text-zinc-500">
                                      Expected: {formatAttemptAnswer(detail.correctAnswer || "", detail.questionType)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/generate-quiz">Open Quiz Dashboard</Link>
          </Button>
        </CardContent>
      </Card>

      {pendingDeleteQuizId !== null && (
        <div className="fixed left-0 top-0 z-110 h-dvh w-screen bg-black/55 backdrop-blur-[1px]">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl">
              <h3 className="text-lg font-semibold text-zinc-900">Delete Quiz?</h3>
              <p className="mt-2 text-sm text-zinc-600">
                This will permanently delete the quiz and all student attempts.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPendingDeleteQuizId(null)}
                  disabled={quizActionLoadingId === pendingDeleteQuizId}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    const id = pendingDeleteQuizId;
                    setPendingDeleteQuizId(null);
                    if (id !== null) await handleDeleteQuiz(id);
                  }}
                  disabled={quizActionLoadingId === pendingDeleteQuizId}
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card
        id="dashboard-quick-actions"
        className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <CardHeader>
          <CardTitle className="text-base">Start the Next Step</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Button asChild variant="outline">
            <Link href="/classes">Manage Classes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/workspace">Open Workspace</Link>
          </Button>
          <Button asChild className="bg-teal-700 text-white hover:bg-teal-800">
            <Link href="/generate-quiz">Create Quiz</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/lessonPlan">Plan Lesson</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/analytics">Review Results</Link>
          </Button>
        </CardContent>
      </Card>

      <Card
        id="dashboard-templates"
        className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <CardHeader>
          <CardTitle className="text-base">Prompt Starters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Quiz starters</p>
            <div className="max-h-105 overflow-auto premium-scrollbar space-y-2 pr-1">
              {QUIZ_TEMPLATES.map((template, idx) => (
                <div
                  key={template}
                  className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <p className="text-xs font-medium text-teal-700 dark:text-teal-300">Quiz #{idx + 1}</p>
                  <p className="text-sm text-slate-700 dark:text-zinc-300">{template}</p>
                  <Button size="sm" variant="outline" onClick={() => copyTemplate(template)}>
                    {copiedTemplate === template ? "Copied" : "Copy Quiz Prompt"}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Lesson plan starters</p>
            <div className="max-h-105 overflow-auto premium-scrollbar space-y-2 pr-1">
              {LESSON_TEMPLATES.map((template, idx) => {
                const full = `Topic: ${template.topic}\nSubject: ${template.subject}\nGrade: ${template.grade}\nDays: ${template.days}\nMinutes per day: ${template.minutesPerDay}\nObjectives: ${template.objectives}\nConstraints: ${template.constraints}`;
                return (
                  <div
                    key={full}
                    className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <p className="text-xs font-medium text-teal-700 dark:text-teal-300">Lesson #{idx + 1}</p>
                    <p className="text-sm text-slate-700 dark:text-zinc-300"><span className="font-medium">Topic:</span> {template.topic}</p>
                    <p className="text-sm text-slate-700 dark:text-zinc-300"><span className="font-medium">Subject:</span> {template.subject}</p>
                    <p className="text-sm text-slate-700 dark:text-zinc-300"><span className="font-medium">Grade:</span> {template.grade}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyTemplate(template.topic)}>
                        {copiedTemplate === template.topic ? "Copied" : "Copy Topic"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyTemplate(template.subject)}>
                        {copiedTemplate === template.subject ? "Copied" : "Copy Subject"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyTemplate(template.grade)}>
                        {copiedTemplate === template.grade ? "Copied" : "Copy Grade"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyTemplate(full)}>
                        {copiedTemplate === full ? "Copied" : "Copy Full Inputs"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
