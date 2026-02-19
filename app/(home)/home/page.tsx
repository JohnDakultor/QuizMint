"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Brain, Clock3, FileText, Sparkles } from "lucide-react";

type DashboardSummary = {
  subscriptionPlan: string;
  quizUsage: number;
  lastQuizAt: string | null;
  adResetRemaining: number;
  lastActivityAt: string | null;
  quizCount: number;
  lessonPlanCount: number;
  todayQuizCount: number;
  todayLessonPlanCount: number;
  recentQuizzes: { id: number; title: string; createdAt: string }[];
  recentPlans: { id: string; title: string; subject: string; createdAt: string }[];
};

const FREE_QUIZ_LIMIT = 3;
const COOLDOWN_HOURS = 3;
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

function getResetTimer(lastQuizAt: string | null) {
  if (!lastQuizAt) return null;
  const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
  const end = new Date(lastQuizAt).getTime() + cooldownMs;
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
  const [, setTick] = useState(0);

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
        const res = await fetch("/api/dashboard/summary", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load dashboard");
        if (mounted) setData(json);
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to load dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const usageStatus = useMemo(() => {
    if (!data) return "-";
    const plan = (data.subscriptionPlan || "free").toLowerCase();
    if (plan !== "free") return "Unlimited";

    const left = Math.max(FREE_QUIZ_LIMIT - (data.quizUsage || 0), 0);
    if (left > 0) return `${left} / ${FREE_QUIZ_LIMIT} left`;

    const timer = getResetTimer(data.lastQuizAt);
    return timer ? `Locked - resets in ${timer}` : `Ready to generate`;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="rounded-2xl border border-indigo-200/40 bg-linear-to-r from-indigo-900 via-blue-900 to-cyan-800 text-white p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-blue-100 mt-1">Manage lesson planning, quiz creation, and classroom workflow from one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border border-white/20">
              Plan: {(data?.subscriptionPlan || "free").toUpperCase()}
            </Badge>
            <Button asChild className="bg-white text-indigo-900 hover:bg-blue-50">
              <Link href="/generate-quiz">Open Quiz Generator</Link>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-indigo-200 bg-linear-to-brrom-indigo-50 to-blue-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-600" /> Quizzes Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900">{loading ? "-" : data?.quizCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 bg-linear-to-br from-cyan-50 to-sky-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" /> Lesson Plans Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900">{loading ? "-" : data?.lessonPlanCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="border-violet-200 bg-linear-to-br from-violet-50 to-fuchsia-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-indigo-600" /> Usage / Reset Timer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-zinc-900">{loading ? "-" : usageStatus}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-amber-200 bg-linear-to-brrom-amber-50 to-yellow-50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Today Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-zinc-500">Activity today</p>
            <p className="text-xl font-semibold">{loading ? "-" : todaySummary}</p>
            <p className="text-xs text-zinc-500">
              Last activity:{" "}
              {loading
                ? "-"
                : data?.lastActivityAt
                  ? new Date(data.lastActivityAt).toLocaleString()
                  : "No activity yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Usage Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-zinc-500">Free-tier ad unlock remaining</p>
            <p className="text-xl font-semibold">
              {loading ? "-" : (data?.subscriptionPlan || "free") === "free" ? `${data?.adResetRemaining ?? 0} / 5` : "Not applicable"}
            </p>
            <p className="text-xs text-zinc-500">
              {loading
                ? "-"
                : (data?.subscriptionPlan || "free") === "free"
                  ? "Watches available in current window"
                  : "Premium/Pro does not use ad reset"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-pink-200 bg-linear-to-br from-pink-50 to-rose-50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Classroom Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-zinc-500">Continue where you left off</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/generate-quiz">Resume Quiz Workflow</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/lessonPlan">Resume Lesson Workflow</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-blue-200 bg-linear-to-br from-white to-blue-50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Recent Quizzes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data?.recentQuizzes?.length ? (
              <p className="text-sm text-zinc-500">No quizzes yet.</p>
            ) : (
              data.recentQuizzes.map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between border border-blue-100 bg-white/90 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{quiz.title}</p>
                    <p className="text-xs text-zinc-500">{new Date(quiz.createdAt).toLocaleString()}</p>
                  </div>
                  <FileText className="w-4 h-4 text-zinc-400" />
                </div>
              ))
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/generate-quiz">Create New Quiz</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-violet-200 bg-linear-to-br from-white to-violet-50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Recent Lesson Plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data?.recentPlans?.length ? (
              <p className="text-sm text-zinc-500">No lesson plans yet.</p>
            ) : (
              data.recentPlans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between border border-violet-100 bg-white/90 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{plan.title}</p>
                    <p className="text-xs text-zinc-500">{plan.subject} - {new Date(plan.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Sparkles className="w-4 h-4 text-zinc-400" />
                </div>
              ))
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/lessonPlan">Create Lesson Plan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-indigo-200 bg-linear-to-r from-indigo-50 to-cyan-50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Dashboard Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link href="/generate-quiz">Generate Quiz</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/lessonPlan">Generate Lesson Plan</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/account">Manage Account</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-fuchsia-200 bg-linear-to-r from-fuchsia-50 to-pink-50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Quick Templates</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-fuchsia-700">Quiz Generator Samples (10)</p>
            <div className="max-h-105 overflow-auto premium-scrollbar space-y-2 pr-1">
              {QUIZ_TEMPLATES.map((template, idx) => (
                <div key={template} className="border border-fuchsia-200 rounded-lg p-3 bg-white/95 hover:bg-white transition space-y-2">
                  <p className="text-xs font-medium text-fuchsia-700">Quiz #{idx + 1}</p>
                  <p className="text-sm text-zinc-700">{template}</p>
                  <Button size="sm" variant="outline" onClick={() => copyTemplate(template)}>
                    {copiedTemplate === template ? "Copied" : "Copy Quiz Prompt"}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-fuchsia-700">Lesson Plan Samples (10)</p>
            <div className="max-h-105 overflow-auto premium-scrollbar space-y-2 pr-1">
              {LESSON_TEMPLATES.map((template, idx) => {
                const full = `Topic: ${template.topic}\nSubject: ${template.subject}\nGrade: ${template.grade}\nDays: ${template.days}\nMinutes per day: ${template.minutesPerDay}\nObjectives: ${template.objectives}\nConstraints: ${template.constraints}`;
                return (
                  <div key={full} className="border border-fuchsia-200 rounded-lg p-3 bg-white/95 hover:bg-white transition space-y-2">
                    <p className="text-xs font-medium text-fuchsia-700">Lesson #{idx + 1}</p>
                    <p className="text-sm text-zinc-700"><span className="font-medium">Topic:</span> {template.topic}</p>
                    <p className="text-sm text-zinc-700"><span className="font-medium">Subject:</span> {template.subject}</p>
                    <p className="text-sm text-zinc-700"><span className="font-medium">Grade:</span> {template.grade}</p>
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
