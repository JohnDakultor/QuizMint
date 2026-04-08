"use client";

import jsPDF from "jspdf";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CircleAlert,
  Clock3,
  Copy,
  LineChart,
  Mail,
  Save,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { CopySummaryModal } from "@/components/ui/copy-summary-modal";
import { EmailConfirmModal } from "@/components/ui/email-confirm-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SkeletonLoading from "@/components/ui/skeleton-loading";
import Tour from "@/components/ui/tour";
import { assignmentTourSteps } from "../../teacher-workflow-tour-steps";
import { printElementContent } from "@/lib/print-element";

type AttemptDetail = {
  questionId?: number;
  question?: string;
  questionType?: string;
  selected?: string;
  correctAnswer?: string;
  correct?: boolean;
};

type AssignmentResults = {
  premiumInterventionAccess: boolean;
  assignment: {
    id: string;
    title: string;
    instructions: string | null;
    status: string;
    availableFrom: string | null;
    dueAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    class: {
      id: string;
      name: string;
      subject: string | null;
      gradeLevel: string | null;
      section: string | null;
      students: {
        id: string;
        studentName: string;
        studentEmail: string | null;
        studentNumber: string | null;
      }[];
    };
    quiz: {
      id: number;
      title: string;
      questionCount: number;
    } | null;
    lessonPlan: {
      id: string;
      title: string;
      topic: string;
      subject: string;
      grade: string;
      days: number;
      minutesPerDay: number;
    } | null;
  };
  metrics: {
    studentCount: number;
    submissionCount: number;
    missingCount: number;
    averageScore: number;
    completionRate: number;
    rosterEmailCount: number;
  };
  missingStudents: {
    id: string;
    studentName: string;
    studentEmail: string | null;
    studentNumber: string | null;
  }[];
  hardestQuestions: {
    questionId: number;
    question: string;
    attempts: number;
    correct: number;
    successRate: number;
  }[];
  atRiskStudents: {
    studentName: string | null;
    studentEmail: string | null;
    averageScore: number;
    lowScoreCount: number;
    assignmentTitles: string[];
    classNames: string[];
    latestSubmittedAt: string | null;
  }[];
  recurringWeaknesses: {
    label: string;
    missCount: number;
    assignmentTitles: string[];
    classNames: string[];
  }[];
  performanceTrend: {
    id: string;
    label: string;
    averageScore: number;
    completionRate: number;
    submittedAt: string | null;
  }[];
  adaptiveSummary: {
    supportLevel: string;
    focus: string[];
    summary: string;
    recommendation: string;
    groupedSupport: {
      label: string;
      count: number;
      sampleStudents: string[];
    }[];
    difficultyShift: {
      direction: string;
      label: string;
      rationale: string;
    };
    remediationSequence: string[];
  } | null;
  interventionHistory: {
    eventType: string;
    feature: string | null;
    status: string;
    createdAt: string;
    mode: string | null;
    className: string | null;
    assignmentTitle: string | null;
    promptTopic: string | null;
  }[];
  interventionEffectiveness: {
    hasData: boolean;
    summary: string;
    launchedAt: string | null;
    baseline: {
      averageScore: number;
      missingCount: number;
      weakConcepts: string[];
      studentCount: number;
    };
    post: {
      averageScore: number;
      missingCount: number;
      weakConceptCarryoverCount: number;
      measuredAssignmentCount: number;
      assignmentTitles: string[];
    } | null;
    delta: {
      score: number;
      missing: number;
    } | null;
    studentImpact: {
      improvedCount: number;
      stillAtRiskCount: number;
    };
  } | null;
  interventionReview: {
    status: "needs_data" | "effective" | "mixed" | "at_risk";
    headline: string;
    summary: string;
    nextMove: string;
    provenEffective: boolean;
  } | null;
  history: {
    eventType: string;
    feature: string | null;
    status: string;
    createdAt: string;
    recipientCount: number | null;
    mode: string | null;
    requestId: string | null;
    shareUrl: string | null;
    error: string | null;
  }[];
  attempts: {
    id: string;
    studentName: string | null;
    studentEmail: string | null;
    scorePercent: number;
    correctAnswers: number;
    totalQuestions: number;
    submittedAt: string;
    details: AttemptDetail[];
  }[];
};

type ClassOption = {
  id: string;
  name: string;
  subject: string | null;
  gradeLevel: string | null;
  section: string | null;
  archived: boolean;
};

function formatAttemptAnswer(value: string | undefined, questionType?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "No answer";

  if (questionType === "matching") {
    try {
      const parsed = JSON.parse(raw) as { kind?: string; map?: Record<string, string> };
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
    // plain text
  }

  return raw.replace(/\r?\n/g, " ");
}

export default function AssignmentResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assignmentId = String(params?.id || "");
  const [data, setData] = useState<AssignmentResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);
  const [resendingAll, setResendingAll] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(false);
  const [showCopySummaryModal, setShowCopySummaryModal] = useState(false);
  const [showDeleteAssignmentModal, setShowDeleteAssignmentModal] = useState(false);
  const [pendingEmailAction, setPendingEmailAction] = useState<{
    kind: "reminder" | "resend_all";
    title: string;
    description: string;
    confirmLabel: string;
  } | null>(null);
  const interventionSummaryRef = useRef<HTMLDivElement | null>(null);
  const premiumInterventionAccess = Boolean(data?.premiumInterventionAccess);
  const assignmentAdaptiveSummary = data?.adaptiveSummary ?? null;
  const assignmentInterventionEffectiveness = data?.interventionEffectiveness ?? null;
  const assignmentInterventionReview = data?.interventionReview ?? null;
  const assignmentInterventionHistory = data?.interventionHistory ?? [];
  const canShowAssignmentIntervention = Boolean(
    premiumInterventionAccess &&
      adaptiveEnabled &&
      assignmentAdaptiveSummary &&
      assignmentInterventionEffectiveness &&
      assignmentInterventionReview,
  );
  const [form, setForm] = useState({
    title: "",
    instructions: "",
    classId: "",
    availableFrom: "",
    dueAt: "",
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!assignmentId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/assignments/${assignmentId}/results`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || "Failed to load assignment results");
        }
        if (!mounted) return;
        setData(json as AssignmentResults);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load assignment results");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [assignmentId]);

  useEffect(() => {
    let mounted = true;
    async function loadAdaptivePreference() {
      try {
        const res = await fetch("/api/user", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !mounted) return;
        setAdaptiveEnabled(
          Boolean(
            json?.user?.subscriptionPlan === "premium" && json?.user?.adaptiveLearning,
          ),
        );
      } catch {
        if (mounted) setAdaptiveEnabled(false);
      }
    }
    void loadAdaptivePreference();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    setForm({
      title: data.assignment.title || "",
      instructions: data.assignment.instructions || "",
      classId: data.assignment.class.id || "",
      availableFrom: data.assignment.availableFrom
        ? new Date(data.assignment.availableFrom).toISOString().slice(0, 16)
        : "",
      dueAt: data.assignment.dueAt ? new Date(data.assignment.dueAt).toISOString().slice(0, 16) : "",
    });
  }, [data]);

  useEffect(() => {
    let mounted = true;

    async function loadClasses() {
      setLoadingClasses(true);
      try {
        const res = await fetch("/api/classes", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load classes");
        if (!mounted) return;
        setClasses(
          Array.isArray(json?.classes)
            ? (json.classes as ClassOption[]).filter((classItem) => !classItem.archived)
            : [],
        );
      } catch {
        if (!mounted) return;
        setClasses([]);
      } finally {
        if (mounted) setLoadingClasses(false);
      }
    }

    void loadClasses();
    return () => {
      mounted = false;
    };
  }, []);

  const summaryText = useMemo(() => {
    if (
      !data ||
      !data.premiumInterventionAccess ||
      !data.interventionEffectiveness ||
      !data.adaptiveSummary
    ) {
      return "";
    }
    return [
      data.assignment.class.subject,
      data.assignment.class.gradeLevel,
      data.assignment.class.section,
    ]
      .filter(Boolean)
      .join(" / ");
  }, [data]);

  const interventionSummaryText = useMemo(() => {
    if (
      !data ||
      !data.premiumInterventionAccess ||
      !data.interventionEffectiveness ||
      !data.adaptiveSummary
    ) {
      return "";
    }
    const baselineConcepts = data.interventionEffectiveness.baseline.weakConcepts.join("; ");
    const postTitles = data.interventionEffectiveness.post?.assignmentTitles.join("; ") || "No scored follow-up assignment yet";
    return [
      `Assignment Intervention Review`,
      `Assignment: ${data.assignment.title}`,
      `Class: ${data.assignment.class.name}`,
      data.assignment.class.subject ? `Subject: ${data.assignment.class.subject}` : "",
      data.assignment.class.gradeLevel ? `Grade: ${data.assignment.class.gradeLevel}` : "",
      `Average score: ${data.metrics.averageScore}%`,
      `Completion rate: ${data.metrics.completionRate}%`,
      `Missing submissions: ${data.metrics.missingCount}`,
      `Adaptive summary: ${data.adaptiveSummary.summary}`,
      `Recommendation: ${data.adaptiveSummary.recommendation}`,
      `Follow-up impact: ${data.interventionEffectiveness.summary}`,
      baselineConcepts ? `Baseline weak concepts: ${baselineConcepts}` : "",
      `Post-follow-up assignments: ${postTitles}`,
      `Student impact: ${data.interventionEffectiveness.studentImpact.improvedCount} improved, ${data.interventionEffectiveness.studentImpact.stillAtRiskCount} still at risk`,
    ]
      .filter(Boolean)
      .join("\n");
  }, [data]);

  function updateFormField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function downloadAnsweredQuizPdf() {
    if (!data) return;

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (needed = 24) => {
      if (y + needed <= pageHeight - margin) return;
      pdf.addPage();
      y = margin;
    };

    const writeWrapped = (
      label: string,
      value: string,
      fontStyle: "normal" | "bold" = "normal",
      fontSize = 10,
      extraGap = 8,
    ) => {
      const text = label ? `${label}${value}` : value;
      pdf.setFont("helvetica", fontStyle);
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, contentWidth);
      const lineHeight = fontSize + 4;
      ensureSpace(lines.length * lineHeight + extraGap);
      pdf.text(lines, margin, y);
      y += lines.length * lineHeight + extraGap;
    };

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Answered Quiz Export", margin, y);
    y += 28;

    writeWrapped("", `Assignment: ${data.assignment.title}`, "bold", 12, 6);
    writeWrapped("", `Class: ${data.assignment.class.name}`, "normal", 11, 4);
    writeWrapped("", `Submitted students: ${data.attempts.length}`, "normal", 11, 14);

    data.attempts.forEach((attempt, attemptIndex) => {
      ensureSpace(72);
      if (attemptIndex > 0) {
        pdf.addPage();
        y = margin;
      }

      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(margin, y - 10, contentWidth, 72, 10, 10);
      y += 12;
      writeWrapped(
        "",
        `Student: ${attempt.studentName || attempt.studentEmail || "Unnamed student"}`,
        "bold",
        12,
        4,
      );
      writeWrapped("", `Submitted: ${new Date(attempt.submittedAt).toLocaleString()}`, "normal", 10, 4);
      writeWrapped(
        "",
        `Score: ${attempt.scorePercent}% (${attempt.correctAnswers}/${attempt.totalQuestions})`,
        "normal",
        10,
        14,
      );

      if (!attempt.details?.length) {
        writeWrapped("", "No detailed answer data is available for this submission.");
        return;
      }

      attempt.details.forEach((detail, index) => {
        ensureSpace(56);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(margin, y - 12, contentWidth, 66, 10, 10);
        y += 10;
        writeWrapped("", `Question ${index + 1}`, "bold", 11, 4);
        writeWrapped("", detail.question || `Question ${index + 1}`, "normal", 10, 6);
        writeWrapped(
          "Student answer: ",
          formatAttemptAnswer(detail.selected, detail.questionType),
          "normal",
          10,
          4,
        );
        writeWrapped(
          "Expected answer: ",
          formatAttemptAnswer(detail.correctAnswer, detail.questionType),
          "normal",
          10,
          4,
        );
        writeWrapped(
          "Result: ",
          detail.correct ? "Correct" : "Incorrect",
          detail.correct ? "bold" : "normal",
          10,
          14,
        );
      });
    });

    const safeAssignmentTitle = String(data.assignment.title || "assignment")
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 40);
    pdf.save(`${safeAssignmentTitle}_answered_quiz_results.pdf`);
  }

  async function handleCopyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setInfo(successMessage);
      setError(null);
    } catch {
      setError("Failed to copy to clipboard");
    }
  }

  async function handleCopyInterventionSummary() {
    try {
      await navigator.clipboard.writeText(interventionSummaryText);
      setShowCopySummaryModal(true);
      setInfo("Intervention summary copied.");
      setError(null);
    } catch {
      setError("Failed to copy to clipboard");
    }
  }

  const reteachPrompt = useMemo(() => {
    if (!data) return "";
    const hardest = data.hardestQuestions
      .slice(0, 3)
      .map((item) => item.question)
      .filter(Boolean)
      .join("; ");
    const base = [
      `Create a reteach quiz for ${data.assignment.class.name}.`,
      data.assignment.class.subject ? `Subject: ${data.assignment.class.subject}.` : "",
      data.assignment.class.gradeLevel ? `Grade: ${data.assignment.class.gradeLevel}.` : "",
      `Original assignment: ${data.assignment.title}.`,
      `Average score: ${data.metrics.averageScore}%.`,
      hardest ? `Focus on these difficult areas: ${hardest}.` : "",
      "Use clear scaffolding, shorter explanations, and concept-check questions.",
    ]
      .filter(Boolean)
      .join(" ");
    const params = new URLSearchParams({
      prompt: base,
      interventionSourceType: "assignment",
      interventionSourceId: data.assignment.id,
      interventionClassId: data.assignment.class.id,
      interventionClassName: data.assignment.class.name,
      interventionAssignmentTitle: data.assignment.title,
      interventionMode: "reteach_quiz",
    });
    return `/generate-quiz?${params.toString()}`;
  }, [data]);

  const followUpLessonHref = useMemo(() => {
    if (!data) return "";
    const hardest = data.hardestQuestions
      .slice(0, 3)
      .map((item) => item.question)
      .filter(Boolean)
      .join("; ");
    const objectives = hardest
      ? `Reteach and clarify these difficult concepts: ${hardest}`
      : `Reinforce the core ideas from ${data.assignment.title}`;
    const constraints = `Build a follow-up lesson for ${data.assignment.class.name}. Average score was ${data.metrics.averageScore}%. Include remediation practice and a quick exit ticket.`;
    const params = new URLSearchParams({
      topic: `Follow-up: ${data.assignment.title}`,
      subject: data.assignment.class.subject || "",
      grade: data.assignment.class.gradeLevel || "",
      days: "1",
      minutesPerDay: "40",
      objectives,
      constraints,
      interventionSourceType: "assignment",
      interventionSourceId: data.assignment.id,
      interventionClassId: data.assignment.class.id,
      interventionClassName: data.assignment.class.name,
      interventionAssignmentTitle: data.assignment.title,
      interventionMode: "follow_up_lesson",
    });
    return `/lessonPlan?${params.toString()}`;
  }, [data]);

  const lessonPlanQuizHref = useMemo(() => {
    if (!data?.assignment.lessonPlan) return "";
    const plan = data.assignment.lessonPlan;
    const prompt = [
      `Create a quiz based on this lesson plan.`,
      `Lesson title: ${plan.title}.`,
      `Topic: ${plan.topic}.`,
      `Subject: ${plan.subject}.`,
      `Grade: ${plan.grade}.`,
      `Lesson duration: ${plan.days} day(s), ${plan.minutesPerDay} minutes per day.`,
      data.assignment.instructions ? `Teacher notes: ${data.assignment.instructions}.` : "",
      `Make it suitable as a follow-up assessment for ${data.assignment.class.name}.`,
    ]
      .filter(Boolean)
      .join(" ");
    const params = new URLSearchParams({
      prompt,
      interventionSourceType: "assignment",
      interventionSourceId: data.assignment.id,
      interventionClassId: data.assignment.class.id,
      interventionClassName: data.assignment.class.name,
      interventionAssignmentTitle: data.assignment.title,
      interventionMode: "lesson_plan_follow_up_quiz",
    });
    return `/generate-quiz?${params.toString()}`;
  }, [data]);

  const recoveryQuizHref = useMemo(() => {
    if (!data) return "";
    const prompt = [
      `Create an easy recovery mastery-check quiz for ${data.assignment.class.name}.`,
      `Original assignment: ${data.assignment.title}.`,
      `Target missing students and the weakest learners with short questions and immediate feedback.`,
      data.hardestQuestions.length
        ? `Focus on these concepts: ${data.hardestQuestions
            .slice(0, 2)
            .map((item) => item.question)
            .join("; ")}.`
        : "",
      `Keep the difficulty low to medium and help students re-enter the workflow quickly.`,
    ]
      .filter(Boolean)
      .join(" ");
    const params = new URLSearchParams({
      prompt,
      interventionSourceType: "assignment",
      interventionSourceId: data.assignment.id,
      interventionClassId: data.assignment.class.id,
      interventionClassName: data.assignment.class.name,
      interventionAssignmentTitle: data.assignment.title,
      interventionMode: "recovery_bundle_quiz",
    });
    return `/generate-quiz?${params.toString()}`;
  }, [data]);

  const recoveryLessonHref = useMemo(() => {
    if (!data) return "";
    const params = new URLSearchParams({
      topic: `Recovery Review for ${data.assignment.title}`,
      subject: data.assignment.class.subject || "",
      grade: data.assignment.class.gradeLevel || "",
      days: "1",
      minutesPerDay: "30",
      objectives: data.hardestQuestions.length
        ? `Rebuild confidence on these weak concepts: ${data.hardestQuestions
            .slice(0, 2)
            .map((item) => item.question)
            .join("; ")}`
        : `Re-engage students who missed or struggled with ${data.assignment.title}`,
      constraints: "Use short review chunks, low-friction tasks, and a quick mastery check for students returning after missing work.",
      interventionSourceType: "assignment",
      interventionSourceId: data.assignment.id,
      interventionClassId: data.assignment.class.id,
      interventionClassName: data.assignment.class.name,
      interventionAssignmentTitle: data.assignment.title,
      interventionMode: "recovery_bundle_lesson",
    });
    return `/lessonPlan?${params.toString()}`;
  }, [data]);

  async function sendAssignmentEmails(mode: "missing_only" | "all") {
    if (!data) return 0;
    const res = await fetch(`/api/assignments/${data.assignment.id}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || "Failed to send assignment emails");
    }
    return Number(json?.emailedCount || 0);
  }

  async function handleSendReminder() {
    if (!data) return;
    setReminding(true);
    setError(null);
    setInfo(null);

    try {
      const emailedCount = await sendAssignmentEmails("missing_only");
      setInfo(
        `Reminder sent to ${emailedCount} missing student email${
          emailedCount === 1 ? "" : "s"
        }.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reminder emails");
    } finally {
      setReminding(false);
    }
  }

  async function refreshResults() {
    const res = await fetch(`/api/assignments/${assignmentId}/results`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Failed to refresh assignment");
    setData(json as AssignmentResults);
  }

  async function handleSaveAssignment(nextStatus?: string) {
    if (!data) return;
    setSavingAssignment(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch(`/api/assignments/${data.assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: form.classId,
          title: form.title,
          instructions: form.instructions,
          availableFrom: form.availableFrom || null,
          dueAt: form.dueAt || null,
          status: nextStatus,
          closedAt: nextStatus === "closed" ? new Date().toISOString() : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to save assignment");
      await refreshResults();
      setInfo(nextStatus === "closed" ? "Assignment closed." : "Assignment updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save assignment");
    } finally {
      setSavingAssignment(false);
    }
  }

  async function handleReopenAssignment() {
    if (!data) return;
    setSavingAssignment(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch(`/api/assignments/${data.assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: form.classId,
          title: form.title,
          instructions: form.instructions,
          availableFrom: form.availableFrom || null,
          dueAt: form.dueAt || null,
          status: form.availableFrom ? "scheduled" : "open",
          closedAt: null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to reopen assignment");
      await refreshResults();
      setInfo("Assignment reopened.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reopen assignment");
    } finally {
      setSavingAssignment(false);
    }
  }

  async function handleResendAll() {
    if (!data) return;
    setResendingAll(true);
    setError(null);
    setInfo(null);

    try {
      const emailedCount = await sendAssignmentEmails("all");
      await refreshResults();
      setInfo(
        `Assignment emailed to ${emailedCount} roster student email${
          emailedCount === 1 ? "" : "s"
        }.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend assignment emails");
    } finally {
      setResendingAll(false);
    }
  }

  async function handleDeleteAssignment() {
    if (!data) return;
    setDeletingAssignment(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch(`/api/assignments/${data.assignment.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to delete assignment");
      setShowDeleteAssignmentModal(false);
      router.push(`/classes/${data.assignment.class.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete assignment");
    } finally {
      setDeletingAssignment(false);
    }
  }

  async function handleConfirmEmailAction() {
    if (!pendingEmailAction) return;
    if (pendingEmailAction.kind === "reminder") {
      await handleSendReminder();
    } else {
      await handleResendAll();
    }
    setPendingEmailAction(null);
  }

  async function handleDuplicate() {
    if (!data) return;
    setDuplicating(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch(`/api/assignments/${data.assignment.id}/duplicate`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to duplicate assignment");
      const nextId = String(json?.assignment?.id || "");
      if (nextId) {
        router.push(`/assignments/${nextId}`);
        return;
      }
      setInfo("Assignment duplicated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate assignment");
    } finally {
      setDuplicating(false);
    }
  }

  function handlePrintInterventionSummary() {
    if (!printElementContent(interventionSummaryRef.current, "Assignment Intervention Summary")) {
      setError("Failed to open a focused print preview");
    }
  }

  async function handleLaunchBundle(kind: "reteach" | "recovery") {
    if (!data) return;
    const hasRosterEmails = data.metrics.rosterEmailCount > 0 && data.metrics.missingCount > 0;
    const targetQuizHref = kind === "reteach" ? reteachPrompt : recoveryQuizHref;
    const targetLessonHref = kind === "reteach" ? followUpLessonHref : recoveryLessonHref;

    try {
      setError(null);
      setInfo(null);
      if (hasRosterEmails) {
        const emailedCount = await sendAssignmentEmails("missing_only");
        setInfo(
          `${kind === "reteach" ? "Reteach" : "Recovery"} bundle launched. Reminder sent to ${emailedCount} missing student email${
            emailedCount === 1 ? "" : "s"
          }.`,
        );
      } else {
        setInfo(`${kind === "reteach" ? "Reteach" : "Recovery"} bundle launched.`);
      }
      if (targetLessonHref) {
        window.open(targetLessonHref, "_blank", "noopener,noreferrer");
      }
      if (targetQuizHref) {
        router.push(targetQuizHref);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch intervention bundle");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Tour steps={assignmentTourSteps} tourId="assignment-workflow" />
      <CopySummaryModal
        open={showCopySummaryModal}
        onOpenChange={setShowCopySummaryModal}
        title="Assignment summary copied"
      />
      <ConfirmActionModal
        open={showDeleteAssignmentModal}
        onOpenChange={setShowDeleteAssignmentModal}
        title="Delete assignment?"
        description="This removes the assignment from the class workflow. Student attempts stay in the system, but they will no longer be attached to this assignment."
        confirmLabel="Delete Assignment"
        loading={deletingAssignment}
        onConfirm={handleDeleteAssignment}
      />
      <EmailConfirmModal
        open={Boolean(pendingEmailAction)}
        onOpenChange={(open) => {
          if (!open) setPendingEmailAction(null);
        }}
        title={pendingEmailAction?.title || "Send assignment email"}
        description={pendingEmailAction?.description || ""}
        confirmLabel={pendingEmailAction?.confirmLabel || "Send Email"}
        loading={
          pendingEmailAction?.kind === "reminder"
            ? reminding
            : pendingEmailAction?.kind === "resend_all"
            ? resendingAll
            : false
        }
        onConfirm={handleConfirmEmailAction}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link href={`/classes/${data?.assignment.class.id || ""}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Class
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {info && (
        <Alert>
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      )}

      {loading || !data ? (
        <div className="space-y-4">
          <SkeletonLoading className="h-40 w-full rounded-3xl" />
          <SkeletonLoading className="h-64 w-full rounded-3xl" />
          <SkeletonLoading className="h-64 w-full rounded-3xl" />
        </div>
      ) : (
        <>
          <section
            id="assignment-hero"
            className="relative overflow-hidden rounded-3xl border border-indigo-200/50 bg-linear-to-r from-slate-950 via-indigo-900 to-cyan-800 p-6 text-white shadow-[0_20px_55px_-20px_rgba(30,64,175,0.65)]"
          >
            <div className="relative flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border border-white/20 bg-white/15 text-white">
                  {data.assignment.status}
                </Badge>
                <Badge className="border border-white/20 bg-white/15 text-white">
                  {data.assignment.class.name}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">{data.assignment.title}</h1>
              <p className="max-w-3xl text-sm text-blue-100 sm:text-base">
                {summaryText || "Assignment results for this class workflow."}
              </p>
              {data.assignment.instructions ? (
                <p className="max-w-3xl text-sm text-blue-50/85">{data.assignment.instructions}</p>
              ) : null}
            </div>
          </section>

          <div id="assignment-metrics" className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card className="border-indigo-200/80 bg-linear-to-br from-white to-indigo-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{data.metrics.averageScore}%</p>
              </CardContent>
            </Card>
            <Card className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{data.metrics.completionRate}%</p>
                <p className="mt-1 text-xs text-slate-500">
                  {data.metrics.submissionCount} of {data.metrics.studentCount} students
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-200/80 bg-linear-to-br from-white to-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Missing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{data.metrics.missingCount}</p>
                <p className="mt-1 text-xs text-slate-500">Students still missing a submission</p>
              </CardContent>
            </Card>
              <Card className="border-violet-200/80 bg-linear-to-br from-white to-violet-50">
                <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">
                  {data.assignment.quiz ? "Question Set" : "Lesson Plan"}
                </CardTitle>
                </CardHeader>
                <CardContent>
                {data.assignment.quiz ? (
                  <>
                    <p className="text-3xl font-bold text-slate-900">
                      {data.assignment.quiz.questionCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{data.assignment.quiz.title}</p>
                  </>
                ) : data.assignment.lessonPlan ? (
                  <>
                    <p className="text-lg font-bold text-slate-900">{data.assignment.lessonPlan.topic}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {data.assignment.lessonPlan.subject} / {data.assignment.lessonPlan.grade} / {data.assignment.lessonPlan.days} day
                      {data.assignment.lessonPlan.days === 1 ? "" : "s"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">No linked classroom resource</p>
                )}
                </CardContent>
              </Card>
            </div>

          {data.assignment.lessonPlan ? (
            <Card id="assignment-lesson-workflow" className="border-emerald-200/80 bg-linear-to-br from-white to-emerald-50">
              <CardHeader>
                <CardTitle>Lesson Plan Workflow</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 md:flex-row md:flex-wrap">
                <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-slate-600 md:min-w-[280px] md:flex-1">
                  This assignment is a scheduled lesson-plan resource for the class, not a scored student quiz.
                  Use it to keep lesson delivery, planning continuity, and follow-up actions inside the class workflow.
                </div>
                <Button asChild>
                  <Link href={lessonPlanQuizHref}>Generate Quiz From Lesson Plan</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/lessonPlan">Open Lesson Planner</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card id="assignment-operations" className="border-indigo-200/80 bg-linear-to-br from-white to-indigo-50">
            <CardHeader>
              <CardTitle>Assignment Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assignment-title">Assignment Title</Label>
                  <Input
                    id="assignment-title"
                    value={form.title}
                    onChange={(event) => updateFormField("title", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignment-class">Assigned Class</Label>
                  <select
                    id="assignment-class"
                    value={form.classId}
                    onChange={(event) => updateFormField("classId", event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={loadingClasses}
                  >
                    <option value="">Select class</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-instructions">Instructions</Label>
                <Textarea
                  id="assignment-instructions"
                  value={form.instructions}
                  onChange={(event) => updateFormField("instructions", event.target.value)}
                  placeholder="Optional assignment instructions"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assignment-available">Available From</Label>
                  <Input
                    id="assignment-available"
                    type="datetime-local"
                    value={form.availableFrom}
                    onChange={(event) => updateFormField("availableFrom", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignment-due">Due At</Label>
                  <Input
                    id="assignment-due"
                    type="datetime-local"
                    value={form.dueAt}
                    onChange={(event) => updateFormField("dueAt", event.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSaveAssignment()} disabled={savingAssignment}>
                  <Save className="h-4 w-4" />
                  {savingAssignment ? "Saving..." : "Save Changes"}
                </Button>
                {data.assignment.status === "closed" ? (
                  <Button type="button" variant="outline" onClick={() => void handleReopenAssignment()} disabled={savingAssignment}>
                    Reopen Assignment
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => void handleSaveAssignment("closed")} disabled={savingAssignment}>
                    Close Assignment
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => void handleDuplicate()} disabled={duplicating}>
                  <Copy className="h-4 w-4" />
                  {duplicating ? "Duplicating..." : "Duplicate Assignment"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteAssignmentModal(true)}
                  disabled={deletingAssignment}
                >
                  {deletingAssignment ? "Deleting..." : "Delete Assignment"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPendingEmailAction({
                      kind: "resend_all",
                      title: "Resend to all roster emails?",
                      description: `This will resend ${data.assignment.title} to all roster students with saved email addresses.`,
                      confirmLabel: "Resend Emails",
                    })
                  }
                  disabled={resendingAll || data.metrics.rosterEmailCount === 0}
                >
                  <Mail className="h-4 w-4" />
                  {resendingAll ? "Sending..." : "Resend to All Roster Emails"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card id="assignment-followup-actions" className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50">
            <CardHeader>
              <CardTitle>Follow-Up Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:flex-wrap">
              <Button asChild>
                <Link href={reteachPrompt}>Generate Reteach Quiz</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={followUpLessonHref}>Create Follow-Up Lesson Plan</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setPendingEmailAction({
                    kind: "reminder",
                    title: "Send reminder to missing students?",
                    description: `This will email only the students who are still missing ${data.assignment.title}.`,
                    confirmLabel: "Send Reminder",
                  })
                }
                disabled={reminding || data.metrics.missingCount === 0 || data.metrics.rosterEmailCount === 0}
              >
                <Mail className="h-4 w-4" />
                {reminding ? "Sending..." : "Send Reminder to Missing Students"}
              </Button>
            </CardContent>
          </Card>

          {premiumInterventionAccess ? (
          <Card id="assignment-intervention-bundles" className="border-amber-200/80 bg-linear-to-br from-white to-amber-50">
            <CardHeader>
              <CardTitle>Intervention Bundles</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              <button
                type="button"
                onClick={() => void handleLaunchBundle("reteach")}
                className="rounded-2xl border border-amber-200 bg-white p-4 text-left shadow-[0_10px_24px_-18px_rgba(217,119,6,0.35)] transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50"
              >
                <p className="text-sm font-semibold text-slate-900">Launch Reteach Bundle</p>
                <p className="mt-1 text-xs text-slate-500">
                  Sends missing-student reminders, opens a follow-up lesson, and starts a reteach quiz flow.
                </p>
              </button>
              <button
                type="button"
                onClick={() => void handleLaunchBundle("recovery")}
                className="rounded-2xl border border-amber-200 bg-white p-4 text-left shadow-[0_10px_24px_-18px_rgba(217,119,6,0.35)] transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50"
              >
                <p className="text-sm font-semibold text-slate-900">Launch Recovery Bundle</p>
                <p className="mt-1 text-xs text-slate-500">
                  Starts an easier recovery check plus a short review lesson for students who need to catch up.
                </p>
              </button>
            </CardContent>
          </Card>
          ) : (
          <Card
            id="assignment-premium-intervention-lock"
            className="border-amber-200/80 bg-linear-to-br from-white via-amber-50 to-orange-50"
          >
            <CardHeader>
              <CardTitle>Premium Intervention Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Upgrade to Teacher Premium to unlock assignment intervention reviews, adaptive
                follow-up planning, intervention history, and deeper post-assignment support.
              </p>
              <Button asChild>
                <Link href="/subscription">Unlock Premium</Link>
              </Button>
            </CardContent>
          </Card>
          )}

          {canShowAssignmentIntervention ? (
          <Card id="assignment-adaptive-followup" className="border-indigo-200/80 bg-linear-to-br from-white to-indigo-50">
            <CardHeader>
              <CardTitle>Adaptive Follow-Up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-indigo-200 bg-white p-4 text-sm text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">Support level</p>
                  <Badge variant="secondary">
                    {assignmentAdaptiveSummary!.supportLevel.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="mt-2">{assignmentAdaptiveSummary!.summary}</p>
                <p className="mt-2 text-xs text-slate-500">{assignmentAdaptiveSummary!.recommendation}</p>
              </div>
              {!!assignmentAdaptiveSummary!.focus.length && (
                <div className="flex flex-wrap gap-2">
                  {assignmentAdaptiveSummary!.focus.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-indigo-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Difficulty shift
                  </p>
                  <p className="mt-2 font-medium text-slate-900">
                    {assignmentAdaptiveSummary!.difficultyShift.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {assignmentAdaptiveSummary!.difficultyShift.rationale}
                  </p>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Grouped student support
                  </p>
                  <div className="mt-2 space-y-2 text-sm text-slate-600">
                    {assignmentAdaptiveSummary!.groupedSupport.length ? (
                      assignmentAdaptiveSummary!.groupedSupport.map((group) => (
                        <div key={group.label} className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                          <p className="font-medium text-slate-900">
                            {group.label} · {group.count}
                          </p>
                          {!!group.sampleStudents.length && (
                            <p className="mt-1 text-xs text-slate-500">
                              {group.sampleStudents.join(", ")}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">
                        No intervention groups identified yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {!!assignmentAdaptiveSummary!.remediationSequence.length && (
                <div className="rounded-2xl border border-indigo-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Remediation sequence
                  </p>
                  <ol className="mt-3 space-y-2 text-sm text-slate-600">
                    {assignmentAdaptiveSummary!.remediationSequence.map((step, index) => (
                      <li key={`${index}-${step}`} className="flex gap-3">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
          ) : null}

          {canShowAssignmentIntervention ? (
          <Card id="assignment-followup-impact" className="border-emerald-200/80 bg-linear-to-br from-white to-emerald-50">
            <CardHeader>
              <CardTitle>Follow-Up Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{assignmentInterventionReview!.headline}</p>
                  <Badge
                    variant="outline"
                    className={
                      assignmentInterventionReview!.provenEffective
                        ? "border-emerald-300 text-emerald-700"
                        : "border-slate-300 text-slate-600"
                    }
                  >
                    {assignmentInterventionReview!.provenEffective ? "Proven Effective" : assignmentInterventionReview!.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{assignmentInterventionReview!.summary}</p>
                <p className="mt-2 text-xs text-slate-500">{assignmentInterventionReview!.nextMove}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">
                  {assignmentInterventionEffectiveness!.hasData ? "Intervention review" : "Waiting for follow-up evidence"}
                </p>
                <p className="mt-2">{assignmentInterventionEffectiveness!.summary}</p>
                {assignmentInterventionEffectiveness!.launchedAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Tracking from {new Date(assignmentInterventionEffectiveness!.launchedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Baseline</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {assignmentInterventionEffectiveness!.baseline.averageScore}% average
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {assignmentInterventionEffectiveness!.baseline.missingCount} missing submissions
                  </p>
                  {!!assignmentInterventionEffectiveness!.baseline.weakConcepts.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {assignmentInterventionEffectiveness!.baseline.weakConcepts.map((concept) => (
                        <Badge key={concept} variant="secondary">
                          {concept}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Post follow-up</p>
                  {assignmentInterventionEffectiveness!.post ? (
                    <>
                      <p className="mt-2 text-sm text-slate-600">
                        {assignmentInterventionEffectiveness!.post.averageScore}% average across {assignmentInterventionEffectiveness!.post.measuredAssignmentCount} assignment{assignmentInterventionEffectiveness!.post.measuredAssignmentCount === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {assignmentInterventionEffectiveness!.post.missingCount} missing submissions
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Weak concepts still carrying over: {assignmentInterventionEffectiveness!.post.weakConceptCarryoverCount}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No scored follow-up assignment yet.</p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Score delta</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {assignmentInterventionEffectiveness!.delta ? `${assignmentInterventionEffectiveness!.delta.score >= 0 ? "+" : ""}${assignmentInterventionEffectiveness!.delta.score}%` : "--"}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Submission recovery</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {assignmentInterventionEffectiveness!.delta ? `${assignmentInterventionEffectiveness!.delta.missing >= 0 ? "-" : "+"}${Math.abs(assignmentInterventionEffectiveness!.delta.missing)}` : "--"}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Student impact</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {assignmentInterventionEffectiveness!.studentImpact.improvedCount} improved
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {assignmentInterventionEffectiveness!.studentImpact.stillAtRiskCount} still at risk
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          ) : null}

          {canShowAssignmentIntervention ? (
          <div ref={interventionSummaryRef}>
          <Card id="assignment-intervention-summary" className="border-slate-200/80 bg-linear-to-br from-white to-slate-50 print:border-slate-300">
            <CardHeader>
              <CardTitle>Intervention Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm whitespace-pre-line text-slate-600">
                {interventionSummaryText}
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCopyInterventionSummary()}
                >
                  <Copy className="h-4 w-4" />
                  Copy Summary
                </Button>
                <Button type="button" variant="outline" onClick={handlePrintInterventionSummary}>
                  Print Summary
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
          ) : null}

          {canShowAssignmentIntervention ? (
          <Card id="assignment-intervention-history" className="border-violet-200/80 bg-linear-to-br from-white to-violet-50">
            <CardHeader>
              <CardTitle>Intervention History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!assignmentInterventionHistory.length ? (
                <div className="rounded-2xl border border-dashed border-violet-200 bg-white/80 p-4 text-sm text-slate-500">
                  Adaptive follow-up launches from this assignment will appear here once you generate a reteach quiz or follow-up lesson plan.
                </div>
              ) : (
                assignmentInterventionHistory.map((event, index) => (
                  <div key={`${event.createdAt}-${index}`} className="rounded-2xl border border-violet-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{event.mode?.replace(/_/g, " ") || event.eventType}</Badge>
                      <Badge variant="outline">{event.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {event.promptTopic || event.assignmentTitle || "Adaptive follow-up launched"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(event.createdAt).toLocaleString()}
                      {event.className ? ` · ${event.className}` : ""}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Card id="assignment-results" className="border-slate-200/80 bg-linear-to-br from-white to-slate-50">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>{data.assignment.quiz ? "Student Results" : "Lesson Assignment Status"}</CardTitle>
                  {data.assignment.quiz && data.attempts.length > 0 ? (
                    <Button type="button" size="sm" variant="outline" onClick={downloadAnsweredQuizPdf}>
                      Save All as PDF
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.attempts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-center">
                    <p className="font-medium text-slate-900">
                      {data.assignment.quiz ? "No submissions yet" : "No quiz submissions linked"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {data.assignment.quiz
                        ? "Once students submit this assignment, scored results will appear here."
                        : "Lesson-plan assignments are teacher-facing workflow items. Generate a quiz from this lesson plan if you want scored student results."}
                    </p>
                  </div>
                ) : (
                  data.attempts.map((attempt) => (
                    <details
                      key={attempt.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]"
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-slate-900">
                              {attempt.studentName || "Unnamed student"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {attempt.studentEmail || "No email"} / {attempt.correctAnswers}/
                              {attempt.totalQuestions} / {attempt.scorePercent}%
                            </p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {new Date(attempt.submittedAt).toLocaleString()}
                          </p>
                        </div>
                      </summary>
                      {!!attempt.details?.length && (
                        <div className="mt-3 space-y-2">
                          {attempt.details.map((detail, idx) => (
                            <div
                              key={`${attempt.id}-${detail.questionId || idx}`}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-slate-900">
                                  {detail.question || `Question ${idx + 1}`}
                                </p>
                                <Badge
                                  className={
                                    detail.correct
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700"
                                  }
                                >
                                  {detail.correct ? "Correct" : "Incorrect"}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                Student: {formatAttemptAnswer(detail.selected, detail.questionType)}
                              </p>
                              <p className="text-xs text-slate-500">
                                Expected:{" "}
                                {formatAttemptAnswer(detail.correctAnswer, detail.questionType)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </details>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card id="assignment-missing-students" className="border-amber-200/80 bg-linear-to-br from-white to-amber-50">
                <CardHeader>
                  <CardTitle>Missing Students</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.missingStudents.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-emerald-700">
                      Everyone on the roster has submitted.
                    </div>
                  ) : (
                    data.missingStudents.map((student) => (
                      <div
                        key={student.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <p className="font-medium text-slate-900">{student.studentName}</p>
                        <p className="text-xs text-slate-500">
                          {[student.studentEmail, student.studentNumber]
                            .filter(Boolean)
                            .join(" / ") || "No email or student number"}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card id="assignment-hardest-questions" className="border-rose-200/80 bg-linear-to-br from-white to-rose-50">
                <CardHeader>
                  <CardTitle>Hardest Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.hardestQuestions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-500">
                      Hardest-question insights will appear after students submit this assignment.
                    </div>
                  ) : (
                    data.hardestQuestions.map((item) => (
                      <div
                        key={item.questionId}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <p className="text-sm font-medium text-slate-900">{item.question}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Success rate {item.successRate}% / {item.correct} correct out of {item.attempts}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card id="assignment-students-risk" className="border-violet-200/80 bg-linear-to-br from-white to-violet-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-violet-600" />
                    Students At Risk
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!premiumInterventionAccess ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-500">
                      Teacher Premium unlocks cross-assignment risk signals for this class.
                    </div>
                  ) : !data.atRiskStudents.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-500">
                      No repeated low-score pattern stands out yet across this class.
                    </div>
                  ) : (
                    data.atRiskStudents.map((student, idx) => (
                      <div
                        key={`${student.studentEmail || student.studentName || idx}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {student.studentName || student.studentEmail || "Student"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.averageScore}% avg / {student.lowScoreCount} low-score assignment
                          {student.lowScoreCount === 1 ? "" : "s"}
                        </p>
                        <p className="text-xs text-slate-500">{student.assignmentTitles.join(", ")}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card id="assignment-recurring-weaknesses" className="border-sky-200/80 bg-linear-to-br from-white to-sky-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-sky-600" />
                    Recurring Weaknesses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!premiumInterventionAccess ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-500">
                      Teacher Premium unlocks recurring weakness trends across follow-up work.
                    </div>
                  ) : !data.recurringWeaknesses.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-500">
                      Recurring weakness trends will appear after more class submissions accumulate.
                    </div>
                  ) : (
                    data.recurringWeaknesses.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-medium text-slate-900">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.missCount} misses across {item.assignmentTitles.join(", ")}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card id="assignment-performance-trend" className="border-indigo-200/80 bg-linear-to-br from-white to-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-4 w-4 text-indigo-600" />
                    Performance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!premiumInterventionAccess ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-500">
                      Teacher Premium unlocks intervention-focused performance trends.
                    </div>
                  ) : !data.performanceTrend.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-500">
                      Trend data will appear once this class has multiple scored assignments.
                    </div>
                  ) : (
                    data.performanceTrend.map((point) => (
                      <div key={point.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-medium text-slate-900">{point.label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {point.averageScore}% avg / {point.completionRate}% completion
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card id="assignment-teacher-followup" className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50">
                <CardHeader>
                  <CardTitle>Teacher Follow-Up</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-start gap-3 rounded-2xl border border-cyan-200 bg-white p-4">
                    <BarChart3 className="mt-0.5 h-4 w-4 text-cyan-600" />
                    <p>
                      Use hardest questions and missing submissions here to decide whether this
                      class needs a follow-up quiz, reteach lesson, or reminder email.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-cyan-200 bg-white p-4">
                    <UsersRound className="mt-0.5 h-4 w-4 text-cyan-600" />
                    <p>
                      {data.assignment.quiz
                        ? "Missing students are calculated against the class roster, so roster quality now directly improves assignment tracking."
                        : "Lesson-plan assignments keep planning continuity attached to the class even before you generate a follow-up assessment."}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-cyan-200 bg-white p-4">
                    <Clock3 className="mt-0.5 h-4 w-4 text-cyan-600" />
                    <p>
                      Use the action bar above to jump straight into reteach quiz creation,
                      follow-up lesson planning, or reminder emails for missing students.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card id="assignment-activity" className="border-slate-200/80 bg-linear-to-br from-white to-slate-50">
                <CardHeader>
                  <CardTitle>Assignment Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!data.history.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-500">
                      No share or email activity logged yet.
                    </div>
                  ) : (
                    data.history.map((item, idx) => (
                      <div
                        key={`${item.eventType}-${item.createdAt}-${idx}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">
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
                          {item.mode ? (
                            <Badge variant="secondary">{item.mode === "missing_only" ? "missing only" : item.mode}</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleString()}
                          {item.recipientCount !== null ? ` / ${item.recipientCount} recipients` : ""}
                          {item.requestId ? ` / Ref: ${item.requestId}` : ""}
                        </p>
                        {item.error ? (
                          <p className="mt-1 text-xs text-rose-600">{item.error}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.shareUrl ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void handleCopyText(item.shareUrl || "", "Share link copied.")}
                            >
                              <Copy className="h-4 w-4" />
                              Copy Link
                            </Button>
                          ) : null}
                          {item.requestId ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void handleCopyText(item.requestId || "", "Request reference copied.")}
                            >
                              <Copy className="h-4 w-4" />
                              Copy Ref
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {data.metrics.rosterEmailCount === 0 && (
            <Alert>
              <CircleAlert className="h-4 w-4" />
              <AlertDescription>
                This class has no roster emails yet, so missing-student tracking falls back to names
                only. Add roster emails for more reliable assignment completion tracking.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
